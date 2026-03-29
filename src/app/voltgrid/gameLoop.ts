import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  BORDER_LINE,
  DETACH_PUSH_DISTANCE,
  GRID_CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  INITIAL_LIVES,
  ORB_RADIUS,
  ORB_SPEED,
  PLAYER_BORDER_SPEED,
  PLAYER_HIT_RADIUS,
  PLAYER_TRAIL_SPEED,
  RESPAWN_INVULN_MS,
  SHAKE_MS,
  SPARK_RADIUS,
  TRAIL_POINT_SPACING,
} from './constants';
import { applyCapture, bounceOrb, collidesCaptured, detectBorderEdge, ensureOrbInActiveSpace, isOnBorder, resolveOrbTrailCollision, snapToBorder } from './collision';
import type { ArenaEdge, GameEvent, GameState, InputState, Orb, Particle, Spark, StepResult, Vec2 } from './types';
import { clamp, distance, worldToCell } from './utils';

const spawnPlayer = (): Vec2 => ({ x: ARENA_WIDTH * 0.5, y: BORDER_LINE });
const PERIMETER_LENGTH = (ARENA_WIDTH + ARENA_HEIGHT - BORDER_LINE * 2) * 2;

const randomOrbVelocity = (speed = ORB_SPEED): Vec2 => {
  const angle = Math.random() * Math.PI * 2;
  return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
};

const axisFromInput = (input: InputState): Vec2 => {
  const x = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const y = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (x === 0 && y === 0) return { x: 0, y: 0 };
  if (Math.abs(x) >= Math.abs(y)) return { x: Math.sign(x), y: 0 };
  return { x: 0, y: Math.sign(y) };
};

const borderToPerimeterDistance = (p: Vec2): number => {
  if (Math.abs(p.y - BORDER_LINE) < 1) return p.x - BORDER_LINE;
  if (Math.abs(p.x - (ARENA_WIDTH - BORDER_LINE)) < 1) return (ARENA_WIDTH - BORDER_LINE * 2) + (p.y - BORDER_LINE);
  if (Math.abs(p.y - (ARENA_HEIGHT - BORDER_LINE)) < 1) return (ARENA_WIDTH - BORDER_LINE * 2) + (ARENA_HEIGHT - BORDER_LINE * 2) + (ARENA_WIDTH - BORDER_LINE - p.x);
  return (ARENA_WIDTH - BORDER_LINE * 2) * 2 + (ARENA_HEIGHT - BORDER_LINE * 2) + (ARENA_HEIGHT - BORDER_LINE - p.y);
};

const perimeterDistanceToBorder = (distanceOnPerimeter: number): Vec2 => {
  const d = ((distanceOnPerimeter % PERIMETER_LENGTH) + PERIMETER_LENGTH) % PERIMETER_LENGTH;
  const top = ARENA_WIDTH - BORDER_LINE * 2;
  const right = ARENA_HEIGHT - BORDER_LINE * 2;
  const bottom = top;

  if (d <= top) return { x: BORDER_LINE + d, y: BORDER_LINE };
  if (d <= top + right) return { x: ARENA_WIDTH - BORDER_LINE, y: BORDER_LINE + (d - top) };
  if (d <= top + right + bottom) return { x: ARENA_WIDTH - BORDER_LINE - (d - top - right), y: ARENA_HEIGHT - BORDER_LINE };
  return { x: BORDER_LINE, y: ARENA_HEIGHT - BORDER_LINE - (d - top - right - bottom) };
};

export const createInitialState = (): GameState => {
  const captured = new Uint8Array(GRID_COLS * GRID_ROWS);
  return {
    phase: 'start',
    player: {
      pos: spawnPlayer(),
      vel: { x: 0, y: 0 },
      onBorder: true,
      attachedEdge: 'top',
      motionState: 'border-attached',
      trail: [],
      trailHeading: { x: 0, y: 0 },
      lives: INITIAL_LIVES,
      invulnMs: 0,
      heading: 0,
    },
    orbs: [
      {
        pos: { x: ARENA_WIDTH * 0.5, y: ARENA_HEIGHT * 0.52 },
        vel: randomOrbVelocity(),
        radius: ORB_RADIUS,
        trail: [],
      },
    ],
    sparks: [],
    captured,
    capturedCount: 0,
    revealPct: 0,
    score: 0,
    shakeMs: 0,
    particles: [],
    statusText: 'Trace, trap, and dominate the grid.',
  };
};

