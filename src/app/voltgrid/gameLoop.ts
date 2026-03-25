import {
  GameState,
  Player,
  InputState,
  CapturedRegion,
  TrailChaser,
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
  CHASER_SPEED,
} from './constants';
import {
  isOnBorder,
  directionFromKeys,
  clamp,
  snapToBorder,
  pointInPolygon,
  distance,
} from './utils';
import {
  findOrbTrailHitIndex,
  orbHitsPlayer,
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
    trailChaser: null,
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

// ─── Trail Chaser Logic ──────────────────────────────────────────

/** Interpolate position along the trail at a fractional index */
function getTrailPosition(trail: readonly { x: number; y: number }[], pos: number): { x: number; y: number } {
  if (trail.length === 0) return { x: 0, y: 0 };
  if (pos <= 0) return { x: trail[0].x, y: trail[0].y };
  if (pos >= trail.length - 1) return { x: trail[trail.length - 1].x, y: trail[trail.length - 1].y };

  const i = Math.floor(pos);
  const t = pos - i;
  const a = trail[i];
  const b = trail[i + 1];
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/** Advance chaser along the trail toward the player. Returns updated chaser or null if expired. */
function updateChaser(chaser: TrailChaser, trail: readonly { x: number; y: number }[]): TrailChaser | null {
  if (!chaser.active || trail.length < 2) return null;

  // Move forward along the trail by distance
  let remaining = CHASER_SPEED;
  let pos = chaser.trailPos;

  while (remaining > 0 && pos < trail.length - 1) {
    const i = Math.floor(pos);
    const t = pos - i;
    if (i + 1 >= trail.length) break;

    const a = trail[i];
    const b = trail[i + 1];
    const segLen = distance(a, b);

    if (segLen === 0) {
      pos = i + 1;
      continue;
    }

    const distToEnd = segLen * (1 - t);

    if (remaining >= distToEnd) {
      remaining -= distToEnd;
      pos = i + 1;
    } else {
      pos += (remaining / segLen);
      remaining = 0;
    }
  }

  const worldPos = getTrailPosition(trail, pos);

  return {
    trailPos: pos,
    x: worldPos.x,
    y: worldPos.y,
    active: pos < trail.length - 1,
  };
}

// ─── Game Update ──────────────────────────────────────────────────

export function updateGame(state: GameState, input: InputState): GameState {
  if (state.phase !== 'playing') return state;

  const newState = { ...state };
  const player: Player = { ...state.player, trail: [...state.player.trail] };
  const orbs = state.orbs.map((o) => ({ ...o }));
  let chaser = state.trailChaser ? { ...state.trailChaser } : null;

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

  // ─── Death checks ────────────────────────────────────────────
  let died = selfHit;

  // 1) Direct orb → player collision (instant death)
  if (!died && player.invulnFrames <= 0) {
    for (const orb of orbs) {
      if (orbHitsPlayer(orb, player.x, player.y)) {
        died = true;
        break;
      }
    }
  }

  // 2) Orb touches trail → spawn chaser (NOT instant death)
  if (!died && !chaser && player.invulnFrames <= 0 && player.trail.length > 1) {
    for (const orb of orbs) {
      const hitIdx = findOrbTrailHitIndex(orb, player.trail);
      if (hitIdx >= 0) {
        const worldPos = getTrailPosition(player.trail, hitIdx);
        chaser = {
          trailPos: hitIdx,
          x: worldPos.x,
          y: worldPos.y,
          active: true,
        };
        break;
      }
    }
  }

  // 3) Update existing chaser — move it toward the player
  if (chaser && chaser.active && player.trail.length >= 2) {
    chaser = updateChaser(chaser, player.trail);

    // If chaser reached the end of the trail (the player), it's a kill
    if (chaser && chaser.trailPos >= player.trail.length - 1.5) {
      died = true;
      chaser = null;
    }
  }

  // Handle death
  if (died) {
    player.lives--;
    player.trail = [];
    player.onBorder = true;
    player.x = ARENA_WIDTH / 2;
    player.y = BORDER_WIDTH / 2;
    player.direction = { dx: 0, dy: 0 };
    player.invulnFrames = INVULN_FRAMES;
    chaser = null;

    if (player.lives <= 0) {
      newState.phase = 'lost';
    }
  }

  // Check if player returned to border and has a trail → capture
  if (!died && player.onBorder && player.trail.length > 2) {
    const polygon = buildCapturePolygon(player.trail, orbs);

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
    chaser = null; // Player survived — dismiss chaser
  }

  newState.player = player;
  newState.orbs = orbs;
  newState.trailChaser = chaser;

  return newState;
}

// ─── Player Movement ──────────────────────────────────────────────

function isMovingAwayFromBorder(px: number, py: number, dir: { dx: number; dy: number }): boolean {
  const bw = BORDER_WIDTH;
  const hw = bw / 2;
  // Determine which border edge we're on and if direction moves away from it
  const distLeft = px - hw;
  const distRight = (ARENA_WIDTH - hw) - px;
  const distTop = py - hw;
  const distBottom = (ARENA_HEIGHT - hw) - py;
  const minDist = Math.min(distLeft, distRight, distTop, distBottom);

  if (minDist === distLeft && dir.dx > 0) return true;   // on left, moving right
  if (minDist === distRight && dir.dx < 0) return true;  // on right, moving left
  if (minDist === distTop && dir.dy > 0) return true;    // on top, moving down
  if (minDist === distBottom && dir.dy < 0) return true;  // on bottom, moving up
  return false;
}

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

  nx = clamp(nx, bw / 2, ARENA_WIDTH - bw / 2);
  ny = clamp(ny, bw / 2, ARENA_HEIGHT - bw / 2);

  const nowOnBorder = isOnBorder(nx, ny);

  // When on border and moving along it, stay on border
  // When on border and moving AWAY from it, allow departure into interior
  if (wasOnBorder && nowOnBorder) {
    if (isMovingAwayFromBorder(player.x, player.y, dir)) {
      // Force departure from border — start trail
      const snapped = snapToBorder(player.x, player.y);
      player.trail = [{ x: snapped.x, y: snapped.y }];
      player.onBorder = false;
      // Use trail speed for the interior move
      nx = player.x + dir.dx * PLAYER_SPEED_TRAIL;
      ny = player.y + dir.dy * PLAYER_SPEED_TRAIL;
      nx = clamp(nx, bw / 2, ARENA_WIDTH - bw / 2);
      ny = clamp(ny, bw / 2, ARENA_HEIGHT - bw / 2);
    } else {
      // Moving along the border
      const snapped = snapToBorder(nx, ny);
      player.x = snapped.x;
      player.y = snapped.y;
      player.onBorder = true;
      player.direction = dir;
      return false;
    }
  }

  if (wasOnBorder && !nowOnBorder && player.trail.length === 0) {
    const snapped = snapToBorder(player.x, player.y);
    player.trail = [{ x: snapped.x, y: snapped.y }];
    player.onBorder = false;
  }

  // Interior movement (off border)
  if (!player.onBorder) {
    // Check if entering a captured region — treat as border reconnection
    for (const region of capturedRegions) {
      if (pointInPolygon({ x: nx, y: ny }, region.points)) {
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
        return true;
      }
    }

    player.x = nx;
    player.y = ny;

    // Check if we've returned to border
    if (isOnBorder(nx, ny)) {
      const snapped = snapToBorder(nx, ny);
      player.x = snapped.x;
      player.y = snapped.y;
      player.onBorder = true;
      if (player.trail.length > 0) {
        player.trail.push({ x: snapped.x, y: snapped.y });
      }
    } else {
      player.onBorder = false;
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
    }
  } else {
    // Still on border (wasn't forced off above)
    if (nowOnBorder) {
      const snapped = snapToBorder(nx, ny);
      player.x = snapped.x;
      player.y = snapped.y;
      player.onBorder = true;
      if (player.trail.length > 0) {
        player.trail.push({ x: snapped.x, y: snapped.y });
      }
    }
  }

  player.direction = dir;
  return false;
}
