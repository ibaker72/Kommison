import { GRID_CELL_SIZE, GRID_COLS, GRID_ROWS } from './constants';
import type { Vec2 } from './types';

export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const length = (v: Vec2): number => Math.hypot(v.x, v.y);

export const normalize = (v: Vec2): Vec2 => {
  const len = length(v);
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
};

export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const cellIndex = (x: number, y: number): number => y * GRID_COLS + x;

export const worldToCell = (point: Vec2): { x: number; y: number } => ({
  x: clamp(Math.floor(point.x / GRID_CELL_SIZE), 0, GRID_COLS - 1),
  y: clamp(Math.floor(point.y / GRID_CELL_SIZE), 0, GRID_ROWS - 1),
});

export const cellCenter = (x: number, y: number): Vec2 => ({
  x: x * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
  y: y * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
});

export const pointToSegmentDistance = (p: Vec2, a: Vec2, b: Vec2): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(p, a);
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq, 0, 1);
  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return distance(p, proj);
};

export const trailLength = (trail: Vec2[]): number => {
  let total = 0;
  for (let i = 1; i < trail.length; i++) total += distance(trail[i - 1], trail[i]);
  return total;
};

export const pointOnTrailByDistance = (trail: Vec2[], dist: number): Vec2 => {
  if (trail.length === 0) return { x: 0, y: 0 };
  if (trail.length === 1 || dist <= 0) return trail[0];
  let acc = 0;
  for (let i = 1; i < trail.length; i++) {
    const seg = distance(trail[i - 1], trail[i]);
    if (acc + seg >= dist) {
      const t = (dist - acc) / Math.max(seg, 0.0001);
      return { x: lerp(trail[i - 1].x, trail[i].x, t), y: lerp(trail[i - 1].y, trail[i].y, t) };
    }
    acc += seg;
  }
  return trail[trail.length - 1];
};
