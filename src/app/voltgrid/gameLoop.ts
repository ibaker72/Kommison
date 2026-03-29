import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  GRID_CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  INITIAL_LIVES,
  ORB_RADIUS,
  ORB_SPEED,
  PLAYER_HIT_RADIUS,
  PLAYER_TRAIL_SPEED,
  RESPAWN_INVULN_MS,
  SHAKE_MS,
  SPARK_RADIUS,
} from './constants';
import { cellCenter, cellIndex, clamp, distance, pointOnTrailByDistance, worldToCell } from './utils';
import { CELL_CLAIMED, CELL_DRAWING, CELL_EMPTY, type GameEvent, type GameState, type InputState, type Orb, type Particle, type Spark, type StepResult, type Vec2 } from './types';

const inBounds = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < GRID_COLS && y < GRID_ROWS;

const spawnPlayer = (): Vec2 => ({ x: Math.floor(GRID_COLS / 2), y: 0 });

const cellDistance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

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

const spawnParticles = (at: Vec2, color: string, count: number): Particle[] => {
  const p: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 180;
    p.push({
      pos: cellCenter(at.x, at.y),
      vel: { x: Math.cos(a) * speed, y: Math.sin(a) * speed },
      lifeMs: 280 + Math.random() * 360,
      maxLifeMs: 280 + Math.random() * 360,
      size: 1.5 + Math.random() * 2,
      color,
    });
  }
  return p;
};

const buildInitialGrid = (): Uint8Array => {
  const grid = new Uint8Array(GRID_COLS * GRID_ROWS);
  for (let x = 0; x < GRID_COLS; x++) {
    grid[cellIndex(x, 0)] = CELL_CLAIMED;
    grid[cellIndex(x, GRID_ROWS - 1)] = CELL_CLAIMED;
  }
  for (let y = 0; y < GRID_ROWS; y++) {
    grid[cellIndex(0, y)] = CELL_CLAIMED;
    grid[cellIndex(GRID_COLS - 1, y)] = CELL_CLAIMED;
  }
  return grid;
};

const buildPerimeter = (grid: Uint8Array): number[] => {
  const perimeter: number[] = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const idx = cellIndex(x, y);
      if (grid[idx] !== CELL_CLAIMED) continue;
      const neighbors = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];
      if (neighbors.some(([nx, ny]) => !inBounds(nx, ny) || grid[cellIndex(nx, ny)] === CELL_EMPTY)) perimeter.push(idx);
    }
  }
  return perimeter;
};

export const createInitialState = (): GameState => {
  const captured = buildInitialGrid();
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
      moveBuffer: 0,
      speed: PLAYER_TRAIL_SPEED / GRID_CELL_SIZE,
    },
    orbs: [
      {
        pos: { x: ARENA_WIDTH * 0.5, y: ARENA_HEIGHT * 0.52 },
        vel: randomOrbVelocity(),
        radius: ORB_RADIUS,
        trail: [],
        speed: ORB_SPEED,
      },
    ],
    sparks: [],
    captured,
    capturedCount: captured.reduce((acc, v) => acc + (v === CELL_CLAIMED ? 1 : 0), 0),
    revealPct: 0,
    score: 0,
    shakeMs: 0,
    particles: [],
    statusText: 'Trace, trap, and dominate the grid.',
    perimeter: buildPerimeter(captured),
    shockwave: null,
    cutClaimedCells: 0,
  };
};

const cloneState = (prev: GameState): GameState => ({
  ...prev,
  player: { ...prev.player, pos: { ...prev.player.pos }, trail: [...prev.player.trail], trailHeading: { ...prev.player.trailHeading } },
  orbs: prev.orbs.map((orb) => ({ ...orb, pos: { ...orb.pos }, vel: { ...orb.vel }, trail: [...orb.trail] })),
  sparks: prev.sparks.map((spark) => ({ ...spark })),
  particles: [...prev.particles],
  captured: new Uint8Array(prev.captured),
  perimeter: [...prev.perimeter],
  shockwave: prev.shockwave ? { ...prev.shockwave, path: [...prev.shockwave.path], pos: { ...prev.shockwave.pos } } : null,
  shakeMs: Math.max(0, prev.shakeMs - 16),
});

