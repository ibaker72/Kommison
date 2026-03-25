import { GameState, CapturedRegion, Player, TrailChaser } from './types';
import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  BORDER_WIDTH,
  PLAYER_SIZE,
  PLAYER_COLOR,
  PLAYER_GLOW_COLOR,
  TRAIL_COLOR,
  TRAIL_GLOW_COLOR,
  TRAIL_INFECTED_COLOR,
  TRAIL_INFECTED_GLOW,
  TRAIL_WIDTH,
  ORB_COLOR,
  ORB_GLOW_COLOR,
  CHASER_RADIUS,
  CHASER_COLOR,
  CHASER_GLOW,
  GRID_SPACING,
  GRID_COLOR,
  BG_COLOR,
  ARENA_BG_COLOR,
  ARENA_BORDER_COLOR,
  ARENA_BORDER_GLOW,
  CAPTURED_BORDER,
} from './constants';

// ─── Background Image Cache ──────────────────────────────────────

let bgCanvas: OffscreenCanvas | null = null;

function getBackgroundImage(): OffscreenCanvas {
  if (bgCanvas) return bgCanvas;

  bgCanvas = new OffscreenCanvas(ARENA_WIDTH, ARENA_HEIGHT);
  const ctx = bgCanvas.getContext('2d')!;
  const bw = BORDER_WIDTH;

  const grad = ctx.createLinearGradient(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  grad.addColorStop(0, '#0a1628');
  grad.addColorStop(0.3, '#0d1f3c');
  grad.addColorStop(0.5, '#162040');
  grad.addColorStop(0.7, '#0a1a30');
  grad.addColorStop(1, '#081020');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  ctx.strokeStyle = 'rgba(0, 255, 204, 0.12)';
  ctx.lineWidth = 1;
  const spacing = 20;

  for (let y = bw; y < ARENA_HEIGHT - bw; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(bw, y);
    let x = bw;
    while (x < ARENA_WIDTH - bw) {
      const segLen = 10 + Math.random() * 40;
      x += segLen;
      ctx.lineTo(Math.min(x, ARENA_WIDTH - bw), y);
      if (Math.random() > 0.6 && x < ARENA_WIDTH - bw - 20) {
        const jog = (Math.random() > 0.5 ? 1 : -1) * spacing * 0.5;
        ctx.lineTo(x, y + jog);
        ctx.lineTo(x + 10, y + jog);
        ctx.lineTo(x + 10, y);
        x += 10;
      }
    }
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(0, 255, 204, 0.25)';
  for (let i = 0; i < 40; i++) {
    const nx = bw + 20 + Math.random() * (ARENA_WIDTH - 2 * bw - 40);
    const ny = bw + 20 + Math.random() * (ARENA_HEIGHT - 2 * bw - 40);
    const r = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.arc(nx, ny, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 8; i++) {
    const sx = bw + 40 + Math.random() * (ARENA_WIDTH - 2 * bw - 80);
    const sy = bw + 40 + Math.random() * (ARENA_HEIGHT - 2 * bw - 80);
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 30 + Math.random() * 30);
    sg.addColorStop(0, 'rgba(0, 255, 204, 0.08)');
    sg.addColorStop(0.5, 'rgba(0, 200, 180, 0.03)');
    sg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sg;
    ctx.fillRect(sx - 60, sy - 60, 120, 120);
  }

  ctx.strokeStyle = 'rgba(255, 0, 255, 0.06)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) {
    const sx = Math.random() * ARENA_WIDTH;
    const sy = Math.random() * ARENA_HEIGHT;
    const angle = Math.random() * Math.PI;
    const len = 40 + Math.random() * 80;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len);
    ctx.stroke();
  }

  return bgCanvas;
}

export function resetBackgroundCache(): void {
  bgCanvas = null;
}

