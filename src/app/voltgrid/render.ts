import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  BORDER_THICKNESS,
  CHASER_RADIUS,
  GRID_CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  PALETTE,
  PLAYER_RADIUS,
} from './constants';
import type { GameState, Particle } from './types';

export const renderGame = (
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasWidth: number,
  canvasHeight: number,
  time: number,
): void => {
  const scale = Math.min(canvasWidth / ARENA_WIDTH, canvasHeight / ARENA_HEIGHT);
  const viewWidth = ARENA_WIDTH * scale;
  const viewHeight = ARENA_HEIGHT * scale;
  const ox = (canvasWidth - viewWidth) / 2;
  const oy = (canvasHeight - viewHeight) / 2;

  ctx.save();
  drawFullscreenBackdrop(ctx, canvasWidth, canvasHeight, time);

  const shake = state.shakeMs > 0 ? (state.shakeMs / 220) * 3 : 0;
  const sx = (Math.random() - 0.5) * shake;
  const sy = (Math.random() - 0.5) * shake;

  ctx.translate(ox + sx, oy + sy);
  ctx.scale(scale, scale);

  drawArena(ctx, time);
  drawCaptured(ctx, state.captured, time);
  drawTrail(ctx, state, time);
  drawOrb(ctx, state, time);
  drawChaser(ctx, state, time);
  drawPlayer(ctx, state, time);
  drawParticles(ctx, state.particles);

  ctx.restore();
};

