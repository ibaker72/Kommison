import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  BORDER_THICKNESS,
  GRID_CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  PALETTE,
  PLAYER_RADIUS,
} from './constants';
import { sparkPosition } from './gameLoop';
import type { GameState, Particle } from './types';

export const renderGame = (
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasWidth: number,
  canvasHeight: number,
  time: number,
): void => {
  const scaleX = canvasWidth / ARENA_WIDTH;
  const scaleY = canvasHeight / ARENA_HEIGHT;

  ctx.save();
  const shake = state.shakeMs > 0 ? (state.shakeMs / 220) * 3 : 0;
  ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  ctx.scale(scaleX, scaleY);

  drawArenaBackdrop(ctx, time);
  drawArena(ctx, time);
  drawCaptured(ctx, state.captured, time);
  drawTrail(ctx, state, time);
  state.orbs.forEach((orb) => drawOrb(ctx, orb, time));
  state.sparks.forEach((spark) => drawSpark(ctx, spark, time));
  drawPlayer(ctx, state, time);
  drawParticles(ctx, state.particles);

  ctx.restore();
};

const drawArenaBackdrop = (ctx: CanvasRenderingContext2D, time: number): void => {
  const g = ctx.createRadialGradient(ARENA_WIDTH * 0.5, ARENA_HEIGHT * 0.5, 60, ARENA_WIDTH * 0.5, ARENA_HEIGHT * 0.5, Math.max(ARENA_WIDTH, ARENA_HEIGHT));
  g.addColorStop(0, '#12193e');
  g.addColorStop(0.5, '#090f24');
  g.addColorStop(1, '#050510');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  const spacing = Math.max(22, Math.min(ARENA_WIDTH, ARENA_HEIGHT) * 0.045);
  const driftX = (time * 0.01) % spacing;
  const driftY = (time * 0.013) % spacing;

  ctx.strokeStyle = 'rgba(74, 196, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.6 + Math.sin(time * 0.0015) * 0.1;
  for (let x = -spacing + driftX; x < ARENA_WIDTH + spacing; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ARENA_HEIGHT);
    ctx.stroke();
  }
  for (let y = -spacing + driftY; y < ARENA_HEIGHT + spacing; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA_WIDTH, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

const drawArena = (ctx: CanvasRenderingContext2D, time: number): void => {
  ctx.fillStyle = PALETTE.pageBg;
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  for (let x = GRID_CELL_SIZE; x < ARENA_WIDTH; x += GRID_CELL_SIZE * 4) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ARENA_HEIGHT);
    ctx.stroke();
  }
  for (let y = GRID_CELL_SIZE; y < ARENA_HEIGHT; y += GRID_CELL_SIZE * 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA_WIDTH, y);
    ctx.stroke();
  }

  const sweep = (Math.sin(time * 0.0019) + 1) * 0.5;
  const sweepY = ARENA_HEIGHT * sweep;
  const sweepGrad = ctx.createLinearGradient(0, sweepY - 42, 0, sweepY + 42);
  sweepGrad.addColorStop(0, 'rgba(108, 212, 255, 0)');
  sweepGrad.addColorStop(0.5, 'rgba(108, 212, 255, 0.11)');
  sweepGrad.addColorStop(1, 'rgba(108, 212, 255, 0)');
  ctx.fillStyle = sweepGrad;
  ctx.fillRect(0, sweepY - 42, ARENA_WIDTH, 84);

  ctx.shadowBlur = 20;
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
      if ((x + y + Math.floor(time * 0.005)) % 6 === 0) {
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
  ctx.shadowBlur = 12;
  ctx.shadowColor = PALETTE.trailGlow;
  ctx.strokeStyle = PALETTE.trail;

  ctx.beginPath();
  ctx.moveTo(trail[0].x, trail[0].y);
  for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  const step = 9;
  const offset = Math.floor((time * 0.025) % step);
  for (let i = offset; i < trail.length; i += step) {
    ctx.beginPath();
    ctx.arc(trail[i].x, trail[i].y, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawOrb = (ctx: CanvasRenderingContext2D, orb: GameState['orbs'][number], time: number): void => {
  for (let i = 0; i < orb.trail.length; i++) {
    const t = i / Math.max(1, orb.trail.length - 1);
    const p = orb.trail[i];
    ctx.globalAlpha = 0.08 + t * 0.22;
    ctx.fillStyle = 'rgba(255,110,255,1)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, orb.radius * (0.3 + t * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const pulse = 1 + Math.sin(time * 0.01) * 0.08;
  const r = orb.radius;
  ctx.save();
  ctx.translate(orb.pos.x, orb.pos.y);

  const corona = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2.6 * pulse);
  corona.addColorStop(0, 'rgba(255, 221, 255, 0.72)');
  corona.addColorStop(0.4, 'rgba(255, 110, 255, 0.38)');
  corona.addColorStop(1, 'rgba(255, 65, 255, 0)');
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.6 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = PALETTE.orbGlow;
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#ff66f9';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,245,255,0.9)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 5; i++) {
    const a = time * 0.006 + i * 1.2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25);
    ctx.lineTo(Math.cos(a + 1.5) * r * 0.95, Math.sin(a + 1.5) * r * 0.95);
    ctx.stroke();
  }

  ctx.restore();
};

const drawSpark = (ctx: CanvasRenderingContext2D, spark: GameState['sparks'][number], time: number): void => {
  const pos = sparkPosition(spark.perimeterPos);
  const flicker = 0.8 + Math.sin(time * 0.03 + spark.perimeterPos * 0.02) * 0.2;

  ctx.shadowColor = PALETTE.sparkGlow;
  ctx.shadowBlur = 18;
  ctx.fillStyle = PALETTE.spark;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, spark.radius * flicker, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255,210,220,0.9)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(pos.x - 4, pos.y - 1);
  ctx.lineTo(pos.x, pos.y - 4);
  ctx.lineTo(pos.x + 4, pos.y + 1);
  ctx.lineTo(pos.x - 2, pos.y + 4);
  ctx.stroke();
};

const drawPlayer = (ctx: CanvasRenderingContext2D, state: GameState, time: number): void => {
  const { player } = state;
  if (player.invulnMs > 0 && Math.floor(time / 90) % 2 === 0) return;

  ctx.save();
  ctx.translate(player.pos.x, player.pos.y);
  ctx.rotate(player.heading || -Math.PI / 2);

  if (player.trail.length > 0) {
    ctx.shadowColor = 'rgba(0,255,255,0.7)';
    ctx.shadowBlur = 16;
    for (let i = 0; i < 4; i++) {
      const a = 1 - i / 4;
      ctx.fillStyle = `rgba(0, 255, 255, ${a * 0.24})`;
      ctx.beginPath();
      ctx.moveTo(-PLAYER_RADIUS * (0.8 + i * 0.2), 0);
      ctx.lineTo(-PLAYER_RADIUS * (1.8 + i * 0.35), -2.5);
      ctx.lineTo(-PLAYER_RADIUS * (1.8 + i * 0.35), 2.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  ctx.shadowColor = 'rgba(99, 255, 255, 0.95)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#6ef8ff';
  ctx.beginPath();
  ctx.moveTo(PLAYER_RADIUS, 0);
  ctx.lineTo(0, -PLAYER_RADIUS * 0.78);
  ctx.lineTo(-PLAYER_RADIUS * 0.88, 0);
  ctx.lineTo(0, PLAYER_RADIUS * 0.78);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(210,255,255,0.95)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

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
