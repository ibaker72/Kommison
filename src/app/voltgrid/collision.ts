import { Point, Orb, CapturedRegion } from './types';
import { ARENA_WIDTH, ARENA_HEIGHT, BORDER_WIDTH, PLAYER_HIT_RADIUS } from './constants';
import {
  distance,
  pointInPolygon,
  polygonArea,
  pointToSegmentDistance,
  segmentsIntersect,
} from './utils';

// ─── Orb ↔ Trail Collision ───────────────────────────────────────

/** Find the trail segment index where the orb first touches the trail.
 *  Returns the fractional index, or -1 if no collision. */
export function findOrbTrailHitIndex(orb: Orb, trail: Point[]): number {
  if (trail.length < 2) return -1;

  const orbPt = { x: orb.x, y: orb.y };
  for (let i = 0; i < trail.length - 1; i++) {
    if (pointToSegmentDistance(orbPt, trail[i], trail[i + 1]) < orb.radius + 1) {
      // Return fractional position: project orb center onto segment
      const a = trail[i];
      const b = trail[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return i;
      const t = Math.max(0, Math.min(1, ((orbPt.x - a.x) * dx + (orbPt.y - a.y) * dy) / lenSq));
      return i + t;
    }
  }
  return -1;
}

// ─── Orb ↔ Player Direct Hit ────────────────────────────────────

/** Check if the orb directly touches the player icon */
export function orbHitsPlayer(orb: Orb, px: number, py: number): boolean {
  const d = distance({ x: orb.x, y: orb.y }, { x: px, y: py });
  return d < orb.radius + PLAYER_HIT_RADIUS;
}

// ─── Self-Trail Collision ─────────────────────────────────────────

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

export function bounceOrb(orb: Orb, capturedRegions: CapturedRegion[]): void {
  const bw = BORDER_WIDTH;
  const r = orb.radius;

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

  for (const region of capturedRegions) {
    const orbPt = { x: orb.x, y: orb.y };
    if (pointInPolygon(orbPt, region.points)) {
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
          const edgeDx = b.x - a.x;
          const edgeDy = b.y - a.y;
          const len = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy) || 1;
          nearestNormalX = -edgeDy / len;
          nearestNormalY = edgeDx / len;
        }
      }

      const dot = orb.dx * nearestNormalX + orb.dy * nearestNormalY;
      orb.dx -= 2 * dot * nearestNormalX;
      orb.dy -= 2 * dot * nearestNormalY;
      orb.x += orb.dx * 3;
      orb.y += orb.dy * 3;
      break;
    }
  }
}

// ─── Area Capture Logic ──────────────────────────────────────────

export function buildCapturePolygon(
  trail: Point[],
  orbs: { x: number; y: number }[],
): Point[] | null {
  if (trail.length < 3) return null;

  const start = trail[0];
  const end = trail[trail.length - 1];

  const cwBorder = walkBorder(end, start, true);
  const ccwBorder = walkBorder(end, start, false);

  const poly1 = [...trail, ...cwBorder];
  const poly2 = [...trail, ...ccwBorder];

  const area1 = polygonArea(poly1);
  const area2 = polygonArea(poly2);

  if (area1 < 10 && area2 < 10) return null;

  const orb = orbs[0];
  const orbPt = { x: orb.x, y: orb.y };
  const orb1Inside = pointInPolygon(orbPt, poly1);
  const orb2Inside = pointInPolygon(orbPt, poly2);

  if (!orb1Inside && !orb2Inside) {
    return area1 < area2 ? poly1 : poly2;
  }
  if (!orb1Inside) return poly1;
  if (!orb2Inside) return poly2;

  return area1 < area2 ? poly1 : poly2;
}

// ─── Border Walking ──────────────────────────────────────────────

function getEdge(p: Point): number {
  const bw = BORDER_WIDTH;
  const tol = bw + 2;
  if (p.y <= tol) return 0;
  if (p.x >= ARENA_WIDTH - tol) return 1;
  if (p.y >= ARENA_HEIGHT - tol) return 2;
  return 3;
}

function walkBorder(from: Point, to: Point, clockwise: boolean): Point[] {
  const hw = BORDER_WIDTH / 2;
  const maxX = ARENA_WIDTH - hw;
  const maxY = ARENA_HEIGHT - hw;

  const corners: Point[] = [
    { x: hw, y: hw },
    { x: maxX, y: hw },
    { x: maxX, y: maxY },
    { x: hw, y: maxY },
  ];

  const fromEdge = getEdge(from);
  const toEdge = getEdge(to);

  const result: Point[] = [];
  let currentEdge = fromEdge;
  const step = clockwise ? 1 : -1;

  let iters = 0;
  while (currentEdge !== toEdge && iters < 5) {
    if (clockwise) {
      result.push({ ...corners[(currentEdge + 1) % 4] });
    } else {
      result.push({ ...corners[currentEdge] });
    }
    currentEdge = ((currentEdge + step) + 4) % 4;
    iters++;
  }

  result.push({ x: to.x, y: to.y });

  return result;
}

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