const drawFullscreenBackdrop = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void => {
  const g = ctx.createRadialGradient(width * 0.4, height * 0.5, 40, width * 0.5, height * 0.5, Math.max(width, height));
  g.addColorStop(0, '#0a1331');
  g.addColorStop(0.45, '#060a1b');
  g.addColorStop(1, PALETTE.pageBg);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(56, 205, 255, 0.08)';
  ctx.lineWidth = 1;
  const spacing = Math.max(28, Math.min(width, height) * 0.06);
  const drift = (time * 0.02) % spacing;
  for (let y = -spacing + drift; y < height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
};

const drawArena = (ctx: CanvasRenderingContext2D, time: number): void => {
  const g = ctx.createLinearGradient(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  g.addColorStop(0, '#0a1128');
  g.addColorStop(1, '#0b1637');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.45 + Math.sin(time * 0.0012) * 0.1;
  for (let x = GRID_CELL_SIZE; x < ARENA_WIDTH; x += GRID_CELL_SIZE * 5) {
    ctx.beginPath();
    ctx.moveTo(x, BORDER_THICKNESS);
    ctx.lineTo(x, ARENA_HEIGHT - BORDER_THICKNESS);
    ctx.stroke();
  }
  for (let y = GRID_CELL_SIZE; y < ARENA_HEIGHT; y += GRID_CELL_SIZE * 5) {
    ctx.beginPath();
    ctx.moveTo(BORDER_THICKNESS, y);
    ctx.lineTo(ARENA_WIDTH - BORDER_THICKNESS, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.shadowBlur = 14;
  ctx.shadowColor = PALETTE.borderGlow;
  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = BORDER_THICKNESS;
  ctx.strokeRect(BORDER_THICKNESS / 2, BORDER_THICKNESS / 2, ARENA_WIDTH - BORDER_THICKNESS, ARENA_HEIGHT - BORDER_THICKNESS);
  ctx.shadowBlur = 0;
};

const drawCaptured = (ctx: CanvasRenderingContext2D, captured: Uint8Array, time: number): void => {
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if (!captured[y * GRID_COLS + x]) continue;

      const px = x * GRID_CELL_SIZE;
      const py = y * GRID_CELL_SIZE;

      ctx.fillStyle = PALETTE.capturedFill;
      ctx.fillRect(px, py, GRID_CELL_SIZE, GRID_CELL_SIZE);

      if ((x + y + Math.floor(time * 0.005)) % 7 === 0) {
        ctx.fillStyle = PALETTE.capturedStripe;
        ctx.fillRect(px, py, GRID_CELL_SIZE, GRID_CELL_SIZE * 0.35);
      }
    }
  }
};

const drawTrail = (ctx: CanvasRenderingContext2D, state: GameState, time: number): void => {
  const trail = state.player.trail;
  if (trail.length < 2) return;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.shadowBlur = 10;
  ctx.shadowColor = state.chaser ? PALETTE.chaserGlow : PALETTE.trailGlow;
  ctx.strokeStyle = state.chaser ? PALETTE.infectedTrail : PALETTE.trail;

  ctx.beginPath();
  ctx.moveTo(trail[0].x, trail[0].y);
  for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  const step = 9;
  const offset = Math.floor((time * 0.025) % step);
  for (let i = offset; i < trail.length; i += step) {
    ctx.beginPath();
    ctx.arc(trail[i].x, trail[i].y, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawOrb = (ctx: CanvasRenderingContext2D, state: GameState, time: number): void => {
  const { orb } = state;
  const pulse = 1 + Math.sin(time * 0.009) * 0.06;

  ctx.save();
  ctx.translate(orb.pos.x, orb.pos.y);

  ctx.shadowColor = PALETTE.orbGlow;
  ctx.shadowBlur = 18;
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, orb.radius * 1.8 * pulse);
  core.addColorStop(0, '#fff6d1');
  core.addColorStop(0.45, '#ffb856');
  core.addColorStop(1, 'rgba(255,149,56,0.05)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, orb.radius * 1.8 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#3b0f04';
  ctx.beginPath();
  ctx.ellipse(-3, -2, 2.2, 3, -0.2, 0, Math.PI * 2);
  ctx.ellipse(3, -2, 2.2, 3, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 87, 42, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 2, orb.radius * 0.7, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();

  ctx.restore();
};

const drawChaser = (ctx: CanvasRenderingContext2D, state: GameState, time: number): void => {
  if (!state.chaser?.active) return;
  const { x, y } = state.chaser.pos;
  const pulse = 1 + Math.sin(time * 0.03) * 0.2;
  ctx.shadowColor = PALETTE.chaserGlow;
  ctx.shadowBlur = 14;
  ctx.fillStyle = PALETTE.chaser;
  ctx.beginPath();
  ctx.arc(x, y, CHASER_RADIUS * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
};

const drawPlayer = (ctx: CanvasRenderingContext2D, state: GameState, time: number): void => {
  const { player } = state;
  if (player.invulnMs > 0 && Math.floor(time / 90) % 2 === 0) return;

  const x = player.pos.x;
  const y = player.pos.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(player.heading);

  ctx.shadowColor = 'rgba(122, 255, 233, 0.9)';
  ctx.shadowBlur = 18;

  ctx.fillStyle = '#8dfdf1';
  ctx.beginPath();
  ctx.ellipse(-2, 0, PLAYER_RADIUS * 0.6, PLAYER_RADIUS * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffd06f';
  ctx.beginPath();
  ctx.moveTo(6, -2);
  ctx.lineTo(16, -5);
  ctx.lineTo(16, 1);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#4ecbff';
  ctx.beginPath();
  ctx.moveTo(-7, -8);
  ctx.lineTo(-1, -12);
  ctx.lineTo(2, -7);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#ff8aa7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-9, 4);
  ctx.lineTo(-15, 8);
  ctx.moveTo(-5, 7);
  ctx.lineTo(-11, 12);
  ctx.stroke();

  ctx.fillStyle = '#05283d';
  ctx.beginPath();
  ctx.arc(2, -2, 1.6, 0, Math.PI * 2);
  ctx.fill();

  if (player.trail.length > 0) {
    ctx.strokeStyle = 'rgba(255,77,255,0.7)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_RADIUS + 4 + Math.sin(time * 0.02), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
};

const drawParticles = (ctx: CanvasRenderingContext2D, particles: Particle[]): void => {
  for (const p of particles) {
    const alpha = p.lifeMs / p.maxLifeMs;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};
