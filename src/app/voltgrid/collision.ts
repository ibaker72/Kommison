import { Point, Orb, CapturedRegion } from './types';
import { ARENA_WIDTH, ARENA_HEIGHT, BORDER_WIDTH } from './constants';
import {
  pointInPolygon,
  polygonArea,
  pointToSegmentDistance,
  segmentsIntersect,
} from './utils';

// ─── Orb Collision Detection ──────────────────────────────────────

/** Check if orb collides with a trail segment */
export function orbCollidesWithTrail(orb: Orb, trail: Point[]): boolean {
  if (trail.length < 2) return false;

  const orbPt = { x: orb.x, y: orb.y };
  for (let i = 0; i < trail.length - 1; i++) {
    if (pointToSegmentDistance(orbPt, trail[i], trail[i + 1]) < orb.radius + 1) {
      return true;
    }
  }
  return false;
}

// ─── Self-Trail Collision ─────────────────────────────────────────

/** Check if moving from `from` to `to` crosses any existing trail segment.
 *  Skips the last `skipTail` segments to avoid false positives near the player. */
export function selfTrailCollision(
  from: Point,
  to: Point,
  trail: Point[],
  skipTail = 3
): boolean {
  if (trail.length < 2) return false;

  const checkEnd = Math.max(0, trail.length - 1 - skipTail);
  for (let i = 0; i < checkEnd; i++) {
    if (segmentsIntersect(from, to, trail[i], trail[i + 1])) {
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
    const orbPt = { x: orb.x, y: orb.y };
    if (pointInPolygon(orbPt, region.points)) {
      // Find nearest edge to determine bounce normal
      let minDist = Infinity;
      let nearestNormalX = 0;
      let nearestNormalY = 0;
      const pts = region.points;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        const d = pointToSegmentDistance(orbPt, a, b);
        if (d < minDist) {
          minDist = d;
          // Normal is perpendicular to edge
          const edgeDx = b.x - a.x;
          const edgeDy = b.y - a.y;
          const len = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy) || 1;
          nearestNormalX = -edgeDy / len;
          nearestNormalY = edgeDx / len;
        }
      }

      // Reflect velocity across the normal
      const dot = orb.dx * nearestNormalX + orb.dy * nearestNormalY;
      orb.dx -= 2 * dot * nearestNormalX;
      orb.dy -= 2 * dot * nearestNormalY;

      // Push out
      orb.x += orb.dx * 3;
      orb.y += orb.dy * 3;
      break;
    }
  }
}

// ─── Area Capture Logic ──────────────────────────────────────────

/**
 * Build a closed polygon from the trail + border walk.
 * Returns the polygon that does NOT contain any orb.
 */
export function buildCapturePolygon(
  trail: Point[],
  orbs: { x: number; y: number }[],
): Point[] | null {
  if (trail.length < 3) return null;

  const start = trail[0];
  const end = trail[trail.length - 1];

  // Build two candidate polygons by walking the border in each direction
  const cwBorder = walkBorder(end, start, true);
  const ccwBorder = walkBorder(end, start, false);

  const poly1 = [...trail, ...cwBorder];
  const poly2 = [...trail, ...ccwBorder];

  const area1 = polygonArea(poly1);
  const area2 = polygonArea(poly2);

  // Validate polygons have non-trivial area
  if (area1 < 10 && area2 < 10) return null;

  // Check which polygon contains the orb(s)
  const orb = orbs[0];
  const orbPt = { x: orb.x, y: orb.y };
  const orb1Inside = pointInPolygon(orbPt, poly1);
  const orb2Inside = pointInPolygon(orbPt, poly2);

  // Return the polygon that does NOT contain the orb
  if (!orb1Inside && !orb2Inside) {
    return area1 < area2 ? poly1 : poly2;
  }
  if (!orb1Inside) return poly1;
  if (!orb2Inside) return poly2;

  // Both contain orb — return smaller (edge case)
  return area1 < area2 ? poly1 : poly2;
}

// ─── Border Walking ──────────────────────────────────────────────

/** Get which border edge a point is on: 0=top, 1=right, 2=bottom, 3=left */
function getEdge(p: Point): number {
  const bw = BORDER_WIDTH;
  const tol = bw + 2;
  if (p.y <= tol) return 0;
  if (p.x >= ARENA_WIDTH - tol) return 1;
  if (p.y >= ARENA_HEIGHT - tol) return 2;
  return 3;
}

/** Walk along the arena border from `from` to `to`, going clockwise or counter-clockwise.
 *  Returns intermediate points (corners) plus the `to` point. Does NOT include `from`. */
function walkBorder(from: Point, to: Point, clockwise: boolean): Point[] {
  const hw = BORDER_WIDTH / 2;
  const maxX = ARENA_WIDTH - hw;
  const maxY = ARENA_HEIGHT - hw;

  // Corner coordinates in CW order: TL, TR, BR, BL
  const corners: Point[] = [
    { x: hw, y: hw },
    { x: maxX, y: hw },
    { x: maxX, y: maxY },
    { x: hw, y: maxY },
  ];

  // Which corners connect edges:
  // Edge 0 (top) ends at corner 1 (TR) going CW
  // Edge 1 (right) ends at corner 2 (BR) going CW
  // Edge 2 (bottom) ends at corner 3 (BL) going CW
  // Edge 3 (left) ends at corner 0 (TL) going CW
  const fromEdge = getEdge(from);
  const toEdge = getEdge(to);

  const result: Point[] = [];
  let currentEdge = fromEdge;
  const step = clockwise ? 1 : -1;

  let iters = 0;
  while (currentEdge !== toEdge && iters < 5) {
    // Add the corner at the transition between currentEdge and nextEdge
    if (clockwise) {
      result.push({ ...corners[(currentEdge + 1) % 4] });
    } else {
      result.push({ ...corners[currentEdge] });
    }
    currentEdge = ((currentEdge + step) + 4) % 4;
    iters++;
  }

  // Add the destination point snapped to border
  result.push({ x: to.x, y: to.y });

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