const getTangentAxis = (edge: ArenaEdge, dir: Vec2): Vec2 => {
  if (edge === 'top' || edge === 'bottom') return { x: dir.x === 0 ? 0 : Math.sign(dir.x), y: 0 };
  return { x: 0, y: dir.y === 0 ? 0 : Math.sign(dir.y) };
};

const getInwardDirection = (edge: ArenaEdge): Vec2 => {
  if (edge === 'top') return { x: 0, y: 1 };
  if (edge === 'bottom') return { x: 0, y: -1 };
  if (edge === 'left') return { x: 1, y: 0 };
  return { x: -1, y: 0 };
};

const hasInwardIntent = (edge: ArenaEdge, dir: Vec2): boolean => {
  const inward = getInwardDirection(edge);
  return inward.x * dir.x + inward.y * dir.y > 0;
};

const addTrailPoint = (trail: Vec2[], point: Vec2): void => {
  const last = trail[trail.length - 1];
  if (!last || distance(last, point) >= TRAIL_POINT_SPACING) trail.push({ x: point.x, y: point.y });
};

const spawnParticles = (at: Vec2, color: string, count: number): Particle[] => {
  const p: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 180;
    p.push({
      pos: { ...at },
      vel: { x: Math.cos(a) * speed, y: Math.sin(a) * speed },
      lifeMs: 280 + Math.random() * 360,
      maxLifeMs: 280 + Math.random() * 360,
      size: 1.5 + Math.random() * 2,
      color,
    });
  }
  return p;
};

const nearestPlayableBorderPoint = (captured: Uint8Array, origin: Vec2): Vec2 => {
  const points: Vec2[] = [];
  for (let x = BORDER_LINE; x <= ARENA_WIDTH - BORDER_LINE; x += GRID_CELL_SIZE) points.push({ x, y: BORDER_LINE }, { x, y: ARENA_HEIGHT - BORDER_LINE });
  for (let y = BORDER_LINE; y <= ARENA_HEIGHT - BORDER_LINE; y += GRID_CELL_SIZE) points.push({ x: BORDER_LINE, y }, { x: ARENA_WIDTH - BORDER_LINE, y });

  let best: Vec2 = spawnPlayer();
  let bestDist = Number.POSITIVE_INFINITY;
  for (const point of points) {
    if (collidesCaptured(captured, point.x, point.y)) continue;
    const d = distance(point, origin);
    if (d < bestDist) {
      bestDist = d;
      best = point;
    }
  }

  return snapToBorder(best);
};

const loseLife = (state: GameState): GameState => {
  const lives = state.player.lives - 1;
  const phase = lives <= 0 ? 'lost' : 'playing';
  const safeSpawn = nearestPlayableBorderPoint(state.captured, spawnPlayer());
  return {
    ...state,
    phase,
    player: {
      ...state.player,
      pos: safeSpawn,
      vel: { x: 0, y: 0 },
      trail: [],
      trailHeading: { x: 0, y: 0 },
      onBorder: true,
      attachedEdge: detectBorderEdge(safeSpawn),
      motionState: 'respawning',
      lives,
      invulnMs: RESPAWN_INVULN_MS,
    },
    shakeMs: SHAKE_MS,
  };
};

const isCapturedCell = (captured: Uint8Array, p: Vec2): boolean => {
  const c = worldToCell(p);
  return captured[c.y * GRID_COLS + c.x] === 1;
};

const resolveTrailDirection = (inputDir: Vec2, previous: Vec2): Vec2 => {
  if (inputDir.x === 0 && inputDir.y === 0) return previous;
  if (previous.x === 0 && previous.y === 0) return inputDir;
  const isReverse = inputDir.x === -previous.x && inputDir.y === -previous.y;
  return isReverse ? previous : inputDir;
};

const advanceSparks = (sparks: Spark[], dt: number): void => {
  sparks.forEach((spark) => {
    spark.perimeterPos += spark.speed * dt * spark.direction;
    spark.perimeterPos = ((spark.perimeterPos % PERIMETER_LENGTH) + PERIMETER_LENGTH) % PERIMETER_LENGTH;
  });
};

