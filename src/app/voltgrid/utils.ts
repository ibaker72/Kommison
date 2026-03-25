import { Point, Direction } from './types';
import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  BORDER_WIDTH,
  DIRECTIONS,
} from './constants';

// ─── Geometry Utilities ───────────────────────────────────────────

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function pointsEqual(a: Point, b: Point, tolerance = 0.5): boolean {
  return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;
}

/** Check if a point is on the arena border */
export function isOnBorder(x: number, y: number): boolean {
  const bw = BORDER_WIDTH;
  return (
    x <= bw ||
    x >= ARENA_WIDTH - bw ||
    y <= bw ||
    y >= ARENA_HEIGHT - bw
  );
}

/** Snap a point to the nearest border position */
export function snapToBorder(x: number, y: number): Point {
  const bw = BORDER_WIDTH;
  const distLeft = x;
  const distRight = ARENA_WIDTH - x;
  const distTop = y;
  const distBottom = ARENA_HEIGHT - y;
  const minDist = Math.min(distLeft, distRight, distTop, distBottom);

  if (minDist === distLeft) return { x: bw / 2, y: clamp(y, bw / 2, ARENA_HEIGHT - bw / 2) };
  if (minDist === distRight) return { x: ARENA_WIDTH - bw / 2, y: clamp(y, bw / 2, ARENA_HEIGHT - bw / 2) };
  if (minDist === distTop) return { x: clamp(x, bw / 2, ARENA_WIDTH - bw / 2), y: bw / 2 };
  return { x: clamp(x, bw / 2, ARENA_WIDTH - bw / 2), y: ARENA_HEIGHT - bw / 2 };
}

/** Constrain movement along the border */
export function movAlongBorder(
  x: number,
  y: number,
  dir: Direction
): Point {
  const bw = BORDER_WIDTH;
  let nx = x + dir.dx;
  let ny = y + dir.dy;

  // On top edge
  if (y <= bw) {
    ny = bw / 2;
    nx = clamp(nx, bw / 2, ARENA_WIDTH - bw / 2);
    // Allow moving down from border
    if (dir.dy > 0) {
      ny = y + dir.dy;
    }
  }
  // On bottom edge
  else if (y >= ARENA_HEIGHT - bw) {
    ny = ARENA_HEIGHT - bw / 2;
    nx = clamp(nx, bw / 2, ARENA_WIDTH - bw / 2);
    if (dir.dy < 0) {
      ny = y + dir.dy;
    }
  }
  // On left edge
  else if (x <= bw) {
    nx = bw / 2;
    ny = clamp(ny, bw / 2, ARENA_HEIGHT - bw / 2);
    if (dir.dx > 0) {
      nx = x + dir.dx;
    }
  }
  // On right edge
  else if (x >= ARENA_WIDTH - bw) {
    nx = ARENA_WIDTH - bw / 2;
    ny = clamp(ny, bw / 2, ARENA_HEIGHT - bw / 2);
    if (dir.dx < 0) {
      nx = x + dir.dx;
    }
  }

  return { x: nx, y: ny };
}

export function directionFromKeys(keys: {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}): Direction {
  if (keys.up) return DIRECTIONS.UP;
  if (keys.down) return DIRECTIONS.DOWN;
  if (keys.left) return DIRECTIONS.LEFT;
  if (keys.right) return DIRECTIONS.RIGHT;
  return DIRECTIONS.NONE;
}

// ─── Polygon Area Calculation ─────────────────────────────────────

/** Shoelace formula for polygon area */
export function polygonArea(points: Point[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

/** Check if a point is inside a polygon using ray casting */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
