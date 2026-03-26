import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  BORDER_LINE,
  BORDER_REATTACH_EPSILON,
  BORDER_THICKNESS,
  GRID_CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  TRAIL_HIT_WIDTH,
} from './constants';
import type { ArenaEdge, Orb, TrailCollision, Vec2 } from './types';
import { cellIndex, clamp, distance, nearestPointOnSegment, normalize, reflect, worldToCell } from './utils';

export const isOnBorder = (p: Vec2): boolean =>
  p.x <= BORDER_LINE + BORDER_REATTACH_EPSILON ||
  p.x >= ARENA_WIDTH - BORDER_LINE - BORDER_REATTACH_EPSILON ||
  p.y <= BORDER_LINE + BORDER_REATTACH_EPSILON ||
  p.y >= ARENA_HEIGHT - BORDER_LINE - BORDER_REATTACH_EPSILON;

export const detectBorderEdge = (p: Vec2): ArenaEdge => {
  const distances: Record<ArenaEdge, number> = {
    top: Math.abs(p.y - BORDER_LINE),
    right: Math.abs(p.x - (ARENA_WIDTH - BORDER_LINE)),
    bottom: Math.abs(p.y - (ARENA_HEIGHT - BORDER_LINE)),
    left: Math.abs(p.x - BORDER_LINE),
  };

  let best: ArenaEdge = 'top';
  let min = distances.top;
  (['right', 'bottom', 'left'] as ArenaEdge[]).forEach((edge) => {
    if (distances[edge] < min) {
      best = edge;
      min = distances[edge];
    }
  });
  return best;
};

export const snapToBorder = (p: Vec2): Vec2 => {
  const left = Math.abs(p.x - BORDER_LINE);
  const right = Math.abs(p.x - (ARENA_WIDTH - BORDER_LINE));
  const top = Math.abs(p.y - BORDER_LINE);
  const bottom = Math.abs(p.y - (ARENA_HEIGHT - BORDER_LINE));
  const min = Math.min(left, right, top, bottom);
  if (min === top) return { x: p.x, y: BORDER_LINE };
  if (min === bottom) return { x: p.x, y: ARENA_HEIGHT - BORDER_LINE };
  if (min === left) return { x: BORDER_LINE, y: p.y };
  return { x: ARENA_WIDTH - BORDER_LINE, y: p.y };
};

export const resolveOrbTrailCollision = (orb: Orb, trail: Vec2[]): TrailCollision | null => {
  if (trail.length < 2) return null;

  const hitDistance = orb.radius + TRAIL_HIT_WIDTH;
  let best: TrailCollision | null = null;

  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1];
    const b = trail[i];
    const nearest = nearestPointOnSegment(orb.pos, a, b);
    const d = distance(orb.pos, nearest.point);
    if (d > hitDistance) continue;

    let normal = normalize({ x: orb.pos.x - nearest.point.x, y: orb.pos.y - nearest.point.y });
    if (Math.abs(normal.x) < 0.001 && Math.abs(normal.y) < 0.001) {
      const seg = normalize({ x: b.x - a.x, y: b.y - a.y });
      normal = Math.abs(seg.x) > Math.abs(seg.y) ? { x: 0, y: orb.vel.y >= 0 ? -1 : 1 } : { x: orb.vel.x >= 0 ? -1 : 1, y: 0 };
    }

    if (!best || d < distance(orb.pos, best.point)) {
      best = { segmentIndex: i - 1, point: nearest.point, normal };
    }
  }

  if (!best) return null;

  orb.vel = reflect(orb.vel, best.normal);
  const pushOut = hitDistance + 0.5;
  orb.pos = {
    x: best.point.x + best.normal.x * pushOut,
    y: best.point.y + best.normal.y * pushOut,
  };

  return best;
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

  let capturedDelta = 0;
  for (let i = 0; i < trailMask.length; i++) {
    if (trailMask[i] && !next[i]) {
      next[i] = 1;
      capturedDelta++;
    }
  }

  const start = worldToCell(orbPos);
  const startIdx = cellIndex(start.x, start.y);
  if (next[startIdx]) {
    return { next, capturedDelta };
  }

  let head = 0;
  let tail = 0;
  const push = (x: number, y: number): void => {
    qx[tail] = x;
    qy[tail] = y;
    tail++;
  };

  push(start.x, start.y);
  visited[startIdx] = 1;

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
      if (visited[idx] || next[idx]) continue;
      visited[idx] = 1;
      push(nx, ny);
    }
  }

  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const idx = cellIndex(x, y);
      if (next[idx]) continue;
      if (!visited[idx]) {
        next[idx] = 1;
        capturedDelta++;
      }
    }
  }

  return { next, capturedDelta };
};

