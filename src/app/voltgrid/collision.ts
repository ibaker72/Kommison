import { Point, Orb, CapturedRegion } from './types';
import { ARENA_WIDTH, ARENA_HEIGHT, BORDER_WIDTH } from './constants';
import { distance, pointInPolygon, polygonArea } from './utils';

// ─── Orb Collision Detection ──────────────────────────────────────

/** Check if orb collides with a trail segment */
export function orbCollidesWithTrail(orb: Orb, trail: Point[]): boolean {
  if (trail.length < 2) return false;

  for (let i = 0; i < trail.length - 1; i++) {
    const a = trail[i];
    const b = trail[i + 1];
    if (pointToSegmentDistance({ x: orb.x, y: orb.y }, a, b) < orb.radius + 2) {
      return true;
    }
  }
  return false;
}

/** Distance from a point to a line segment */
function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return distance(p, a);

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return distance(p, proj);
}

/** Check if orb hits a captured region boundary */
export function orbCollidesWithRegion(orb: Orb, region: CapturedRegion): boolean {
  const pts = region.points;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    if (pointToSegmentDistance({ x: orb.x, y: orb.y }, a, b) < orb.radius + 1) {
      return true;
    }
  }
  return false;
}

// ─── Orb Boundary Bounce ─────────────────────────────────────────

/** Bounce orb off arena walls and captured regions */
export function bounceOrb(orb: Orb, capturedRegions: CapturedRegion[]): void {
  const bw = BORDER_WIDTH;
  const r = orb.radius;

  // Arena wall bounces
  if (orb.x - r <= bw) {
    orb.x = bw + r;
    orb.dx = Math.abs(orb.dx);
  }
  if (orb.x + r >= ARENA_WIDTH - bw) {
    orb.x = ARENA_WIDTH - bw - r;
    orb.dx = -Math.abs(orb.dx);
  }
  if (orb.y - r <= bw) {
    orb.y = bw + r;
    orb.dy = Math.abs(orb.dy);
  }
  if (orb.y + r >= ARENA_HEIGHT - bw) {
    orb.y = ARENA_HEIGHT - bw - r;
    orb.dy = -Math.abs(orb.dy);
  }

  // Bounce off captured region edges
  for (const region of capturedRegions) {
    if (pointInPolygon({ x: orb.x, y: orb.y }, region.points)) {
      // Push orb out and reverse direction
      orb.dx = -orb.dx;
      orb.dy = -orb.dy;
      orb.x += orb.dx * 2;
      orb.y += orb.dy * 2;
      break;
    }
  }
}

// ─── Area Capture Logic ──────────────────────────────────────────

/**
 * Build a closed polygon from the trail + border walk.
 * Returns the polygon that does NOT contain the orb.
 */
export function buildCapturePolygon(
  trail: Point[],
  orbs: { x: number; y: number }[],
  existingRegions: CapturedRegion[]
): Point[] | null {
  if (trail.length < 3) return null;

  const start = trail[0];
  const end = trail[trail.length - 1];

  // Build two candidate polygons by walking the border in each direction
  const clockwiseBorder = walkBorder(end, start, true);
  const counterClockwiseBorder = walkBorder(end, start, false);

  const poly1 = [...trail, ...clockwiseBorder];
  const poly2 = [...trail, ...counterClockwiseBorder];

  const area1 = polygonArea(poly1);
  const area2 = polygonArea(poly2);

  // Check which polygon contains the orb(s)
  const orb = orbs[0]; // Primary orb for now
  const orb1Inside = pointInPolygon({ x: orb.x, y: orb.y }, poly1);
  const orb2Inside = pointInPolygon({ x: orb.x, y: orb.y }, poly2);

  // Return the polygon that does NOT contain the orb
  // If neither contains, return the smaller one
  if (!orb1Inside && !orb2Inside) {
    return area1 < area2 ? poly1 : poly2;
  }
  if (!orb1Inside) return poly1;
  if (!orb2Inside) return poly2;

  // Both contain orb somehow - return smaller (shouldn't normally happen)
  return area1 < area2 ? poly1 : poly2;
}

/** Walk along the arena border from point A to point B */
function walkBorder(from: Point, to: Point, clockwise: boolean): Point[] {
  const bw = BORDER_WIDTH;
  const hw = bw / 2;
  const maxX = ARENA_WIDTH - hw;
  const maxY = ARENA_HEIGHT - hw;

  // Define corner points
  const corners: Point[] = [
    { x: hw, y: hw },           // top-left
    { x: maxX, y: hw },         // top-right
    { x: maxX, y: maxY },       // bottom-right
    { x: hw, y: maxY },         // bottom-left
  ];

  // Get border edge for a point (0=top, 1=right, 2=bottom, 3=left)
  function getEdge(p: Point): number {
    if (p.y <= bw) return 0;
    if (p.x >= ARENA_WIDTH - bw) return 1;
    if (p.y >= ARENA_HEIGHT - bw) return 2;
    return 3;
  }

  // Get position along the perimeter (0 to 4, one unit per edge)
  function getPerimeterPos(p: Point): number {
    const edge = getEdge(p);
    switch (edge) {
      case 0: return (p.x - hw) / (maxX - hw);
      case 1: return 1 + (p.y - hw) / (maxY - hw);
      case 2: return 2 + (maxX - p.x) / (maxX - hw);
      case 3: return 3 + (maxY - p.y) / (maxY - hw);
      default: return 0;
    }
  }

  const result: Point[] = [];
  const fromEdge = getEdge(from);
  const toEdge = getEdge(to);

  let currentEdge = fromEdge;
  const step = clockwise ? 1 : -1;

  // Walk corners until we reach the target edge
  let iterations = 0;
  while (currentEdge !== toEdge && iterations < 8) {
    const nextEdge = ((currentEdge + step) + 4) % 4;
    const cornerIdx = clockwise ? (currentEdge + 1) % 4 : currentEdge;
    result.push({ ...corners[cornerIdx] });
    currentEdge = nextEdge;
    iterations++;
  }

  return result;
}

/** Calculate total captured percentage */
export function calculateRevealPercentage(
  regions: CapturedRegion[]
): number {
  const bw = BORDER_WIDTH;
  const totalArea = (ARENA_WIDTH - 2 * bw) * (ARENA_HEIGHT - 2 * bw);
  let capturedArea = 0;

  for (const region of regions) {
    capturedArea += polygonArea(region.points);
  }

  return Math.min(100, (capturedArea / totalArea) * 100);
}
