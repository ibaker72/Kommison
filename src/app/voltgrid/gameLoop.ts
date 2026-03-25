import {
  GameState,
  Player,
  InputState,
  CapturedRegion,
} from './types';
import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  BORDER_WIDTH,
  PLAYER_SPEED,
  ORB_BASE_SPEED,
  ORB_RADIUS,
  INITIAL_LIVES,
  WIN_PERCENTAGE,
} from './constants';
import type { Orb } from './types';
import {
  isOnBorder,
  directionFromKeys,
  clamp,
  pointInPolygon,
} from './utils';
import {
  orbCollidesWithTrail,
  bounceOrb,
  buildCapturePolygon,
  calculateRevealPercentage,
} from './collision';

// ─── State Initialization ─────────────────────────────────────────

export function createInitialState(): GameState {
  const bw = BORDER_WIDTH;
  return {
    player: {
      x: ARENA_WIDTH / 2,
      y: bw / 2,
      direction: { dx: 0, dy: 0 },
      onBorder: true,
      trail: [],
      lives: INITIAL_LIVES,
    },
    orbs: [createOrb()],
    capturedRegions: [],
    revealPercentage: 0,
    phase: 'playing',
    arenaWidth: ARENA_WIDTH,
    arenaHeight: ARENA_HEIGHT,
  };
}

function createOrb(): Orb {
  const bw = BORDER_WIDTH;
  const angle = Math.random() * Math.PI * 2;
  return {
    x: ARENA_WIDTH / 2 + (Math.random() - 0.5) * 100,
    y: ARENA_HEIGHT / 2 + (Math.random() - 0.5) * 100,
    dx: Math.cos(angle) * ORB_BASE_SPEED,
    dy: Math.sin(angle) * ORB_BASE_SPEED,
    radius: ORB_RADIUS,
  };
}

// ─── Game Update ──────────────────────────────────────────────────

export function updateGame(state: GameState, input: InputState): GameState {
  if (state.phase !== 'playing') return state;

  const newState = { ...state };
  const player = { ...state.player, trail: [...state.player.trail] };
  const orbs = state.orbs.map((o) => ({ ...o }));

  // Get direction from input
  const dir = directionFromKeys(input);

  // Update player position
  updatePlayer(player, dir, state.capturedRegions);

  // Update orbs
  for (const orb of orbs) {
    orb.x += orb.dx;
    orb.y += orb.dy;
    bounceOrb(orb, state.capturedRegions);
  }

  // Check trail collision with orbs
  if (player.trail.length > 1) {
    for (const orb of orbs) {
      if (orbCollidesWithTrail(orb, player.trail)) {
        // Lose a life, reset trail
        player.lives--;
        player.trail = [];
        player.onBorder = true;

        // Reset to border position
        const bw = BORDER_WIDTH;
        player.x = ARENA_WIDTH / 2;
        player.y = bw / 2;
        player.direction = { dx: 0, dy: 0 };

        if (player.lives <= 0) {
          newState.phase = 'lost';
        }
        break;
      }
    }
  }

  // Check if player returned to border and has a trail
  if (player.onBorder && player.trail.length > 2) {
    const polygon = buildCapturePolygon(
      player.trail,
      orbs,
      state.capturedRegions
    );

    if (polygon && polygon.length >= 3) {
      const newRegions = [...state.capturedRegions, { points: polygon }];
      const percentage = calculateRevealPercentage(newRegions);

      newState.capturedRegions = newRegions;
      newState.revealPercentage = percentage;

      if (percentage >= WIN_PERCENTAGE) {
        newState.phase = 'won';
      }
    }

    player.trail = [];
  }

  newState.player = player;
  newState.orbs = orbs;

  return newState;
}

// ─── Player Movement ──────────────────────────────────────────────

function updatePlayer(
  player: Player,
  dir: { dx: number; dy: number },
  capturedRegions: CapturedRegion[]
): void {
  if (dir.dx === 0 && dir.dy === 0) return;

  const bw = BORDER_WIDTH;
  const speed = PLAYER_SPEED;
  const wasOnBorder = player.onBorder;

  let nx = player.x + dir.dx * speed;
  let ny = player.y + dir.dy * speed;

  // Clamp to arena
  nx = clamp(nx, bw / 2, ARENA_WIDTH - bw / 2);
  ny = clamp(ny, bw / 2, ARENA_HEIGHT - bw / 2);

  // Check if on border
  const nowOnBorder = isOnBorder(nx, ny);

  // If on border and trying to move along it
  if (wasOnBorder && nowOnBorder) {
    // Just move along the border
    player.x = nx;
    player.y = ny;
    player.onBorder = true;
    player.direction = dir;
    return;
  }

  // If on border and moving inward — start trail
  if (wasOnBorder && !nowOnBorder) {
    player.trail = [{ x: player.x, y: player.y }];
    player.onBorder = false;
  }

  // If moving in the field
  if (!nowOnBorder) {
    // Don't allow moving into captured regions
    for (const region of capturedRegions) {
      if (pointInPolygon({ x: nx, y: ny }, region.points)) {
        return; // Block movement into captured area
      }
    }

    // Check self-trail collision (don't allow crossing own trail)
    // Simple: just prevent backtracking on trail
    player.x = nx;
    player.y = ny;
    player.onBorder = false;

    // Add to trail (only if moved enough distance from last point)
    const trail = player.trail;
    if (trail.length === 0) {
      trail.push({ x: nx, y: ny });
    } else {
      const last = trail[trail.length - 1];
      const dist = Math.abs(nx - last.x) + Math.abs(ny - last.y);
      if (dist >= 1) {
        trail.push({ x: nx, y: ny });
      }
    }
  } else {
    // Returning to border
    player.x = nx;
    player.y = ny;
    player.onBorder = true;

    // Add final point to trail
    if (player.trail.length > 0) {
      player.trail.push({ x: nx, y: ny });
    }
  }

  player.direction = dir;
}
