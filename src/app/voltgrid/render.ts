import { GameState } from './types';
import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  BORDER_WIDTH,
  PLAYER_SIZE,
  PLAYER_COLOR,
  PLAYER_GLOW_COLOR,
  TRAIL_COLOR,
  TRAIL_GLOW_COLOR,
  TRAIL_WIDTH,
  ORB_COLOR,
  ORB_GLOW_COLOR,
  GRID_SPACING,
  GRID_COLOR,
  BG_COLOR,
  ARENA_BG_COLOR,
  ARENA_BORDER_COLOR,
  ARENA_BORDER_GLOW,
  CAPTURED_FILL,
  CAPTURED_BORDER,
} from './constants';

// ─── Rendering Engine ─────────────────────────────────────────────

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasWidth: number,
  canvasHeight: number,
  time: number
): void {
  // Calculate scale and offset for centering
  const scaleX = canvasWidth / ARENA_WIDTH;
  const scaleY = canvasHeight / ARENA_HEIGHT;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (canvasWidth - ARENA_WIDTH * scale) / 2;
  const offsetY = (canvasHeight - ARENA_HEIGHT * scale) / 2;

  ctx.save();

  // Clear background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Transform to arena space
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Draw arena background
  drawArenaBackground(ctx, time);

  // Draw grid
  drawGrid(ctx, time);

  // Draw captured regions
  drawCapturedRegions(ctx, state, time);

  // Draw arena border
  drawArenaBorder(ctx, time);

  // Draw active trail
  drawTrail(ctx, state, time);

  // Draw orbs
  for (const orb of state.orbs) {
    drawOrb(ctx, orb.x, orb.y, orb.radius, time);
  }

  // Draw player
  drawPlayer(ctx, state.player.x, state.player.y, time);

  ctx.restore();
}

// ─── Sub-renderers ────────────────────────────────────────────────

function drawArenaBackground(ctx: CanvasRenderingContext2D, _time: number): void {
  ctx.fillStyle = ARENA_BG_COLOR;
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
}

function drawGrid(ctx: CanvasRenderingContext2D, time: number): void {
  const bw = BORDER_WIDTH;
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.001);
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.3 + pulse * 0.15;

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

function drawCapturedRegions(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number
): void {
  const pulse = 0.8 + 0.2 * Math.sin(time * 0.003);

  for (const region of state.capturedRegions) {
    if (region.points.length < 3) continue;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 255, 204, 0.3)';
    ctx.shadowBlur = 8 * pulse;

    ctx.beginPath();
    ctx.moveTo(region.points[0].x, region.points[0].y);
    for (let i = 1; i < region.points.length; i++) {
      ctx.lineTo(region.points[i].x, region.points[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = CAPTURED_FILL;
    ctx.fill();
    ctx.strokeStyle = CAPTURED_BORDER;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }
}

function drawTrail(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number
): void {
  const trail = state.player.trail;
  if (trail.length < 2) return;

  const pulse = 0.7 + 0.3 * Math.sin(time * 0.005);

  ctx.save();
  ctx.shadowColor = TRAIL_GLOW_COLOR;
  ctx.shadowBlur = 10 * pulse;
  ctx.strokeStyle = TRAIL_COLOR;
  ctx.lineWidth = TRAIL_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(trail[0].x, trail[0].y);
  for (let i = 1; i < trail.length; i++) {
    ctx.lineTo(trail[i].x, trail[i].y);
  }
  ctx.stroke();

  // Draw dots along the trail for extra glow
  ctx.fillStyle = TRAIL_COLOR;
  for (let i = 0; i < trail.length; i += 3) {
    ctx.beginPath();
    ctx.arc(trail[i].x, trail[i].y, 1.5, 0, Math.PI * 2);
    ctx.fill();
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

  // Outer glow
  ctx.shadowColor = ORB_GLOW_COLOR;
  ctx.shadowBlur = 20 * pulse;

  // Glow ring
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.5);
  gradient.addColorStop(0, ORB_COLOR);
  gradient.addColorStop(0.4, 'rgba(255, 204, 0, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 204, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Core orb
  const coreGrad = ctx.createRadialGradient(x - radius * 0.2, y - radius * 0.2, 0, x, y, radius);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.3, ORB_COLOR);
  coreGrad.addColorStop(1, '#ff8800');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Small electric sparks
  ctx.strokeStyle = 'rgba(255, 255, 200, 0.6)';
  ctx.lineWidth = 1;
  const sparkCount = 4;
  for (let i = 0; i < sparkCount; i++) {
    const angle = (time * 0.01 + (i * Math.PI * 2) / sparkCount) % (Math.PI * 2);
    const sparkLen = radius * (1.5 + 0.5 * Math.sin(time * 0.01 + i));
    ctx.beginPath();
    ctx.moveTo(
      x + Math.cos(angle) * radius,
      y + Math.sin(angle) * radius
    );
    ctx.lineTo(
      x + Math.cos(angle) * sparkLen,
      y + Math.sin(angle) * sparkLen
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number
): void {
  const pulse = 0.8 + 0.2 * Math.sin(time * 0.004);
  const half = PLAYER_SIZE / 2;

  ctx.save();

  // Glow
  ctx.shadowColor = PLAYER_GLOW_COLOR;
  ctx.shadowBlur = 15 * pulse;

  // Diamond shape
  ctx.fillStyle = PLAYER_COLOR;
  ctx.beginPath();
  ctx.moveTo(x, y - half);
  ctx.lineTo(x + half, y);
  ctx.lineTo(x, y + half);
  ctx.lineTo(x - half, y);
  ctx.closePath();
  ctx.fill();

  // Inner bright core
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