const loseLife = (state: GameState): GameState => {
  const lives = state.player.lives - 1;
  for (let i = 0; i < state.captured.length; i++) {
    if (state.captured[i] === CELL_DRAWING) state.captured[i] = CELL_EMPTY;
  }
  return {
    ...state,
    phase: lives <= 0 ? 'lost' : 'playing',
    player: {
      ...state.player,
      lives,
      pos: spawnPlayer(),
      trail: [],
      onBorder: true,
      motionState: 'border-attached',
      invulnMs: RESPAWN_INVULN_MS,
      moveBuffer: 0,
    },
    shakeMs: SHAKE_MS,
    shockwave: null,
    statusText: lives <= 0 ? 'Game Over — reactor collapsed.' : 'Life lost. Re-stabilize the perimeter.',
  };
};

const floodComponent = (grid: Uint8Array, sx: number, sy: number, seen: Uint8Array): number[] => {
  const qx = new Int16Array(GRID_COLS * GRID_ROWS);
  const qy = new Int16Array(GRID_COLS * GRID_ROWS);
  let head = 0;
  let tail = 0;
  const cells: number[] = [];
  qx[tail] = sx;
  qy[tail] = sy;
  tail++;
  seen[cellIndex(sx, sy)] = 1;

  while (head < tail) {
    const x = qx[head];
    const y = qy[head];
    head++;
    cells.push(cellIndex(x, y));

    const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (const [nx, ny] of neighbors) {
      if (!inBounds(nx, ny)) continue;
      const nIdx = cellIndex(nx, ny);
      if (seen[nIdx] || grid[nIdx] !== CELL_EMPTY) continue;
      seen[nIdx] = 1;
      qx[tail] = nx;
      qy[tail] = ny;
      tail++;
    }
  }

  return cells;
};

/**
 * Strict grid flood-fill capture:
 * 1) Treat CLAIMED and DRAWING cells as solid walls.
 * 2) Flood each EMPTY connected component.
 * 3) Capture the smallest EMPTY component and turn DRAWING into CLAIMED.
 */
const resolveCapture = (state: GameState): { trapped: number; capturedCells: number } => {
  const seen = new Uint8Array(GRID_COLS * GRID_ROWS);
  const components: number[][] = [];

  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const idx = cellIndex(x, y);
      if (state.captured[idx] !== CELL_EMPTY || seen[idx]) continue;
      components.push(floodComponent(state.captured, x, y, seen));
    }
  }

  if (components.length === 0) {
    for (let i = 0; i < state.captured.length; i++) if (state.captured[i] === CELL_DRAWING) state.captured[i] = CELL_CLAIMED;
    state.perimeter = buildPerimeter(state.captured);
    return { trapped: 0, capturedCells: 0 };
  }

  let target = components[0];
  for (let i = 1; i < components.length; i++) if (components[i].length < target.length) target = components[i];

  let capturedCells = 0;
  for (const idx of target) {
    if (state.captured[idx] === CELL_EMPTY) {
      state.captured[idx] = CELL_CLAIMED;
      capturedCells++;
    }
  }

  for (let i = 0; i < state.captured.length; i++) {
    if (state.captured[i] === CELL_DRAWING) {
      state.captured[i] = CELL_CLAIMED;
      capturedCells++;
    }
  }

  let trapped = 0;
  state.orbs = state.orbs.filter((orb) => {
    const cell = worldToCell(orb.pos);
    const isTrapped = state.captured[cellIndex(cell.x, cell.y)] === CELL_CLAIMED;
    if (isTrapped) {
      trapped++;
      state.particles.push(...spawnParticles(cell, 'rgba(255,72,225,1)', 60));
      state.score += 5000;
    }
    return !isTrapped;
  });

  state.perimeter = buildPerimeter(state.captured);
  state.capturedCount = state.captured.reduce((acc, v) => acc + (v === CELL_CLAIMED ? 1 : 0), 0);
  state.revealPct = (state.capturedCount / (GRID_COLS * GRID_ROWS)) * 100;
  return { trapped, capturedCells };
};

