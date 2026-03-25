import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  BORDER_THICKNESS,
  GRID_CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  TRAIL_HIT_WIDTH,
} from './constants';
import type { Orb, Vec2 } from './types';
import { cellIndex, pointToSegmentDistance, worldToCell } from './utils';

export const isOnBorder = (p: Vec2): boolean =>
  p.x <= BORDER_THICKNESS ||
  p.x >= ARENA_WIDTH - BORDER_THICKNESS ||
  p.y <= BORDER_THICKNESS ||
  p.y >= ARENA_HEIGHT - BORDER_THICKNESS;

export const snapToBorder = (p: Vec2): Vec2 => {
  const left = p.x;
  const right = ARENA_WIDTH - p.x;
  const top = p.y;
  const bottom = ARENA_HEIGHT - p.y;
  const min = Math.min(left, right, top, bottom);
  if (min === top) return { x: p.x, y: BORDER_THICKNESS / 2 };
  if (min === bottom) return { x: p.x, y: ARENA_HEIGHT - BORDER_THICKNESS / 2 };
  if (min === left) return { x: BORDER_THICKNESS / 2, y: p.y };
  return { x: ARENA_WIDTH - BORDER_THICKNESS / 2, y: p.y };
};

export const orbHitsTrail = (orb: Orb, trail: Vec2[]): number => {
  for (let i = 1; i < trail.length; i++) {
    const d = pointToSegmentDistance(orb.pos, trail[i - 1], trail[i]);
    if (d <= orb.radius + TRAIL_HIT_WIDTH) {
      return i - 1;
    }
  }
  return -1;
};

export const buildTrailBlockMask = (trail: Vec2[]): Uint8Array => {
  const mask = new Uint8Array(GRID_COLS * GRID_ROWS);
  if (trail.length < 2) return mask;

  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1];
    const b = trail[i];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(segLen / (GRID_CELL_SIZE * 0.4)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const c = worldToCell({ x, y });
      mask[cellIndex(c.x, c.y)] = 1;
    }
  }
  return mask;
};

export const applyCapture = (captured: Uint8Array, trail: Vec2[], orbPos: Vec2): { next: Uint8Array; capturedDelta: number } => {
  const next = new Uint8Array(captured);
  const trailMask = buildTrailBlockMask(trail);
  const visited = new Uint8Array(GRID_COLS * GRID_ROWS);
  const qx = new Int16Array(GRID_COLS * GRID_ROWS);
  const qy = new Int16Array(GRID_COLS * GRID_ROWS);

  const start = worldToCell(orbPos);
  let head = 0;
  let tail = 0;
  const push = (x: number, y: number): void => {
    qx[tail] = x;
    qy[tail] = y;
    tail++;
  };

  push(start.x, start.y);
  visited[cellIndex(start.x, start.y)] = 1;

  while (head < tail) {
    const x = qx[head];
    const y = qy[head];
    head++;

    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= GRID_COLS || ny >= GRID_ROWS) continue;
      const idx = cellIndex(nx, ny);
      if (visited[idx] || next[idx] || trailMask[idx]) continue;
      visited[idx] = 1;
      push(nx, ny);
    }
  }

  let capturedDelta = 0;
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const idx = cellIndex(x, y);
      if (next[idx] || trailMask[idx]) continue;
      if (!visited[idx]) {
        next[idx] = 1;
        capturedDelta++;
      }
    }
  }

  return { next, capturedDelta };
};

export const bounceOrb = (orb: Orb, captured: Uint8Array, dt: number): void => {
  const nextX = orb.pos.x + orb.vel.x * dt;
  const nextY = orb.pos.y + orb.vel.y * dt;

  const wouldHitBoundsX = nextX - orb.radius <= BORDER_THICKNESS || nextX + orb.radius >= ARENA_WIDTH - BORDER_THICKNESS;
  const wouldHitBoundsY = nextY - orb.radius <= BORDER_THICKNESS || nextY + orb.radius >= ARENA_HEIGHT - BORDER_THICKNESS;

  if (wouldHitBoundsX) orb.vel.x *= -1;
  if (wouldHitBoundsY) orb.vel.y *= -1;

  const cx = worldToCell({ x: nextX, y: orb.pos.y });
  const cy = worldToCell({ x: orb.pos.x, y: nextY });
  if (captured[cellIndex(cx.x, cx.y)]) orb.vel.x *= -1;
  if (captured[cellIndex(cy.x, cy.y)]) orb.vel.y *= -1;

  orb.pos.x += orb.vel.x * dt;
  orb.pos.y += orb.vel.y * dt;
};
