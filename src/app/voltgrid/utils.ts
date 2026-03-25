import { Point, Direction } from './types';
import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  BORDER_WIDTH,
  BORDER_TOLERANCE,
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

/** Check if a point is on the arena border (with generous tolerance for reconnection) */
export function isOnBorder(x: number, y: number): boolean {
  const tol = BORDER_TOLERANCE;
  return (
    x <= tol ||
    x >= ARENA_WIDTH - tol ||
    y <= tol ||
    y >= ARENA_HEIGHT - tol
  );
}

/** Snap a point exactly onto the nearest border edge */
export function snapToBorder(x: number, y: number): Point {
  const bw = BORDER_WIDTH;
  const hw = bw / 2;
  const distLeft = x;
  const distRight = ARENA_WIDTH - x;
  const distTop = y;
  const distBottom = ARENA_HEIGHT - y;
  const minDist = Math.min(distLeft, distRight, distTop, distBottom);

  if (minDist === distLeft) return { x: hw, y: clamp(y, hw, ARENA_HEIGHT - hw) };
  if (minDist === distRight) return { x: ARENA_WIDTH - hw, y: clamp(y, hw, ARENA_HEIGHT - hw) };
  if (minDist === distTop) return { x: clamp(x, hw, ARENA_WIDTH - hw), y: hw };
  return { x: clamp(x, hw, ARENA_WIDTH - hw), y: ARENA_HEIGHT - hw };
}

export function directionFromKeys(keys: {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}): Direction {
  // Priority: most recent key wins via exclusive flags in input handler
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

// ─── Segment Intersection ─────────────────────────────────────────

/** Check if segments (p1→p2) and (p3→p4) intersect */
export function segmentsIntersect(
  p1: Point, p2: Point, p3: Point, p4: Point
): boolean {
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  // Collinear cases
  if (d1 === 0 && onSegment(p3, p4, p1)) return true;
  if (d2 === 0 && onSegment(p3, p4, p2)) return true;
  if (d3 === 0 && onSegment(p1, p2, p3)) return true;
  if (d4 === 0 && onSegment(p1, p2, p4)) return true;

  return false;
}

function cross(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function onSegment(a: Point, b: Point, p: Point): boolean {
  return (
    Math.min(a.x, b.x) <= p.x && p.x <= Math.max(a.x, b.x) &&
    Math.min(a.y, b.y) <= p.y && p.y <= Math.max(a.y, b.y)
  );
}

// ─── Distance from Point to Segment ──────────────────────────────

export function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return distance(p, a);

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return distance(p, proj);
}
