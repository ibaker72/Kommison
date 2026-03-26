import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  BORDER_LINE,
  CHASER_SPEED,
  DETACH_PUSH_DISTANCE,
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
  TARGET_REVEAL_PERCENT,
  TRAIL_POINT_SPACING,
} from './constants';
import { applyCapture, bounceOrb, detectBorderEdge, isOnBorder, resolveOrbTrailCollision, snapToBorder } from './collision';
import type { ArenaEdge, GameEvent, GameState, InputState, Particle, StepResult, Vec2 } from './types';
import { cellIndex, clamp, distance, pointOnTrailByDistance, trailLength, worldToCell } from './utils';

const spawnPlayer = (): Vec2 => ({ x: ARENA_WIDTH * 0.5, y: BORDER_LINE });

const randomOrbVelocity = (): Vec2 => {
  const angle = Math.random() * Math.PI * 2;
  return { x: Math.cos(angle) * ORB_SPEED, y: Math.sin(angle) * ORB_SPEED };
};

const axisFromInput = (input: InputState): Vec2 => {
  const x = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const y = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (x === 0 && y === 0) return { x: 0, y: 0 };
  if (Math.abs(x) >= Math.abs(y)) return { x: Math.sign(x), y: 0 };
  return { x: 0, y: Math.sign(y) };
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
    orb: {
      pos: { x: ARENA_WIDTH * 0.5, y: ARENA_HEIGHT * 0.52 },
      vel: randomOrbVelocity(),
      radius: ORB_RADIUS,
    },
    chaser: null,
    captured,
    capturedCount: 0,
    revealPct: 0,
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
  if (!last || distance(last, point) >= TRAIL_POINT_SPACING) {
    trail.push({ x: point.x, y: point.y });
  }
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

const loseLife = (state: GameState): GameState => {
  const lives = state.player.lives - 1;
  const phase = lives <= 0 ? 'lost' : 'playing';
  return {
    ...state,
    phase,
    player: {
      ...state.player,
      pos: spawnPlayer(),
      vel: { x: 0, y: 0 },
      trail: [],
      trailHeading: { x: 0, y: 0 },
      onBorder: true,
      attachedEdge: 'top',
      motionState: 'respawning',
      lives,
      invulnMs: RESPAWN_INVULN_MS,
    },
    chaser: null,
    shakeMs: SHAKE_MS,
  };
};

const isCapturedCell = (captured: Uint8Array, p: Vec2): boolean => {
  const c = worldToCell(p);
  return captured[cellIndex(c.x, c.y)] === 1;
};

const resolveTrailDirection = (inputDir: Vec2, previous: Vec2): Vec2 => {
  if (inputDir.x === 0 && inputDir.y === 0) return previous;
  if (previous.x === 0 && previous.y === 0) return inputDir;
  const isReverse = inputDir.x === -previous.x && inputDir.y === -previous.y;
  return isReverse ? previous : inputDir;
};

export const startGame = (): GameState => ({ ...createInitialState(), phase: 'playing' });

export const stepGame = (prev: GameState, input: InputState, dtMs: number): StepResult => {
  if (prev.phase !== 'playing') {
    return { state: prev, events: [] };
  }

  const events: GameEvent[] = [];
  const dt = Math.min(0.032, dtMs / 1000);
  const inputDir = axisFromInput(input);

  let state: GameState = {
    ...prev,
    player: { ...prev.player, trail: [...prev.player.trail], trailHeading: { ...prev.player.trailHeading } },
    orb: { ...prev.orb, pos: { ...prev.orb.pos }, vel: { ...prev.orb.vel } },
    particles: [...prev.particles],
    shakeMs: Math.max(0, prev.shakeMs - dtMs),
  };

  state.player.invulnMs = Math.max(0, state.player.invulnMs - dtMs);
  if (state.player.motionState === 'respawning' && state.player.invulnMs <= 0) {
    state.player.motionState = 'border-attached';
  }

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

      if (!isCapturedCell(state.captured, next)) {
        state.player.pos = next;
        addTrailPoint(state.player.trail, next);
      }

      if (isOnBorder(state.player.pos)) {
        const snapped = snapToBorder(state.player.pos);
        addTrailPoint(state.player.trail, snapped);
        state.player.motionState = 'capture-resolve';
        state.player.pos = snapped;
        state.player.attachedEdge = detectBorderEdge(snapped);
        state.player.onBorder = true;

        if (state.chaser?.active) events.push('safe-reconnect');

        const capture = applyCapture(state.captured, state.player.trail, state.orb.pos);
        if (capture.capturedDelta > 0) {
          state.captured = capture.next;
          state.capturedCount += capture.capturedDelta;
          state.revealPct = (state.capturedCount / (GRID_COLS * GRID_ROWS)) * 100;
          state.particles.push(...spawnParticles(snapped, 'rgba(91,255,239,1)', 18));
          events.push('capture');
          if (state.revealPct >= TARGET_REVEAL_PERCENT) {
            state.phase = 'won';
            state.statusText = 'Grid secured. Voltage stabilized.';
            events.push('win');
          }
        }

        state.player.trail = [];
        state.player.trailHeading = { x: 0, y: 0 };
        state.player.motionState = state.player.invulnMs > 0 ? 'respawning' : 'border-attached';
        state.chaser = null;
      }
    }
  }

  bounceOrb(state.orb, state.captured, dt);

  if (state.phase === 'playing' && state.player.trail.length > 1) {
    const hit = resolveOrbTrailCollision(state.orb, state.player.trail);
    if (hit && !state.chaser) {
      const initialDist = trailLength(state.player.trail.slice(0, hit.segmentIndex + 1));
      state.chaser = {
        distanceAlong: initialDist,
        pathLength: trailLength(state.player.trail),
        pos: pointOnTrailByDistance(state.player.trail, initialDist),
        active: true,
      };
      state.particles.push(...spawnParticles(state.chaser.pos, 'rgba(255,105,127,1)', 12));
      state.shakeMs = SHAKE_MS;
      events.push('trail-infected');
    }
  }

  if (state.player.invulnMs <= 0 && distance(state.orb.pos, state.player.pos) <= state.orb.radius + PLAYER_HIT_RADIUS) {
    state = loseLife(state);
    events.push('death-hit');
    if (state.phase === 'lost') events.push('game-over');
  }

  if (state.phase === 'playing' && state.chaser?.active) {
    state.chaser.pathLength = trailLength(state.player.trail);
    state.chaser.distanceAlong += CHASER_SPEED * dt;
    state.chaser.pos = pointOnTrailByDistance(state.player.trail, state.chaser.distanceAlong);
    if (state.chaser.distanceAlong >= state.chaser.pathLength - 2) {
      state = loseLife(state);
      events.push('death-hit');
      if (state.phase === 'lost') events.push('game-over');
    }
  }

  state.particles = state.particles
    .map((particle) => ({
      ...particle,
      pos: { x: particle.pos.x + particle.vel.x * dt, y: particle.pos.y + particle.vel.y * dt },
      lifeMs: particle.lifeMs - dtMs,
    }))
    .filter((particle) => particle.lifeMs > 0);

  if (state.phase === 'playing') {
    state.statusText = state.chaser
      ? 'Trail compromised! Reconnect before spark reaches you.'
      : 'Claimed zones are safe. Keep shrinking the live orb sector.';
  }

  return { state, events };
};