const spawnOrbInEmptyCenter = (speed: number): Orb => ({
  pos: { x: ARENA_WIDTH * 0.5, y: ARENA_HEIGHT * 0.5 },
  vel: randomOrbVelocity(speed),
  radius: ORB_RADIUS,
  trail: [],
  speed,
});

const updateOrbs = (state: GameState, dt: number): void => {
  state.orbs.forEach((orb) => {
    const next = { x: orb.pos.x + orb.vel.x * dt, y: orb.pos.y + orb.vel.y * dt };
    if (next.x - orb.radius <= 0 || next.x + orb.radius >= ARENA_WIDTH) orb.vel.x *= -1;
    if (next.y - orb.radius <= 0 || next.y + orb.radius >= ARENA_HEIGHT) orb.vel.y *= -1;

    const probe = { x: orb.pos.x + orb.vel.x * dt, y: orb.pos.y + orb.vel.y * dt };
    const probeCell = worldToCell(probe);
    if (state.captured[cellIndex(probeCell.x, probeCell.y)] === CELL_CLAIMED) {
      orb.vel.x *= -1;
      orb.vel.y *= -1;
    }

    orb.pos.x = clamp(orb.pos.x + orb.vel.x * dt, orb.radius, ARENA_WIDTH - orb.radius);
    orb.pos.y = clamp(orb.pos.y + orb.vel.y * dt, orb.radius, ARENA_HEIGHT - orb.radius);
    orb.trail.push({ ...orb.pos });
    if (orb.trail.length > 9) orb.trail.shift();
  });
};

const maybeSpawnShockwave = (state: GameState): boolean => {
  if (state.shockwave || state.player.trail.length < 2) return false;

  for (const orb of state.orbs) {
    const orbCell = worldToCell(orb.pos);
    const idx = cellIndex(orbCell.x, orbCell.y);
    if (state.captured[idx] !== CELL_DRAWING) continue;

    let nearestIdx = 0;
    let nearestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < state.player.trail.length; i++) {
      const d = cellDistance(state.player.trail[i], orbCell);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }

    const path = state.player.trail.slice(nearestIdx);
    if (path.length < 2) continue;
    state.shockwave = {
      active: true,
      path,
      segmentIndex: 0,
      progress: 0,
      speed: 26,
      pos: cellCenter(path[0].x, path[0].y),
    };
    state.statusText = 'Shockwave chasing your trace! Reconnect before it reaches you.';
    return true;
  }

  return false;
};