// ─── Rendering Engine ─────────────────────────────────────────────

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasWidth: number,
  canvasHeight: number,
  time: number
): void {
  const scaleX = canvasWidth / ARENA_WIDTH;
  const scaleY = canvasHeight / ARENA_HEIGHT;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (canvasWidth - ARENA_WIDTH * scale) / 2;
  const offsetY = (canvasHeight - ARENA_HEIGHT * scale) / 2;

  ctx.save();

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  drawArenaBackground(ctx);
  drawGrid(ctx, time);
  drawRevealedRegions(ctx, state.capturedRegions, time);
  drawArenaBorder(ctx, time);
  drawTrail(ctx, state, time);

  // Draw trail chaser
  if (state.trailChaser && state.trailChaser.active) {
    drawChaser(ctx, state.trailChaser, time);
  }

  for (const orb of state.orbs) {
    drawOrb(ctx, orb.x, orb.y, orb.radius, time);
  }

  drawPlayer(ctx, state.player, time);

  ctx.restore();
}

// ─── Sub-renderers ────────────────────────────────────────────────

function drawArenaBackground(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = ARENA_BG_COLOR;
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
}

function drawGrid(ctx: CanvasRenderingContext2D, time: number): void {
  const bw = BORDER_WIDTH;
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.001);
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.3 + pulse * 0.1;

  for (let x = bw; x < ARENA_WIDTH - bw; x += GRID_SPACING) {
    ctx.beginPath();
    ctx.moveTo(x, bw);
    ctx.lineTo(x, ARENA_HEIGHT - bw);
    ctx.stroke();
  }
  for (let y = bw; y < ARENA_HEIGHT - bw; y += GRID_SPACING) {
    ctx.beginPath();
    ctx.moveTo(bw, y);
    ctx.lineTo(ARENA_WIDTH - bw, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawArenaBorder(ctx: CanvasRenderingContext2D, time: number): void {
  const bw = BORDER_WIDTH;
  const pulse = 0.7 + 0.3 * Math.sin(time * 0.002);

  ctx.save();
  ctx.shadowColor = ARENA_BORDER_GLOW;
  ctx.shadowBlur = 12 * pulse;
  ctx.strokeStyle = ARENA_BORDER_COLOR;
  ctx.lineWidth = bw;
  ctx.strokeRect(bw / 2, bw / 2, ARENA_WIDTH - bw, ARENA_HEIGHT - bw);
  ctx.restore();
}

function drawRevealedRegions(
  ctx: CanvasRenderingContext2D,
  regions: CapturedRegion[],
  time: number
): void {
  if (regions.length === 0) return;

  const bgImage = getBackgroundImage();
  const pulse = 0.85 + 0.15 * Math.sin(time * 0.003);

  ctx.save();
  ctx.beginPath();
  for (const region of regions) {
    if (region.points.length < 3) continue;
    ctx.moveTo(region.points[0].x, region.points[0].y);
    for (let i = 1; i < region.points.length; i++) {
      ctx.lineTo(region.points[i].x, region.points[i].y);
    }
    ctx.closePath();
  }
  ctx.clip();
  ctx.drawImage(bgImage, 0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  ctx.restore();

  ctx.save();
  ctx.shadowColor = 'rgba(0, 255, 204, 0.4)';
  ctx.shadowBlur = 6 * pulse;
  ctx.strokeStyle = CAPTURED_BORDER;
  ctx.lineWidth = 1.5;
  for (const region of regions) {
    if (region.points.length < 3) continue;
    ctx.beginPath();
    ctx.moveTo(region.points[0].x, region.points[0].y);
    for (let i = 1; i < region.points.length; i++) {
      ctx.lineTo(region.points[i].x, region.points[i].y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function drawTrail(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number
): void {
  const trail = state.player.trail;
  if (trail.length < 2) return;

  const infected = state.trailChaser !== null && state.trailChaser.active;
  const chaserPos = state.trailChaser?.trailPos ?? 0;
  const pulse = 0.7 + 0.3 * Math.sin(time * 0.005);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (infected) {
    // Draw the "consumed" portion behind the chaser in red
    const splitIdx = Math.floor(chaserPos);
    if (splitIdx > 0) {
      ctx.shadowColor = TRAIL_INFECTED_GLOW;
      ctx.shadowBlur = 12 * pulse;
      ctx.strokeStyle = TRAIL_INFECTED_COLOR;
      ctx.lineWidth = TRAIL_WIDTH + 1;
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i <= Math.min(splitIdx + 1, trail.length - 1); i++) {
        ctx.lineTo(trail[i].x, trail[i].y);
      }
      ctx.stroke();
    }

    // Draw the "safe" portion ahead of the chaser in magenta (pulsing faster)
    const fastPulse = 0.5 + 0.5 * Math.sin(time * 0.015);
    ctx.shadowColor = TRAIL_GLOW_COLOR;
    ctx.shadowBlur = 14 * fastPulse;
    ctx.strokeStyle = TRAIL_COLOR;
    ctx.lineWidth = TRAIL_WIDTH;
    const startIdx = Math.max(0, splitIdx);
    if (startIdx < trail.length - 1) {
      ctx.beginPath();
      ctx.moveTo(trail[startIdx].x, trail[startIdx].y);
      for (let i = startIdx + 1; i < trail.length; i++) {
        ctx.lineTo(trail[i].x, trail[i].y);
      }
      ctx.stroke();
    }
  } else {
    // Normal trail rendering
    ctx.shadowColor = TRAIL_GLOW_COLOR;
    ctx.shadowBlur = 10 * pulse;
    ctx.strokeStyle = TRAIL_COLOR;
    ctx.lineWidth = TRAIL_WIDTH;

    ctx.beginPath();
    ctx.moveTo(trail[0].x, trail[0].y);
    for (let i = 1; i < trail.length; i++) {
      ctx.lineTo(trail[i].x, trail[i].y);
    }
    ctx.stroke();
  }

  // Animated energy dots
  const dotColor = infected ? 'rgba(255, 80, 80, 0.8)' : 'rgba(255, 100, 255, 0.8)';
  ctx.fillStyle = dotColor;
  const dotOffset = (time * 0.05) % 12;
  for (let i = dotOffset; i < trail.length; i += 12) {
    const idx = Math.floor(i);
    if (idx >= trail.length) break;
    ctx.beginPath();
    ctx.arc(trail[idx].x, trail[idx].y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ─── Trail Chaser Renderer ───────────────────────────────────────

function drawChaser(
  ctx: CanvasRenderingContext2D,
  chaser: TrailChaser,
  time: number
): void {
  const { x, y } = chaser;
  const r = CHASER_RADIUS;
  const pulse = 0.7 + 0.3 * Math.sin(time * 0.01);

  ctx.save();

  // Danger glow
  ctx.shadowColor = CHASER_GLOW;
  ctx.shadowBlur = 18 * pulse;

  // Outer ring glow
  const outerGrad = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
  outerGrad.addColorStop(0, 'rgba(255, 68, 68, 0.5)');
  outerGrad.addColorStop(0.5, 'rgba(255, 68, 68, 0.15)');
  outerGrad.addColorStop(1, 'rgba(255, 68, 68, 0)');
  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.arc(x, y, r * 3, 0, Math.PI * 2);
  ctx.fill();

  // Core
  const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.3, CHASER_COLOR);
  coreGrad.addColorStop(1, '#cc0000');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Electric arcs spinning around the chaser
  ctx.strokeStyle = 'rgba(255, 200, 150, 0.7)';
  ctx.lineWidth = 1;
  const arcCount = 3;
  for (let i = 0; i < arcCount; i++) {
    const angle = (time * 0.015 + (i * Math.PI * 2) / arcCount) % (Math.PI * 2);
    const len = r * (1.5 + 0.4 * Math.sin(time * 0.02 + i * 1.7));
    const midAngle = angle + Math.sin(time * 0.03 + i) * 0.5;

    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * r * 0.5, y + Math.sin(angle) * r * 0.5);
    ctx.lineTo(x + Math.cos(midAngle) * len * 0.7, y + Math.sin(midAngle) * len * 0.7);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  ctx.restore();
}

function drawOrb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  time: number
): void {
  const pulse = 0.8 + 0.2 * Math.sin(time * 0.006);

  ctx.save();

  ctx.shadowColor = ORB_GLOW_COLOR;
  ctx.shadowBlur = 20 * pulse;

  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.5);
  gradient.addColorStop(0, ORB_COLOR);
  gradient.addColorStop(0.4, 'rgba(255, 204, 0, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 204, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
  ctx.fill();

  const coreGrad = ctx.createRadialGradient(x - radius * 0.2, y - radius * 0.2, 0, x, y, radius);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.3, ORB_COLOR);
  coreGrad.addColorStop(1, '#ff8800');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 200, 0.6)';
  ctx.lineWidth = 1;
  const sparkCount = 5;
  for (let i = 0; i < sparkCount; i++) {
    const angle = (time * 0.008 + (i * Math.PI * 2) / sparkCount) % (Math.PI * 2);
    const sparkLen = radius * (1.4 + 0.5 * Math.sin(time * 0.012 + i * 2.3));
    const midAngle = angle + (Math.sin(time * 0.02 + i) * 0.3);
    const midLen = radius * (0.9 + 0.3 * Math.sin(time * 0.015 + i));

    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    ctx.lineTo(x + Math.cos(midAngle) * midLen, y + Math.sin(midAngle) * midLen);
    ctx.lineTo(x + Math.cos(angle) * sparkLen, y + Math.sin(angle) * sparkLen);
    ctx.stroke();
  }

  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  time: number
): void {
  const { x, y, invulnFrames, direction } = player;
  const pulse = 0.7 + 0.3 * Math.sin(time * 0.004);
  const size = PLAYER_SIZE;

  if (invulnFrames > 0 && Math.floor(time / 80) % 2 === 0) {
    return;
  }

  ctx.save();

  // Determine rotation from movement direction
  let angle = -Math.PI / 2; // default: pointing up
  if (direction.dx !== 0 || direction.dy !== 0) {
    angle = Math.atan2(direction.dy, direction.dx);
  }

  ctx.translate(x, y);
  ctx.rotate(angle);

  // Outer glow halo
  const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.2);
  glowGrad.addColorStop(0, 'rgba(0, 255, 204, 0.25)');
  glowGrad.addColorStop(0.5, 'rgba(0, 255, 204, 0.08)');
  glowGrad.addColorStop(1, 'rgba(0, 255, 204, 0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(0, 0, size * 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Main ship body — triangular with notched tail
  ctx.shadowColor = PLAYER_GLOW_COLOR;
  ctx.shadowBlur = 18 * pulse;

  const nose = size * 0.6;
  const wing = size * 0.45;
  const tail = size * 0.4;
  const notch = size * 0.15;

  ctx.fillStyle = PLAYER_COLOR;
  ctx.beginPath();
  ctx.moveTo(nose, 0);                     // nose tip
  ctx.lineTo(-tail, -wing);                // left wing
  ctx.lineTo(-tail + notch, 0);            // tail notch
  ctx.lineTo(-tail, wing);                 // right wing
  ctx.closePath();
  ctx.fill();

  // Inner highlight layer
  ctx.fillStyle = 'rgba(180, 255, 240, 0.4)';
  ctx.beginPath();
  ctx.moveTo(nose * 0.6, 0);
  ctx.lineTo(-tail * 0.4, -wing * 0.4);
  ctx.lineTo(-tail * 0.3, 0);
  ctx.lineTo(-tail * 0.4, wing * 0.4);
  ctx.closePath();
  ctx.fill();

  // Bright core dot
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Engine glow at tail
  const enginePulse = 0.5 + 0.5 * Math.sin(time * 0.015);
  ctx.shadowColor = 'rgba(0, 200, 255, 0.8)';
  ctx.shadowBlur = 8 * enginePulse;
  ctx.fillStyle = `rgba(0, 220, 255, ${0.4 + 0.3 * enginePulse})`;
  ctx.beginPath();
  ctx.arc(-tail + notch, 0, 2.5 + enginePulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Trail-active ring (drawn in world space, not rotated)
  if (player.trail.length > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(255, 0, 255, 0.4)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.7 + Math.sin(time * 0.01) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
