import type { VoltGridEngine } from './engine';
import { VOID, BORDER, CAPTURED, TRAIL } from './types';

export function renderVoltGrid(canvas: HTMLCanvasElement, engine: VoltGridEngine, time: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const parent = canvas.parentElement;
  if (!parent) return;
  const w = parent.clientWidth;
  const h = parent.clientHeight;
  const pw = Math.floor(w * dpr);
  const ph = Math.floor(h * dpr);

  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const G = engine.gridSize;
  const size = Math.min(w, h);
  const ox = (w - size) / 2;
  const oy = (h - size) / 2;
  const cellW = size / G;
  const cellH = size / G;
  const t = time / 1000;

  // Background
  ctx.fillStyle = '#05050a';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(ox + engine.camera.shakeX, oy + engine.camera.shakeY);

  // Flash overlay
  if (engine.flashTimer > 0 && engine.flashColor) {
    ctx.globalAlpha = engine.flashTimer * 0.25;
    ctx.fillStyle = engine.flashColor;
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 1;
  }

  // Grid cells
  for (let y = 0; y < G; y++) {
    for (let x = 0; x < G; x++) {
      const cell = engine.grid[y * G + x];
      const px = x * cellW;
      const py = y * cellH;

      if (cell === VOID) {
        const noise = Math.sin(x * 0.5 + t * 0.3) * Math.cos(y * 0.5 + t * 0.2) * 0.5 + 0.5;
        const br = 6 + noise * 5;
        ctx.fillStyle = `rgb(${br},${br * 0.4},${br * 1.3})`;
        ctx.fillRect(px, py, cellW + 0.5, cellH + 0.5);
      } else if (cell === BORDER) {
        const pulse = Math.sin(t * 2 + x * 0.15 + y * 0.15) * 0.12 + 0.85;
        ctx.fillStyle = `rgba(0,140,255,${pulse * 0.75})`;
        ctx.fillRect(px, py, cellW + 0.5, cellH + 0.5);
      } else if (cell === CAPTURED) {
        const isAnim = engine.captureAnimTimer > 0 &&
          engine.captureAnimCells.some(c => c.x === x && c.y === y);
        if (isAnim) {
          const flash = Math.sin(engine.captureAnimTimer * 20) * 0.5 + 0.5;
          ctx.fillStyle = `rgba(0,255,200,${0.35 + flash * 0.4})`;
        } else {
          ctx.fillStyle = 'rgba(0,200,180,0.22)';
        }
        ctx.fillRect(px, py, cellW + 0.5, cellH + 0.5);
        ctx.strokeStyle = 'rgba(0,200,180,0.06)';
        ctx.strokeRect(px, py, cellW, cellH);
      } else if (cell === TRAIL) {
        const trailPulse = Math.sin(t * 8 + x + y) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255,0,255,${trailPulse})`;
        ctx.shadowColor = '#f0f';
        ctx.shadowBlur = 5;
        ctx.fillRect(px, py, cellW + 0.5, cellH + 0.5);
        ctx.shadowBlur = 0;
      }
    }
  }

  // Orbs
  for (const orb of engine.orbs) {
    const orbX = orb.x * cellW + cellW / 2;
    const orbY = orb.y * cellH + cellH / 2;
    const pulse = Math.sin(t * 5 + orb.hue) * 0.3 + 0.7;
    const radius = cellW * 1.1 * pulse;
    const color = `hsl(${orb.hue}, 100%, 62%)`;

    // Glow
    const grd = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, radius * 2.5);
    grd.addColorStop(0, color);
    grd.addColorStop(0.4, `hsla(${orb.hue}, 100%, 62%, 0.5)`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(orbX, orbY, radius * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = '#fff';
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(orbX, orbY, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(orbX, orbY, radius * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Fuse (Shock Ball)
  const fusePos = engine.getFusePosition();
  if (fusePos && engine.fuse) {
    const fx = fusePos.x * cellW + cellW / 2;
    const fy = fusePos.y * cellH + cellH / 2;
    const fuseProgress = engine.fuseTimer / 2000;
    const fuseFlash = Math.sin(t * 20) * 0.5 + 0.5;

    // Timer ring
    ctx.strokeStyle = `rgba(255,${Math.floor(255 * (1 - fuseProgress))},0,${0.5 + fuseFlash * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fx, fy, cellW * 2, -Math.PI / 2, -Math.PI / 2 + (1 - fuseProgress) * Math.PI * 2);
    ctx.stroke();

    // Ball
    ctx.fillStyle = `rgb(255,${Math.floor(255 * (1 - fuseProgress))},0)`;
    ctx.shadowColor = '#f80';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(fx, fy, cellW * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Player (Neon Ghost)
  if (engine.phase !== 'dead' && engine.phase !== 'gameover') {
    const px = engine.player.x * cellW + cellW / 2;
    const py = engine.player.y * cellH + cellH / 2;
    const pPulse = Math.sin(t * 4) * 0.2 + 0.8;
    const pColor = engine.drawing ? '#f0f' : '#0ff';

    // Glow
    const pGrd = ctx.createRadialGradient(px, py, 0, px, py, cellW * 2.5);
    pGrd.addColorStop(0, pColor + '66');
    pGrd.addColorStop(1, 'transparent');
    ctx.fillStyle = pGrd;
    ctx.beginPath();
    ctx.arc(px, py, cellW * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Ghost body
    ctx.fillStyle = pColor;
    ctx.shadowColor = pColor;
    ctx.shadowBlur = 8;
    const r = cellW * 0.65 * pPulse;
    ctx.beginPath();
    ctx.arc(px, py - r * 0.15, r, Math.PI, 0);
    // Wavy bottom
    const waves = 3;
    for (let i = 0; i <= waves; i++) {
      const wx = px - r + (2 * r * i) / waves;
      const wy = py + r * 0.7 + Math.sin(t * 8 + i * 2) * r * 0.2;
      if (i === 0) ctx.lineTo(wx, py + r * 0.45);
      ctx.quadraticCurveTo(wx + r / waves, wy, wx + (2 * r) / waves, py + r * 0.45);
    }
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#000';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(px - r * 0.28, py - r * 0.12, r * 0.16, 0, Math.PI * 2);
    ctx.arc(px + r * 0.28, py - r * 0.12, r * 0.16, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px - r * 0.22, py - r * 0.18, r * 0.06, 0, Math.PI * 2);
    ctx.arc(px + r * 0.34, py - r * 0.18, r * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  // Particles
  for (const p of engine.particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 4;
    ctx.fillRect(p.x * cellW - p.size / 2, p.y * cellH - p.size / 2, p.size, p.size);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;

  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.03)';
  for (let sy = 0; sy < size; sy += 3) {
    ctx.fillRect(0, sy, size, 1);
  }

  ctx.restore();
}