const playerHitBySpark = (state: GameState): boolean => {
  if (state.player.invulnMs > 0) return false;
  const onBorder = state.player.onBorder || isOnBorder(state.player.pos);
  if (!onBorder) return false;

  return state.sparks.some((spark) => distance(perimeterDistanceToBorder(spark.perimeterPos), state.player.pos) <= spark.radius + PLAYER_HIT_RADIUS);
};

const finalizeCapture = (state: GameState, events: GameEvent[]): GameState => {
  const snapped = snapToBorder(state.player.pos);
  addTrailPoint(state.player.trail, snapped);

  const capture = applyCapture(state.captured, state.player.trail, state.orbs.map((orb) => orb.pos));
  const delta = capture.capturedDelta;
  const nextRevealPct = ((state.capturedCount + delta) / (GRID_COLS * GRID_ROWS)) * 100;

  const nextState: GameState = {
    ...state,
    captured: capture.next,
    capturedCount: state.capturedCount + delta,
    revealPct: nextRevealPct,
    score: state.score + Math.max(0, Math.round(delta * 2 + nextRevealPct * 4)),
    player: {
      ...state.player,
      pos: snapped,
      attachedEdge: detectBorderEdge(snapped),
      onBorder: true,
      trail: [],
      trailHeading: { x: 0, y: 0 },
      motionState: state.player.invulnMs > 0 ? 'respawning' : 'border-attached',
    },
  };

  const safePlayerPos = nearestPlayableBorderPoint(nextState.captured, snapped);
  nextState.player.pos = safePlayerPos;
  nextState.player.attachedEdge = detectBorderEdge(safePlayerPos);
  nextState.orbs.forEach((orb) => ensureOrbInActiveSpace(orb, nextState.captured));

  if (delta > 0) {
    nextState.particles.push(...spawnParticles(safePlayerPos, 'rgba(91,255,239,1)', 24));
    events.push('capture');
  }

  return nextState;
};

export const startGame = (): GameState => ({ ...createInitialState(), phase: 'playing' });

