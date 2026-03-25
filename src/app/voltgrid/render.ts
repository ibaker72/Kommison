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
  const dprScale = Math.min(canvasWidth / ARENA_WIDTH, canvasHeight / ARENA_HEIGHT);
  const ox = (canvasWidth - ARENA_WIDTH * dprScale) / 2;
  const oy = (canvasHeight - ARENA_HEIGHT * dprScale) / 2;

  ctx.save();
  ctx.fillStyle = PALETTE.pageBg;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const shake = state.shakeMs > 0 ? (state.shakeMs / 220) * 3 : 0;
  const sx = (Math.random() - 0.5) * shake;
  const sy = (Math.random() - 0.5) * shake;

  ctx.translate(ox + sx, oy + sy);
  ctx.scale(dprScale, dprScale);

  drawArena(ctx, time);
  drawCaptured(ctx, state.captured);
  drawTrail(ctx, state, time);
  drawOrb(ctx, state, time);
  drawChaser(ctx, state, time);
  drawPlayer(ctx, state, time);
  drawParticles(ctx, state.particles);

  ctx.restore();
};

const drawArena = (ctx: CanvasRenderingContext2D, time: number): void => {
  const g = ctx.createLinearGradient(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  g.addColorStop(0, '#090d22');
  g.addColorStop(1, '#09112d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5 + Math.sin(time * 0.0015) * 0.1;
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

const drawCaptured = (ctx: CanvasRenderingContext2D, captured: Uint8Array): void => {
  ctx.fillStyle = PALETTE.capturedFill;
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if (captured[y * GRID_COLS + x]) {
        ctx.fillRect(x * GRID_CELL_SIZE, y * GRID_CELL_SIZE, GRID_CELL_SIZE, GRID_CELL_SIZE);
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
  const pulse = 1 + Math.sin(time * 0.01) * 0.05;
  ctx.shadowColor = PALETTE.orbGlow;
  ctx.shadowBlur = 20;
  const grad = ctx.createRadialGradient(orb.pos.x, orb.pos.y, 0, orb.pos.x, orb.pos.y, orb.radius * 2.4);
  grad.addColorStop(0, '#fff9d5');
  grad.addColorStop(0.25, PALETTE.orb);
  grad.addColorStop(1, 'rgba(255,207,82,0.0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(orb.pos.x, orb.pos.y, orb.radius * 2.4 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
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

  // Road-runner-inspired neon mascot: long beak + crest + trailing legs silhouette.
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
