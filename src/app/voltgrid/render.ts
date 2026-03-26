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
  const scaleX = canvasWidth / ARENA_WIDTH;
  const scaleY = canvasHeight / ARENA_HEIGHT;

  ctx.save();
  drawFullscreenBackdrop(ctx, canvasWidth, canvasHeight, time);

  const shake = state.shakeMs > 0 ? (state.shakeMs / 220) * 3 : 0;
  const sx = (Math.random() - 0.5) * shake;
  const sy = (Math.random() - 0.5) * shake;

  ctx.translate(sx, sy);
  ctx.scale(scaleX, scaleY);

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
  const g = ctx.createRadialGradient(width * 0.5, height * 0.5, 60, width * 0.5, height * 0.5, Math.max(width, height));
  g.addColorStop(0, '#0e1b42');
  g.addColorStop(0.55, '#070f28');
  g.addColorStop(1, '#030612');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  const spacing = Math.max(22, Math.min(width, height) * 0.045);
  const driftX = (time * 0.012) % spacing;
  const driftY = (time * 0.016) % spacing;

  ctx.strokeStyle = 'rgba(74, 196, 255, 0.09)';
  ctx.lineWidth = 1;
  for (let x = -spacing + driftX; x < width + spacing; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = -spacing + driftY; y < height + spacing; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const horizon = ctx.createLinearGradient(0, height * 0.58, 0, height);
  horizon.addColorStop(0, 'rgba(130, 90, 255, 0)');
  horizon.addColorStop(1, 'rgba(130, 90, 255, 0.14)');
  ctx.fillStyle = horizon;
  ctx.fillRect(0, height * 0.58, width, height * 0.42);
};

const drawArena = (ctx: CanvasRenderingContext2D, time: number): void => {
  const g = ctx.createLinearGradient(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  g.addColorStop(0, '#06122f');
  g.addColorStop(0.5, '#08193f');
  g.addColorStop(1, '#040d24');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.45 + Math.sin(time * 0.0012) * 0.1;

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

  ctx.globalAlpha = 1;
  const sweep = (Math.sin(time * 0.0019) + 1) * 0.5;
  const sweepY = ARENA_HEIGHT * sweep;
  const sweepGrad = ctx.createLinearGradient(0, sweepY - 42, 0, sweepY + 42);
  sweepGrad.addColorStop(0, 'rgba(108, 212, 255, 0)');
  sweepGrad.addColorStop(0.5, 'rgba(108, 212, 255, 0.15)');
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

      const fill = ctx.createLinearGradient(px, py, px + GRID_CELL_SIZE, py + GRID_CELL_SIZE);
      fill.addColorStop(0, 'rgba(65, 180, 230, 0.34)');
      fill.addColorStop(1, 'rgba(124, 255, 244, 0.16)');
      ctx.fillStyle = fill;
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
  ctx.shadowColor = state.chaser ? PALETTE.chaserGlow : PALETTE.trailGlow;
  ctx.strokeStyle = state.chaser ? PALETTE.infectedTrail : PALETTE.trail;

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

const drawOrb = (ctx: CanvasRenderingContext2D, state: GameState, time: number): void => {
  const { orb } = state;
  const pulse = 1 + Math.sin(time * 0.007) * 0.08;
  const r = orb.radius;

  ctx.save();
  ctx.translate(orb.pos.x, orb.pos.y);

  const corona = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 2.6 * pulse);
  corona.addColorStop(0, 'rgba(178, 238, 255, 0.7)');
  corona.addColorStop(0.5, 'rgba(70, 194, 255, 0.26)');
  corona.addColorStop(1, 'rgba(95, 70, 255, 0)');
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.6 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = 'rgba(125, 211, 252, 0.95)';
  ctx.shadowBlur = 18;
  const shell = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.2, 0, 0, r * 1.15);
  shell.addColorStop(0, '#effbff');
  shell.addColorStop(0.36, '#9cefff');
  shell.addColorStop(0.7, '#3ea7ff');
  shell.addColorStop(1, '#6946ff');
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const a = time * 0.005 + i * (Math.PI / 3);
    const wobble = Math.sin(time * 0.011 + i * 1.7) * r * 0.22;
    ctx.strokeStyle = `rgba(186, 245, 255, ${0.45 + (i % 3) * 0.15})`;
    ctx.lineWidth = 1.2 + (i % 2) * 0.7;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (r * 0.15 + wobble), Math.sin(a) * (r * 0.15 + wobble));
    ctx.quadraticCurveTo(
      Math.cos(a + 1.2) * (r * 0.6),
      Math.sin(a + 1.2) * (r * 0.6),
      Math.cos(a + 2.2) * (r * 0.82),
      Math.sin(a + 2.2) * (r * 0.82),
    );
    ctx.stroke();
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(215, 248, 255, 0.85)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.02, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(250, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(-r * 0.4, -r * 0.45, r * 0.22, 0, Math.PI * 2);
  ctx.fill();

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

  const wiggle = Math.sin(time * 0.015) * 0.45;
  const faceR = PLAYER_RADIUS * 0.82;

  ctx.shadowColor = 'rgba(120, 255, 234, 0.95)';
  ctx.shadowBlur = 18;
  const aura = ctx.createRadialGradient(0, 0, faceR * 0.4, 0, 0, faceR * 1.8);
  aura.addColorStop(0, 'rgba(145, 255, 233, 0.65)');
  aura.addColorStop(1, 'rgba(145, 255, 233, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, faceR * 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  const face = ctx.createRadialGradient(-2, -3, 1, 0, 0, faceR);
  face.addColorStop(0, '#faffff');
  face.addColorStop(0.45, '#98ffe3');
  face.addColorStop(1, '#16d7b9');
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(0, 0, faceR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#05354e';
  ctx.beginPath();
  ctx.ellipse(-3.2, -1.6, 1.45, 2.15, -0.2 + wiggle * 0.05, 0, Math.PI * 2);
  ctx.ellipse(3.6, -2, 1.25, 2.15, 0.26 + wiggle * 0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#062130';
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  ctx.moveTo(-6.1, -5.8);
  ctx.lineTo(-1.1, -5.4 + wiggle * 0.4);
  ctx.moveTo(1.4, -5.5 + wiggle * 0.4);
  ctx.lineTo(6.2, -6.4);
  ctx.stroke();

  ctx.strokeStyle = '#085568';
  ctx.lineWidth = 1.25;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0.8, 2.7, 3.8, 0.24, 2.58);
  ctx.stroke();

  ctx.fillStyle = '#7a3df5';
  ctx.beginPath();
  ctx.moveTo(faceR * 0.76, -2);
  ctx.lineTo(faceR * 1.45, -5.2);
  ctx.lineTo(faceR * 1.45, 0.8);
  ctx.closePath();
  ctx.fill();

  if (player.trail.length > 0) {
    ctx.strokeStyle = 'rgba(255,77,255,0.72)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, faceR + 3.4 + Math.sin(time * 0.02), 0, Math.PI * 2);
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
