import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  BORDER_THICKNESS,
  CHASER_SPEED,
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
import { applyCapture, bounceOrb, isOnBorder, orbHitsTrail, snapToBorder } from './collision';
import type { GameEvent, GameState, InputState, Particle, StepResult, Vec2 } from './types';
import { clamp, distance, normalize, pointOnTrailByDistance, trailLength } from './utils';

const spawnPlayer = (): Vec2 => ({ x: ARENA_WIDTH * 0.5, y: BORDER_THICKNESS / 2 });

const randomOrbVelocity = (): Vec2 => {
  const angle = Math.random() * Math.PI * 2;
  return { x: Math.cos(angle) * ORB_SPEED, y: Math.sin(angle) * ORB_SPEED };
};

export const createInitialState = (): GameState => {
  const captured = new Uint8Array(GRID_COLS * GRID_ROWS);
  return {
    phase: 'start',
    player: {
      pos: spawnPlayer(),
      vel: { x: 0, y: 0 },
      onBorder: true,
      trail: [],
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

const directionFromInput = (input: InputState): Vec2 => {
  const x = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const y = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  return normalize({ x, y });
};

const movingAwayFromBorder = (pos: Vec2, dir: Vec2): boolean => {
  const snapped = snapToBorder(pos);
  if (Math.abs(snapped.y - BORDER_THICKNESS / 2) < 0.1) return dir.y > 0.3;
  if (Math.abs(snapped.y - (ARENA_HEIGHT - BORDER_THICKNESS / 2)) < 0.1) return dir.y < -0.3;
  if (Math.abs(snapped.x - BORDER_THICKNESS / 2) < 0.1) return dir.x > 0.3;
  return dir.x < -0.3;
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
      onBorder: true,
      lives,
      invulnMs: RESPAWN_INVULN_MS,
    },
    chaser: null,
    shakeMs: SHAKE_MS,
  };
};

export const startGame = (): GameState => ({ ...createInitialState(), phase: 'playing' });

export const stepGame = (prev: GameState, input: InputState, dtMs: number): StepResult => {
  if (prev.phase !== 'playing') {
    return { state: prev, events: [] };
  }

  const events: GameEvent[] = [];
  const dt = Math.min(0.032, dtMs / 1000);
  const dir = directionFromInput(input);

  let state: GameState = {
    ...prev,
    player: { ...prev.player, trail: [...prev.player.trail] },
    orb: { ...prev.orb, pos: { ...prev.orb.pos }, vel: { ...prev.orb.vel } },
    particles: [...prev.particles],
    shakeMs: Math.max(0, prev.shakeMs - dtMs),
  };

  state.player.invulnMs = Math.max(0, state.player.invulnMs - dtMs);

  if (dir.x !== 0 || dir.y !== 0) {
    state.player.heading = Math.atan2(dir.y, dir.x);
    if (state.player.onBorder && movingAwayFromBorder(state.player.pos, dir)) {
      state.player.onBorder = false;
      state.player.trail = [snapToBorder(state.player.pos)];
    }

    const speed = state.player.onBorder ? PLAYER_BORDER_SPEED : PLAYER_TRAIL_SPEED;
    const next = {
      x: clamp(state.player.pos.x + dir.x * speed * dt, BORDER_THICKNESS / 2, ARENA_WIDTH - BORDER_THICKNESS / 2),
      y: clamp(state.player.pos.y + dir.y * speed * dt, BORDER_THICKNESS / 2, ARENA_HEIGHT - BORDER_THICKNESS / 2),
    };

    if (state.player.onBorder) {
      state.player.pos = snapToBorder(next);
    } else {
      state.player.pos = next;
      addTrailPoint(state.player.trail, next);
      if (isOnBorder(next)) {
        const snapped = snapToBorder(next);
        addTrailPoint(state.player.trail, snapped);
        state.player.pos = snapped;
        state.player.onBorder = true;

        if (state.chaser?.active) {
          events.push('safe-reconnect');
        }

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
        state.chaser = null;
      }
    }
  }

  bounceOrb(state.orb, state.captured, dt);

  if (state.player.invulnMs <= 0 && distance(state.orb.pos, state.player.pos) <= state.orb.radius + PLAYER_HIT_RADIUS) {
    state = loseLife(state);
    events.push('death-hit');
    if (state.phase === 'lost') events.push('game-over');
  }

  if (state.phase === 'playing' && state.player.trail.length > 1) {
    if (!state.chaser) {
      const segment = orbHitsTrail(state.orb, state.player.trail);
      if (segment >= 0) {
        const initialDist = trailLength(state.player.trail.slice(0, segment + 1));
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
    } else if (state.chaser.active) {
      state.chaser.pathLength = trailLength(state.player.trail);
      state.chaser.distanceAlong += CHASER_SPEED * dt;
      state.chaser.pos = pointOnTrailByDistance(state.player.trail, state.chaser.distanceAlong);
      if (state.chaser.distanceAlong >= state.chaser.pathLength - 2) {
        state = loseLife(state);
        events.push('death-hit');
        if (state.phase === 'lost') events.push('game-over');
      }
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
    state.statusText = state.chaser ? 'Trail compromised! Reconnect before spark reaches you.' : 'Carve corridors and trap empty sectors.';
  }

  return { state, events };
};
