import type { EngineState } from './types';

function key(x: number, y: number, cols: number): number {
  return y * cols + x;
}

export function renderVoltGrid(canvas: HTMLCanvasElement, state: EngineState, time: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const pixelWidth = Math.floor(width * dpr);
  const pixelHeight = Math.floor(height * dpr);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const cell = Math.min(width / state.cols, height / state.rows);
  const offsetX = (width - state.cols * cell) * 0.5;
  const offsetY = (height - state.rows * cell) * 0.5;
  state.cellSize = cell;

  const shakeX = (Math.random() - 0.5) * state.shake * 12;
  const shakeY = (Math.random() - 0.5) * state.shake * 12;
  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawBackground(ctx, width, height, time);

  for (let y = 0; y < state.rows; y += 1) {
    for (let x = 0; x < state.cols; x += 1) {
      const idx = key(x, y, state.cols);
      const px = offsetX + x * cell;
      const py = offsetY + y * cell;
      if (state.safe[idx] === 1) {
        ctx.fillStyle = `rgba(55, 218, 255, ${0.09 + ((x + y + time * 4) % 5) * 0.01})`;
        ctx.fillRect(px, py, cell + 0.3, cell + 0.3);
      } else {
        ctx.fillStyle = 'rgba(8, 13, 38, 0.92)';
        ctx.fillRect(px, py, cell + 0.3, cell + 0.3);
      }
      if (state.trail[idx] === 1) {
        ctx.fillStyle = 'rgba(255, 86, 200, 0.9)';
        ctx.fillRect(px, py, cell + 0.3, cell + 0.3);
      }
    }
  }

  drawHunters(ctx, state, offsetX, offsetY, cell, time);
  drawQix(ctx, state, offsetX, offsetY, cell, time);
  drawPlayer(ctx, state, offsetX, offsetY, cell, time);
  drawParticles(ctx, state, offsetX, offsetY, cell);
  drawFloatTexts(ctx, state, offsetX, offsetY, cell);

  if (state.pulse > 0) {
    ctx.fillStyle = `rgba(119, 241, 255, ${0.12 * state.pulse})`;
    ctx.fillRect(offsetX, offsetY, state.cols * cell, state.rows * cell);
  }

  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#040716');
  gradient.addColorStop(0.6, '#070b22');
  gradient.addColorStop(1, '#02040f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.24;
  ctx.strokeStyle = 'rgba(66, 127, 255, 0.3)';
  ctx.lineWidth = 1;
  const spacing = 28;
  for (let x = -spacing + ((time * 20) % spacing); x < width + spacing; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 24, height);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawQix(ctx: CanvasRenderingContext2D, state: EngineState, ox: number, oy: number, cell: number, time: number): void {
  const points = state.qixRibbon;
  if (points.length < 2) return;
  ctx.save();
  ctx.lineWidth = Math.max(1.5, cell * 0.9);
  ctx.strokeStyle = '#ff3ad8';
  ctx.shadowBlur = 20;
  ctx.shadowColor = '#ff3ad8';
  ctx.beginPath();
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const jitter = (Math.sin(time * 7 + i * 0.8) * 0.4) * cell;
    const x = ox + p.x * cell + jitter;
    const y = oy + p.y * cell - jitter;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const x = ox + state.qixPos.x * cell;
  const y = oy + state.qixPos.y * cell;
  const core = ctx.createRadialGradient(x, y, 0, x, y, cell * 3.4);
  core.addColorStop(0, '#ffffff');
  core.addColorStop(0.15, '#ff8cec');
  core.addColorStop(1, 'rgba(255, 0, 170, 0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(x, y, cell * 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHunters(ctx: CanvasRenderingContext2D, state: EngineState, ox: number, oy: number, cell: number, time: number): void {
  if (!state.boundary.length) return;
  ctx.save();
  for (const hunter of state.hunters) {
    const idx = Math.floor(hunter.t * (state.boundary.length - 1));
    const point = state.boundary[idx];
    if (!point) continue;
    const x = ox + point.x * cell;
    const y = oy + point.y * cell;
    const pulse = 0.7 + Math.sin(time * 12 + hunter.t * 30) * 0.3;
    ctx.fillStyle = `rgba(92, 255, 255, ${0.7 + pulse * 0.3})`;
    ctx.shadowColor = '#6ff9ff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(x, y, cell * (1 + pulse * 0.35), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: EngineState, ox: number, oy: number, cell: number, time: number): void {
  const x = ox + state.playerCell.x * cell;
  const y = oy + state.playerCell.y * cell;
  const size = cell * 2.2;
  const rot = time * 4;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#8ef9ff';
  ctx.shadowColor = '#8ef9ff';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.5, size * 0.55);
  ctx.lineTo(-size * 0.2, 0);
  ctx.lineTo(-size * 0.5, -size * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, state: EngineState, ox: number, oy: number, cell: number): void {
  ctx.save();
  for (const particle of state.particles) {
    const x = ox + particle.x * cell;
    const y = oy + particle.y * cell;
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(x, y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawFloatTexts(ctx: CanvasRenderingContext2D, state: EngineState, ox: number, oy: number, cell: number): void {
  ctx.save();
  ctx.font = '600 14px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  for (const text of state.floatTexts) {
    ctx.globalAlpha = Math.min(1, text.ttl);
    ctx.fillStyle = text.color;
    ctx.fillText(text.value, ox + text.x * cell, oy + text.y * cell);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
