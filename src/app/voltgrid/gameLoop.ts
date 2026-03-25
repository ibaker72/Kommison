import {
  GameState,
  Player,
  InputState,
  CapturedRegion,
} from './types';
import type { Orb } from './types';
import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  BORDER_WIDTH,
  PLAYER_SPEED_BORDER,
  PLAYER_SPEED_TRAIL,
  ORB_BASE_SPEED,
  ORB_RADIUS,
  INITIAL_LIVES,
  WIN_PERCENTAGE,
  INVULN_FRAMES,
} from './constants';
import {
  isOnBorder,
  directionFromKeys,
  clamp,
  snapToBorder,
  pointInPolygon,
} from './utils';
import {
  orbCollidesWithTrail,
  selfTrailCollision,
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
      invulnFrames: 0,
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
  const angle = Math.random() * Math.PI * 2;
  return {
    x: ARENA_WIDTH / 2 + (Math.random() - 0.5) * 100,
    y: ARENA_HEIGHT / 2 + (Math.random() - 0.5) * 80,
    dx: Math.cos(angle) * ORB_BASE_SPEED,
    dy: Math.sin(angle) * ORB_BASE_SPEED,
    radius: ORB_RADIUS,
  };
}

// ─── Game Update ──────────────────────────────────────────────────

export function updateGame(state: GameState, input: InputState): GameState {
  if (state.phase !== 'playing') return state;

  const newState = { ...state };
  const player: Player = { ...state.player, trail: [...state.player.trail] };
  const orbs = state.orbs.map((o) => ({ ...o }));

  // Tick invulnerability
  if (player.invulnFrames > 0) {
    player.invulnFrames--;
  }

  // Get direction from input
  const dir = directionFromKeys(input);

  // Update player position
  const selfHit = updatePlayer(player, dir, state.capturedRegions);

  // Update orbs
  for (const orb of orbs) {
    orb.x += orb.dx;
    orb.y += orb.dy;
    bounceOrb(orb, state.capturedRegions);
  }

  // Check for death: self-trail collision OR orb-trail collision
  let died = selfHit;

  if (!died && player.invulnFrames <= 0 && player.trail.length > 1) {
    for (const orb of orbs) {
      if (orbCollidesWithTrail(orb, player.trail)) {
        died = true;
        break;
      }
    }
  }

  if (died) {
    player.lives--;
    player.trail = [];
    player.onBorder = true;
    player.x = ARENA_WIDTH / 2;
    player.y = BORDER_WIDTH / 2;
    player.direction = { dx: 0, dy: 0 };
    player.invulnFrames = INVULN_FRAMES;

    if (player.lives <= 0) {
      newState.phase = 'lost';
    }
  }

  // Check if player returned to border and has a trail
  if (!died && player.onBorder && player.trail.length > 2) {
    const polygon = buildCapturePolygon(
      player.trail,
      orbs,
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

/** Returns true if the player crossed their own trail (self-hit). */
function updatePlayer(
  player: Player,
  dir: { dx: number; dy: number },
  capturedRegions: CapturedRegion[]
): boolean {
  if (dir.dx === 0 && dir.dy === 0) return false;

  const bw = BORDER_WIDTH;
  const speed = player.onBorder ? PLAYER_SPEED_BORDER : PLAYER_SPEED_TRAIL;
  const wasOnBorder = player.onBorder;

  let nx = player.x + dir.dx * speed;
  let ny = player.y + dir.dy * speed;

  // Clamp to arena
  nx = clamp(nx, bw / 2, ARENA_WIDTH - bw / 2);
  ny = clamp(ny, bw / 2, ARENA_HEIGHT - bw / 2);

  // Check if on border
  const nowOnBorder = isOnBorder(nx, ny);

  // Moving along the border
  if (wasOnBorder && nowOnBorder) {
    // Snap to border edge for clean positioning
    const snapped = snapToBorder(nx, ny);
    player.x = snapped.x;
    player.y = snapped.y;
    player.onBorder = true;
    player.direction = dir;
    return false;
  }

  // Leaving the border — start trail
  if (wasOnBorder && !nowOnBorder) {
    // Snap origin to border for clean polygon start
    const snapped = snapToBorder(player.x, player.y);
    player.trail = [{ x: snapped.x, y: snapped.y }];
    player.onBorder = false;
  }

  // Moving in the field
  if (!nowOnBorder) {
    // Block movement into captured regions
    for (const region of capturedRegions) {
      if (pointInPolygon({ x: nx, y: ny }, region.points)) {
        // Instead of blocking, treat captured edge as a border reconnection
        const snapped = snapToBorder(nx, ny);
        player.x = snapped.x;
        player.y = snapped.y;
        player.onBorder = true;
        if (player.trail.length > 0) {
          player.trail.push({ x: snapped.x, y: snapped.y });
        }
        player.direction = dir;
        return false;
      }
    }

    // Self-trail collision check
    if (player.trail.length > 4) {
      const from = { x: player.x, y: player.y };
      const to = { x: nx, y: ny };
      if (selfTrailCollision(from, to, player.trail, 4)) {
        return true; // Signal death
      }
    }

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
      if (dist >= 2) {
        trail.push({ x: nx, y: ny });
      }
    }
  } else {
    // Returning to border — snap cleanly
    const snapped = snapToBorder(nx, ny);
    player.x = snapped.x;
    player.y = snapped.y;
    player.onBorder = true;

    if (player.trail.length > 0) {
      player.trail.push({ x: snapped.x, y: snapped.y });
    }
  }

  player.direction = dir;
  return false;
}
