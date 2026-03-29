import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  GRID_CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  PALETTE,
  PLAYER_RADIUS,
} from './constants';
import type { GameState, Particle } from './types';
import { CELL_CLAIMED, CELL_DRAWING } from './types';
import { cellCenter } from './utils';

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
  drawGridCells(ctx, state.captured, time);
  state.orbs.forEach((orb) => drawOrb(ctx, orb, time));
  drawSparks(ctx, state, time);
  drawShockwave(ctx, state, time);
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

const drawGridCells = (ctx: CanvasRenderingContext2D, grid: Uint8Array, time: number): void => {
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const idx = y * GRID_COLS + x;
      const state = grid[idx];
      const px = x * GRID_CELL_SIZE;
      const py = y * GRID_CELL_SIZE;
      if (state === CELL_CLAIMED) {
        ctx.fillStyle = 'rgba(91, 240, 255, 0.15)';
        ctx.fillRect(px, py, GRID_CELL_SIZE, GRID_CELL_SIZE);
        if ((x + y + Math.floor(time * 0.008)) % 5 === 0) {
          ctx.fillStyle = 'rgba(180,255,255,0.18)';
          ctx.fillRect(px, py, GRID_CELL_SIZE, GRID_CELL_SIZE * 0.35);
        }
      } else if (state === CELL_DRAWING) {
        ctx.fillStyle = 'rgba(98, 255, 255, 0.85)';
        ctx.fillRect(px, py, GRID_CELL_SIZE, GRID_CELL_SIZE);
      }
    }
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
  ctx.restore();
};

const drawPlayer = (ctx: CanvasRenderingContext2D, state: GameState, time: number): void => {
  const { player } = state;
  if (player.invulnMs > 0 && Math.floor(time / 90) % 2 === 0) return;

  const p = cellCenter(player.pos.x, player.pos.y);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(player.heading || -Math.PI / 2);

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
  ctx.restore();
};

const drawSparks = (ctx: CanvasRenderingContext2D, state: GameState, time: number): void => {
  state.sparks.forEach((spark, i) => {
    const perimeterCell = state.perimeter[(Math.floor(spark.perimeterPos + i * 3) + state.perimeter.length) % Math.max(1, state.perimeter.length)] ?? 0;
    const cell = { x: perimeterCell % GRID_COLS, y: Math.floor(perimeterCell / GRID_COLS) };
    const pos = cellCenter(cell.x, cell.y);
    const flicker = 0.8 + Math.sin(time * 0.03 + i) * 0.2;
    ctx.shadowColor = PALETTE.sparkGlow;
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ff2d55';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, spark.radius * flicker, 0, Math.PI * 2);
    ctx.fill();
    spark.perimeterPos += spark.speed * 0.016 * spark.direction * 0.06;
    ctx.shadowBlur = 0;
  });
};

const drawShockwave = (ctx: CanvasRenderingContext2D, state: GameState, time: number): void => {
  if (!state.shockwave) return;
  const jitter = 4 + Math.sin(time * 0.04) * 2;
  ctx.shadowColor = 'rgba(255,255,255,0.95)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = 'rgba(167, 240, 255, 0.95)';
  ctx.beginPath();
  ctx.arc(state.shockwave.pos.x, state.shockwave.pos.y, 7 + jitter * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
};

const drawParticles = (ctx: CanvasRenderingContext2D, particles: Particle[]): void => {
  particles.forEach((particle) => {
    const alpha = particle.lifeMs / particle.maxLifeMs;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.pos.x, particle.pos.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
};