export const collidesCaptured = (captured: Uint8Array, x: number, y: number): boolean => {
  const c = worldToCell({ x, y });
  return captured[cellIndex(c.x, c.y)] === 1;
};

export const ensureOrbInActiveSpace = (orb: Orb, captured: Uint8Array): void => {
  if (!collidesCaptured(captured, orb.pos.x, orb.pos.y)) return;

  const maxRadius = Math.max(GRID_COLS, GRID_ROWS);
  for (let radius = 1; radius <= maxRadius; radius++) {
    for (let ox = -radius; ox <= radius; ox++) {
      for (let oy = -radius; oy <= radius; oy++) {
        const x = clamp(orb.pos.x + ox * GRID_CELL_SIZE, BORDER_THICKNESS + orb.radius, ARENA_WIDTH - BORDER_THICKNESS - orb.radius);
        const y = clamp(orb.pos.y + oy * GRID_CELL_SIZE, BORDER_THICKNESS + orb.radius, ARENA_HEIGHT - BORDER_THICKNESS - orb.radius);
        if (!collidesCaptured(captured, x, y)) {
          orb.pos = { x, y };
          return;
        }
      }
    }
  }
};

export const bounceOrb = (orb: Orb, captured: Uint8Array, dt: number): void => {
  let nextX = orb.pos.x + orb.vel.x * dt;
  let nextY = orb.pos.y + orb.vel.y * dt;

  if (nextX - orb.radius <= BORDER_THICKNESS) {
    nextX = BORDER_THICKNESS + orb.radius;
    orb.vel.x = Math.abs(orb.vel.x);
  } else if (nextX + orb.radius >= ARENA_WIDTH - BORDER_THICKNESS) {
    nextX = ARENA_WIDTH - BORDER_THICKNESS - orb.radius;
    orb.vel.x = -Math.abs(orb.vel.x);
  }

  if (nextY - orb.radius <= BORDER_THICKNESS) {
    nextY = BORDER_THICKNESS + orb.radius;
    orb.vel.y = Math.abs(orb.vel.y);
  } else if (nextY + orb.radius >= ARENA_HEIGHT - BORDER_THICKNESS) {
    nextY = ARENA_HEIGHT - BORDER_THICKNESS - orb.radius;
    orb.vel.y = -Math.abs(orb.vel.y);
  }

  if (collidesCaptured(captured, nextX, orb.pos.y)) {
    orb.vel.x *= -1;
    nextX = orb.pos.x + orb.vel.x * dt;
  }
  if (collidesCaptured(captured, orb.pos.x, nextY)) {
    orb.vel.y *= -1;
    nextY = orb.pos.y + orb.vel.y * dt;
  }

  if (collidesCaptured(captured, nextX, nextY)) {
    orb.vel.x *= -1;
    orb.vel.y *= -1;
    nextX = orb.pos.x + orb.vel.x * dt;
    nextY = orb.pos.y + orb.vel.y * dt;
  }

  orb.pos.x = nextX;
  orb.pos.y = nextY;
  ensureOrbInActiveSpace(orb, captured);
};