const updateShockwave = (state: GameState, dt: number): boolean => {
  if (!state.shockwave) return false;

  const wave = state.shockwave;
  wave.progress += wave.speed * dt;
  let dist = wave.progress;

  while (wave.segmentIndex < wave.path.length - 1) {
    const a = wave.path[wave.segmentIndex];
    const b = wave.path[wave.segmentIndex + 1];
    const seg = Math.max(0.0001, cellDistance(a, b));
    if (dist <= seg) {
      const t = dist / seg;
      wave.pos = cellCenter(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
      break;
    }
    dist -= seg;
    wave.progress -= seg;
    wave.segmentIndex++;
  }

  if (wave.segmentIndex >= wave.path.length - 1) return true;

  const playerPx = cellCenter(state.player.pos.x, state.player.pos.y);
  return distance(playerPx, wave.pos) <= PLAYER_HIT_RADIUS;
};

export const startGame = (): GameState => ({ ...createInitialState(), phase: 'playing' });

export const stepGame = (prev: GameState, input: InputState, dtMs: number): StepResult => {
  if (prev.phase !== 'playing') return { state: prev, events: [] };

  const state = cloneState(prev);
  const events: GameEvent[] = [];
  const dt = Math.min(0.032, dtMs / 1000);

  state.player.invulnMs = Math.max(0, state.player.invulnMs - dtMs);
  updateOrbs(state, dt);

  const inputDir = axisFromInput(input);
  state.player.moveBuffer += dt * state.player.speed;

  while (state.player.moveBuffer >= 1) {
    state.player.moveBuffer -= 1;
    if (inputDir.x === 0 && inputDir.y === 0) break;

    const nx = clamp(state.player.pos.x + inputDir.x, 0, GRID_COLS - 1);
    const ny = clamp(state.player.pos.y + inputDir.y, 0, GRID_ROWS - 1);
    const nextIdx = cellIndex(nx, ny);
    const nextCell = state.captured[nextIdx];

    if (state.player.trail.length === 0) {
      if (nextCell === CELL_CLAIMED) {
        state.player.pos = { x: nx, y: ny };
        continue;
      }
      state.player.trail = [{ ...state.player.pos }, { x: nx, y: ny }];
      state.player.pos = { x: nx, y: ny };
      state.captured[nextIdx] = CELL_DRAWING;
      state.player.motionState = 'trail-active';
      state.player.onBorder = false;
      continue;
    }

    if (nextCell === CELL_DRAWING) {
      const lost = loseLife(state);
      events.push('trail-zapped', 'death-hit');
      if (lost.phase === 'lost') events.push('game-over');
      return { state: lost, events, clearPointerInput: true };
    }

    state.player.pos = { x: nx, y: ny };
    if (nextCell === CELL_EMPTY) {
      state.captured[nextIdx] = CELL_DRAWING;
      state.player.trail.push({ x: nx, y: ny });
    } else if (nextCell === CELL_CLAIMED) {
      state.player.trail.push({ x: nx, y: ny });
      const before = state.revealPct;
      const result = resolveCapture(state);
      const pctDelta = Math.max(0, state.revealPct - before);
      const comboMultiplier = 1 + pctDelta * 0.22;
      state.cutClaimedCells = result.capturedCells;
      state.score += Math.round(result.capturedCells * 8 * comboMultiplier + pctDelta * 150);
      if (result.trapped > 0) {
        for (let i = 0; i < result.trapped; i++) state.orbs.push(spawnOrbInEmptyCenter(ORB_SPEED + 22 + state.orbs.length * 8));
      }
      state.player.trail = [];
      state.shockwave = null;
      state.player.motionState = 'border-attached';
      state.player.onBorder = true;
      events.push('capture');
      state.statusText = result.trapped > 0
        ? `Orb trapped x${result.trapped}! Massive bonus charged.`
        : `Captured ${pctDelta.toFixed(1)}% (${result.capturedCells} cells).`;
    }
  }

  maybeSpawnShockwave(state);
  const waveCaughtPlayer = updateShockwave(state, dt);
  if (waveCaughtPlayer) {
    const lost = loseLife(state);
    events.push('death-hit');
    if (lost.phase === 'lost') events.push('game-over');
    return { state: lost, events, clearPointerInput: true };
  }

  const touchedOrb = state.orbs.some((orb) => {
    const p = cellCenter(state.player.pos.x, state.player.pos.y);
    return distance(orb.pos, p) <= orb.radius + PLAYER_HIT_RADIUS;
  });
  if (state.player.invulnMs <= 0 && touchedOrb) {
    const lost = loseLife(state);
    events.push('death-hit');
    if (lost.phase === 'lost') events.push('game-over');
    return { state: lost, events, clearPointerInput: true };
  }

  state.particles = state.particles
    .map((particle) => ({
      ...particle,
      pos: { x: particle.pos.x + particle.vel.x * dt, y: particle.pos.y + particle.vel.y * dt },
      lifeMs: particle.lifeMs - dtMs,
    }))
    .filter((particle) => particle.lifeMs > 0);

  return { state, events };
};

export const buildSparks = (count: number, speed: number): Spark[] =>
  Array.from({ length: count }, (_, idx) => ({
    perimeterPos: idx * 40,
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
    speed,
  }));

export const sparkPosition = (distanceOnPerimeter: number): Vec2 => {
  const len = Math.max(1, GRID_COLS + GRID_ROWS);
  const d = ((distanceOnPerimeter % len) + len) % len;
  if (d < GRID_COLS) return cellCenter(d, 0);
  if (d < GRID_COLS + GRID_ROWS) return cellCenter(GRID_COLS - 1, d - GRID_COLS);
  return cellCenter(0, 0);
};
export const sparkPerimeterLength = GRID_COLS + GRID_ROWS;
export const playerPerimeterDistance = () => 0;

export const shockwavePointByDistance = pointOnTrailByDistance;