export const stepGame = (prev: GameState, input: InputState, dtMs: number): StepResult => {
  if (prev.phase !== 'playing') return { state: prev, events: [] };

  const events: GameEvent[] = [];
  const dt = Math.min(0.032, dtMs / 1000);
  const inputDir = axisFromInput(input);

  let state: GameState = {
    ...prev,
    player: { ...prev.player, trail: [...prev.player.trail], trailHeading: { ...prev.player.trailHeading } },
    orbs: prev.orbs.map((orb) => ({ ...orb, pos: { ...orb.pos }, vel: { ...orb.vel }, trail: [...orb.trail] })),
    sparks: prev.sparks.map((spark) => ({ ...spark })),
    particles: [...prev.particles],
    shakeMs: Math.max(0, prev.shakeMs - dtMs),
  };

  state.player.invulnMs = Math.max(0, state.player.invulnMs - dtMs);
  if (state.player.motionState === 'respawning' && state.player.invulnMs <= 0) state.player.motionState = 'border-attached';

  if (inputDir.x !== 0 || inputDir.y !== 0) {
    state.player.heading = Math.atan2(inputDir.y, inputDir.x);

    if (state.player.onBorder) {
      const currentEdge = state.player.attachedEdge ?? detectBorderEdge(state.player.pos);
      const snapped = snapToBorder(state.player.pos);
      state.player.pos = snapped;
      state.player.attachedEdge = detectBorderEdge(snapped);

      if (hasInwardIntent(currentEdge, inputDir)) {
        const inward = getInwardDirection(currentEdge);
        const moveDistance = PLAYER_TRAIL_SPEED * dt + DETACH_PUSH_DISTANCE;
        const detachedPos = {
          x: clamp(snapped.x + inward.x * moveDistance, BORDER_LINE + DETACH_PUSH_DISTANCE, ARENA_WIDTH - BORDER_LINE - DETACH_PUSH_DISTANCE),
          y: clamp(snapped.y + inward.y * moveDistance, BORDER_LINE + DETACH_PUSH_DISTANCE, ARENA_HEIGHT - BORDER_LINE - DETACH_PUSH_DISTANCE),
        };

        if (!isCapturedCell(state.captured, detachedPos)) {
          state.player.onBorder = false;
          state.player.motionState = 'trail-active';
          state.player.trailHeading = inward;
          state.player.trail = [snapped];
          state.player.pos = detachedPos;
          addTrailPoint(state.player.trail, detachedPos);
        }
      } else {
        const tangent = getTangentAxis(currentEdge, inputDir);
        if (tangent.x !== 0 || tangent.y !== 0) {
          const next = {
            x: clamp(snapped.x + tangent.x * PLAYER_BORDER_SPEED * dt, BORDER_LINE, ARENA_WIDTH - BORDER_LINE),
            y: clamp(snapped.y + tangent.y * PLAYER_BORDER_SPEED * dt, BORDER_LINE, ARENA_HEIGHT - BORDER_LINE),
          };
          const snappedNext = snapToBorder(next);
          state.player.pos = snappedNext;
          state.player.attachedEdge = detectBorderEdge(snappedNext);
        }
      }
    } else {
      const trailDir = resolveTrailDirection(inputDir, state.player.trailHeading);
      state.player.trailHeading = trailDir;

      const next = {
        x: clamp(state.player.pos.x + trailDir.x * PLAYER_TRAIL_SPEED * dt, BORDER_LINE, ARENA_WIDTH - BORDER_LINE),
        y: clamp(state.player.pos.y + trailDir.y * PLAYER_TRAIL_SPEED * dt, BORDER_LINE, ARENA_HEIGHT - BORDER_LINE),
      };

      if (!isCapturedCell(state.captured, next) || isOnBorder(next)) {
        state.player.pos = next;
        addTrailPoint(state.player.trail, next);
      }

      if (isOnBorder(state.player.pos)) {
        state.player.motionState = 'capture-resolve';
        state = finalizeCapture(state, events);
      }
    }
  }

  // Enemy update: orbs move in unclaimed space, sparks move only on the perimeter.
  state.orbs.forEach((orb) => {
    bounceOrb(orb, state.captured, dt);
    orb.trail.push({ ...orb.pos });
    if (orb.trail.length > 10) orb.trail.shift();
  });
  advanceSparks(state.sparks, dt);

  // Death rule #2: an orb touching an unfinished draw line instantly kills the player.
  if (state.phase === 'playing' && state.player.trail.length > 1) {
    for (const orb of state.orbs) {
      if (resolveOrbTrailCollision(orb, state.player.trail)) {
        state = loseLife(state);
        events.push('trail-zapped', 'death-hit');
        if (state.phase === 'lost') events.push('game-over');
        return { state, events, clearPointerInput: true };
      }
    }
  }

  let clearPointerInput = false;
  const touchedOrb = state.orbs.some((orb) => distance(orb.pos, state.player.pos) <= orb.radius + PLAYER_HIT_RADIUS);
  if (state.player.invulnMs <= 0 && (touchedOrb || playerHitBySpark(state))) {
    state = loseLife(state);
    events.push('death-hit');
    clearPointerInput = true;
    if (state.phase === 'lost') events.push('game-over');
  }

  if (state.player.motionState === 'capture-resolve' || events.includes('capture')) clearPointerInput = true;

  state.particles = state.particles
    .map((particle) => ({
      ...particle,
      pos: { x: particle.pos.x + particle.vel.x * dt, y: particle.pos.y + particle.vel.y * dt },
      lifeMs: particle.lifeMs - dtMs,
    }))
    .filter((particle) => particle.lifeMs > 0);

  if (state.phase === 'playing') {
    state.statusText = state.player.onBorder
      ? 'Border is safe, but sparks patrol it. Cut inward, capture smaller regions.'
      : 'Drawing active: avoid orbs and reconnect to a claimed border to capture area.';
  }

  return { state, events, clearPointerInput };
};

export const buildSparks = (count: number, speed: number): Spark[] =>
  Array.from({ length: count }, (_, idx) => ({
    perimeterPos: (PERIMETER_LENGTH / Math.max(1, count)) * idx,
    speed,
    radius: SPARK_RADIUS,
    direction: idx % 2 === 0 ? 1 : -1,
  }));

export const buildOrbs = (count: number, speed: number): Orb[] =>
  Array.from({ length: count }, (_, idx) => ({
    pos: {
      x: ARENA_WIDTH * (0.25 + (idx % 4) * 0.17),
      y: ARENA_HEIGHT * (0.3 + (idx % 3) * 0.18),
    },
    vel: randomOrbVelocity(speed),
    radius: ORB_RADIUS,
    trail: [],
  }));

export const sparkPosition = perimeterDistanceToBorder;
export const sparkPerimeterLength = PERIMETER_LENGTH;
export const playerPerimeterDistance = borderToPerimeterDistance;
