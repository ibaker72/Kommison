'use client';

import { useEffect, useRef, useState } from 'react';

type Dir = 'up' | 'down' | 'left' | 'right' | 'none';

type Orb = { x: number; y: number; vx: number; vy: number; alive: boolean };
type Spark = { t: number; speed: number };

type Joystick = {
  active: boolean;
  id: number | null;
  baseX: number;
  baseY: number;
  knobX: number;
  knobY: number;
};

type Game = {
  w: number;
  h: number;
  dpr: number;
  cell: number;
  cols: number;
  rows: number;
  safe: Uint8Array;
  trail: Uint8Array;
  trailList: number[];
  trailOrder: Int32Array;
  player: { x: number; y: number };
  dir: Dir;
  drawing: boolean;
  moveAcc: number;
  playerSpeed: number;
  level: number;
  score: number;
  lives: number;
  targetPct: number;
  capturedPct: number;
  phase: 'playing' | 'levelup' | 'gameover';
  levelTimer: number;
  orbs: Orb[];
  sparks: Spark[];
  fuseActive: boolean;
  fusePos: number;
  fuseSpeed: number;
  joystick: Joystick;
};

const SPACE = '#040716';
const CYAN = '#1af5ff';
const MAGENTA = '#ff2ae0';
const HOT = '#ffd84c';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const idx = (x: number, y: number, cols: number) => y * cols + x;

const resolveSparkPos = (t: number, cols: number, rows: number) => {
  const perimeter = (cols - 1) * 2 + (rows - 1) * 2;
  let p = ((t % perimeter) + perimeter) % perimeter;

  if (p < cols - 1) return { x: p, y: 0 };
  p -= cols - 1;
  if (p < rows - 1) return { x: cols - 1, y: p };
  p -= rows - 1;
  if (p < cols - 1) return { x: cols - 1 - p, y: rows - 1 };
  p -= cols - 1;
  return { x: 0, y: rows - 1 - p };
};

export default function VoltGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const gameRef = useRef<Game | null>(null);

  const [hud, setHud] = useState({ level: 1, score: 0, lives: 3, target: 75, captured: 0, phase: 'playing' as Game['phase'] });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const g: Game = {
      w: window.innerWidth,
      h: window.innerHeight,
      dpr: window.devicePixelRatio || 1,
      cell: 10,
      cols: 0,
      rows: 0,
      safe: new Uint8Array(0),
      trail: new Uint8Array(0),
      trailList: [],
      trailOrder: new Int32Array(0),
      player: { x: 0, y: 0 },
      dir: 'none',
      drawing: false,
      moveAcc: 0,
      playerSpeed: 20,
      level: 1,
      score: 0,
      lives: 3,
      targetPct: 75,
      capturedPct: 0,
      phase: 'playing',
      levelTimer: 0,
      orbs: [],
      sparks: [],
      fuseActive: false,
      fusePos: 0,
      fuseSpeed: 42,
      joystick: { active: false, id: null, baseX: 0, baseY: 0, knobX: 0, knobY: 0 },
    };
    gameRef.current = g;

    const buildLevel = (level: number) => {
      g.level = level;
      g.phase = 'playing';
      g.levelTimer = 0;
      g.cell = clamp(Math.floor(Math.min(g.w, g.h) / 78), 7, 15);
      g.cols = Math.max(36, Math.floor(g.w / g.cell));
      g.rows = Math.max(24, Math.floor(g.h / g.cell));

      g.safe = new Uint8Array(g.cols * g.rows);
      g.trail = new Uint8Array(g.cols * g.rows);
      g.trailOrder = new Int32Array(g.cols * g.rows).fill(-1);
      g.trailList = [];

      for (let x = 0; x < g.cols; x++) {
        g.safe[idx(x, 0, g.cols)] = 1;
        g.safe[idx(x, g.rows - 1, g.cols)] = 1;
      }
      for (let y = 0; y < g.rows; y++) {
        g.safe[idx(0, y, g.cols)] = 1;
        g.safe[idx(g.cols - 1, y, g.cols)] = 1;
      }

      g.player = { x: 0, y: Math.floor(g.rows / 2) };
      g.dir = 'none';
      g.drawing = false;
      g.moveAcc = 0;
      g.playerSpeed = 24 + level * 1.65;
      g.targetPct = Math.min(90, 75 + (level - 1) * 2);
      g.capturedPct = 0;
      g.fuseActive = false;
      g.fusePos = 0;
      g.fuseSpeed = 40 + level * 6;

      const orbCount = level;
      const orbSpeed = 70 + level * 12;
      g.orbs = [];
      for (let i = 0; i < orbCount; i++) {
        let ox = Math.floor(g.cols * (0.25 + 0.5 * Math.random()));
        let oy = Math.floor(g.rows * (0.25 + 0.5 * Math.random()));
        if (g.safe[idx(ox, oy, g.cols)]) {
          ox = Math.floor(g.cols / 2);
          oy = Math.floor(g.rows / 2);
        }
        const a = Math.random() * Math.PI * 2;
        g.orbs.push({
          x: (ox + 0.5) * g.cell,
          y: (oy + 0.5) * g.cell,
          vx: Math.cos(a) * orbSpeed,
          vy: Math.sin(a) * orbSpeed,
          alive: true,
        });
      }

      g.sparks = Array.from({ length: Math.min(3, 1 + Math.floor((level - 1) / 3)) }, (_, i) => ({
        t: (i * ((g.cols - 1) * 2 + (g.rows - 1) * 2)) / Math.max(1, Math.min(3, 1 + Math.floor((level - 1) / 3))),
        speed: 0.14 + level * 0.024,
      }));
    };

    const resetTrail = () => {
      g.trail.fill(0);
      g.trailOrder.fill(-1);
      g.trailList.length = 0;
      g.drawing = false;
      g.fuseActive = false;
      g.fusePos = 0;
    };

    const loseLife = () => {
      g.lives -= 1;
      g.player = { x: 0, y: Math.floor(g.rows / 2) };
      g.dir = 'none';
      resetTrail();
      if (g.lives <= 0) g.phase = 'gameover';
    };

    const capture = () => {
      if (g.trailList.length < 2) {
        resetTrail();
        return;
      }

      for (const ti of g.trailList) g.safe[ti] = 1;

      const visited = new Uint8Array(g.cols * g.rows);
      const queue = new Int32Array(g.cols * g.rows);
      let qh = 0;
      let qt = 0;

      const push = (id: number) => {
        if (id < 0 || id >= visited.length) return;
        if (visited[id] || g.safe[id] || g.trail[id]) return;
        visited[id] = 1;
        queue[qt++] = id;
      };

      // Robust void-preservation flood fill: seed from every live orb so only orb-connected void remains uncaptured.
      for (const orb of g.orbs) {
        if (!orb.alive) continue;
        const ox = clamp(Math.floor(orb.x / g.cell), 1, g.cols - 2);
        const oy = clamp(Math.floor(orb.y / g.cell), 1, g.rows - 2);
        push(idx(ox, oy, g.cols));
      }

      while (qh < qt) {
        const cur = queue[qh++];
        const x = cur % g.cols;
        const y = (cur / g.cols) | 0;
        if (x > 1) push(cur - 1);
        if (x < g.cols - 2) push(cur + 1);
        if (y > 1) push(cur - g.cols);
        if (y < g.rows - 2) push(cur + g.cols);
      }

      let filledCells = 0;
      for (let y = 1; y < g.rows - 1; y++) {
        for (let x = 1; x < g.cols - 1; x++) {
          const id = idx(x, y, g.cols);
          if (!g.safe[id] && !visited[id]) {
            g.safe[id] = 1;
            filledCells += 1;
          }
        }
      }

      let containedKills = 0;
      for (const orb of g.orbs) {
        if (!orb.alive) continue;
        const ox = clamp(Math.floor(orb.x / g.cell), 1, g.cols - 2);
        const oy = clamp(Math.floor(orb.y / g.cell), 1, g.rows - 2);
        const id = idx(ox, oy, g.cols);
        if (g.safe[id] && !visited[id]) {
          orb.alive = false;
          containedKills += 1;
        }
      }
      g.orbs = g.orbs.filter(o => o.alive);

      const totalVoid = (g.cols - 2) * (g.rows - 2);
      let safeInside = 0;
      for (let y = 1; y < g.rows - 1; y++) {
        for (let x = 1; x < g.cols - 1; x++) safeInside += g.safe[idx(x, y, g.cols)] ? 1 : 0;
      }

      g.capturedPct = Math.floor((safeInside / Math.max(1, totalVoid)) * 100);
      g.score += filledCells * 6 + containedKills * 6000;
      resetTrail();

      if (g.capturedPct >= g.targetPct) {
        g.phase = 'levelup';
        g.levelTimer = 1.15;
        g.score += 1000 + g.level * 350;
      }
    };

    const playerStep = () => {
      if (g.phase !== 'playing' || g.dir === 'none') return;
      let nx = g.player.x;
      let ny = g.player.y;
      if (g.dir === 'left') nx -= 1;
      if (g.dir === 'right') nx += 1;
      if (g.dir === 'up') ny -= 1;
      if (g.dir === 'down') ny += 1;

      nx = clamp(nx, 0, g.cols - 1);
      ny = clamp(ny, 0, g.rows - 1);
      const ni = idx(nx, ny, g.cols);
      const onSafe = g.safe[ni] === 1;

      if (!g.drawing && !onSafe) g.drawing = true;

      if (g.drawing) {
        if (!g.trail[ni]) {
          g.trail[ni] = 1;
          g.trailOrder[ni] = g.trailList.length;
          g.trailList.push(ni);
        }
        if (onSafe && g.trailList.length > 2) capture();
      }

      g.player.x = nx;
      g.player.y = ny;
    };

    const updateOrbs = (dt: number) => {
      const px = (g.player.x + 0.5) * g.cell;
      const py = (g.player.y + 0.5) * g.cell;
      const pr2 = (g.cell * 0.45) ** 2;

      for (const orb of g.orbs) {
        if (!orb.alive) continue;
        const r = g.cell * 0.34;
        let nx = orb.x + orb.vx * dt;
        let ny = orb.y + orb.vy * dt;

        const blocked = (tx: number, ty: number) => {
          const cx = clamp(Math.floor(tx / g.cell), 0, g.cols - 1);
          const cy = clamp(Math.floor(ty / g.cell), 0, g.rows - 1);
          const id = idx(cx, cy, g.cols);
          return g.safe[id] === 1;
        };

        if (blocked(nx + Math.sign(orb.vx || 1) * r, orb.y)) {
          orb.vx *= -1;
          nx = orb.x + orb.vx * dt;
        }
        if (blocked(orb.x, ny + Math.sign(orb.vy || 1) * r)) {
          orb.vy *= -1;
          ny = orb.y + orb.vy * dt;
        }

        orb.x = clamp(nx, g.cell, g.w - g.cell);
        orb.y = clamp(ny, g.cell, g.h - g.cell);

        const cx = clamp(Math.floor(orb.x / g.cell), 0, g.cols - 1);
        const cy = clamp(Math.floor(orb.y / g.cell), 0, g.rows - 1);
        const id = idx(cx, cy, g.cols);

        if (g.trail[id] && !g.fuseActive && g.trailList.length > 1) {
          const start = g.trailOrder[id];
          if (start >= 0) {
            g.fuseActive = true;
            g.fusePos = start;
          }
        }

        if ((orb.x - px) ** 2 + (orb.y - py) ** 2 <= pr2) {
          loseLife();
          return;
        }
      }
    };

    const updateSparks = (dt: number) => {
      const perimeter = (g.cols - 1) * 2 + (g.rows - 1) * 2;
      for (const spark of g.sparks) {
        spark.t = (spark.t + spark.speed * dt * perimeter) % perimeter;
        const s = resolveSparkPos(spark.t, g.cols, g.rows);
        if (Math.abs(g.player.x - s.x) <= 0.35 && Math.abs(g.player.y - s.y) <= 0.35) {
          loseLife();
          return;
        }
      }
    };

    const updateFuse = (dt: number) => {
      if (!g.fuseActive || g.trailList.length < 2) return;
      g.fusePos += dt * g.fuseSpeed;
      if (g.fusePos >= g.trailList.length - 1) loseLife();
    };

    const draw = (ctx: CanvasRenderingContext2D, ts: number) => {
      ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
      ctx.clearRect(0, 0, g.w, g.h);
      ctx.fillStyle = SPACE;
      ctx.fillRect(0, 0, g.w, g.h);

      for (let y = 0; y < g.rows; y++) {
        for (let x = 0; x < g.cols; x++) {
          if (!g.safe[idx(x, y, g.cols)]) continue;
          const a = ((x + y) & 1) === 0 ? 0.16 : 0.08;
          ctx.fillStyle = `rgba(26,245,255,${a})`;
          ctx.fillRect(x * g.cell, y * g.cell, g.cell, g.cell);
        }
      }

      // Captured neon-grid overlay
      ctx.strokeStyle = 'rgba(255,42,224,0.16)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= g.cols; x += 3) {
        ctx.beginPath();
        ctx.moveTo(x * g.cell, 0);
        ctx.lineTo(x * g.cell, g.rows * g.cell);
        ctx.stroke();
      }
      for (let y = 0; y <= g.rows; y += 3) {
        ctx.beginPath();
        ctx.moveTo(0, y * g.cell);
        ctx.lineTo(g.cols * g.cell, y * g.cell);
        ctx.stroke();
      }

      ctx.strokeStyle = CYAN;
      ctx.shadowColor = CYAN;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.strokeRect(0.5, 0.5, g.cols * g.cell - 1, g.rows * g.cell - 1);
      ctx.shadowBlur = 0;

      if (g.trailList.length > 1) {
        ctx.lineWidth = Math.max(2, g.cell * 0.33);
        ctx.strokeStyle = MAGENTA;
        ctx.shadowColor = MAGENTA;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        g.trailList.forEach((id, i) => {
          const x = ((id % g.cols) + 0.5) * g.cell;
          const y = (((id / g.cols) | 0) + 0.5) * g.cell;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      for (const orb of g.orbs) {
        if (!orb.alive) continue;
        ctx.fillStyle = '#ff6aef';
        ctx.shadowColor = '#ff6aef';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, g.cell * 0.38, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      for (const spark of g.sparks) {
        const s = resolveSparkPos(spark.t, g.cols, g.rows);
        ctx.fillStyle = '#fff089';
        ctx.shadowColor = '#fff089';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc((s.x + 0.5) * g.cell, (s.y + 0.5) * g.cell, g.cell * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      if (g.fuseActive && g.trailList.length > 0) {
        const id = g.trailList[Math.floor(g.fusePos)] ?? g.trailList[g.trailList.length - 1];
        const fx = ((id % g.cols) + 0.5) * g.cell;
        const fy = (((id / g.cols) | 0) + 0.5) * g.cell;
        ctx.fillStyle = HOT;
        ctx.shadowColor = HOT;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(fx, fy, g.cell * 0.24, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      const px = (g.player.x + 0.5) * g.cell;
      const py = (g.player.y + 0.5) * g.cell;
      const angle = g.dir === 'up' ? -Math.PI / 2 : g.dir === 'down' ? Math.PI / 2 : g.dir === 'left' ? Math.PI : 0;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);
      ctx.fillStyle = g.drawing ? MAGENTA : CYAN;
      ctx.shadowColor = g.drawing ? MAGENTA : CYAN;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(g.cell * 0.52, 0);
      ctx.lineTo(-g.cell * 0.45, -g.cell * 0.35);
      ctx.lineTo(-g.cell * 0.12, 0);
      ctx.lineTo(-g.cell * 0.45, g.cell * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;

      if (g.joystick.active) {
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(g.joystick.baseX, g.joystick.baseY, 34, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = MAGENTA;
        ctx.beginPath();
        ctx.arc(g.joystick.knobX, g.joystick.knobY, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // tiny animated scanline vibe
      ctx.fillStyle = `rgba(255,255,255,${0.02 + 0.01 * Math.sin(ts * 0.004)})`;
      ctx.fillRect(0, 0, g.w, g.h);
    };

    const resize = () => {
      g.w = window.innerWidth;
      g.h = window.innerHeight;
      g.dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(g.w * g.dpr));
      canvas.height = Math.max(1, Math.floor(g.h * g.dpr));
      canvas.style.width = `${g.w}px`;
      canvas.style.height = `${g.h}px`;
      buildLevel(g.level);
    };

    const updateTouchDir = (x: number, y: number) => {
      const dx = x - g.joystick.baseX;
      const dy = y - g.joystick.baseY;
      const mag = Math.hypot(dx, dy);
      if (mag < 10) {
        g.dir = 'none';
        g.joystick.knobX = g.joystick.baseX;
        g.joystick.knobY = g.joystick.baseY;
        return;
      }
      const r = Math.min(30, mag);
      g.joystick.knobX = g.joystick.baseX + (dx / mag) * r;
      g.joystick.knobY = g.joystick.baseY + (dy / mag) * r;
      g.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
        a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down',
      };
      const next = map[e.key];
      if (next) {
        g.dir = next;
        e.preventDefault();
      }
      if ((e.key === ' ' || e.key === 'Enter') && g.phase === 'gameover') {
        g.level = 1;
        g.score = 0;
        g.lives = 3;
        buildLevel(1);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's', 'A', 'D', 'W', 'S'].includes(e.key)) {
        g.dir = 'none';
      }
    };

    const loop = (ts: number) => {
      const dt = Math.min(0.05, (ts - lastRef.current) / 1000 || 0.016);
      lastRef.current = ts;

      if (g.phase === 'levelup') {
        g.levelTimer -= dt;
        if (g.levelTimer <= 0) buildLevel(g.level + 1);
      }

      if (g.phase === 'playing') {
        g.moveAcc += dt * g.playerSpeed;
        while (g.moveAcc >= 1) {
          playerStep();
          g.moveAcc -= 1;
        }
        updateOrbs(dt);
        if (g.phase === 'playing') updateSparks(dt);
        if (g.phase === 'playing') updateFuse(dt);
      }

      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx, ts);

      setHud(prev => {
        if (
          prev.level === g.level && prev.score === g.score && prev.lives === g.lives &&
          prev.target === g.targetPct && prev.captured === g.capturedPct && prev.phase === g.phase
        ) return prev;
        return { level: g.level, score: g.score, lives: g.lives, target: g.targetPct, captured: g.capturedPct, phase: g.phase };
      });

      rafRef.current = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      g.joystick.active = true;
      g.joystick.id = e.pointerId;
      g.joystick.baseX = e.clientX;
      g.joystick.baseY = e.clientY;
      g.joystick.knobX = e.clientX;
      g.joystick.knobY = e.clientY;
      updateTouchDir(e.clientX, e.clientY);

      if (g.phase === 'gameover') {
        g.level = 1;
        g.score = 0;
        g.lives = 3;
        buildLevel(1);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!g.joystick.active || g.joystick.id !== e.pointerId) return;
      updateTouchDir(e.clientX, e.clientY);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (g.joystick.id !== e.pointerId) return;
      g.joystick.active = false;
      g.joystick.id = null;
      g.dir = 'none';
    };

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });

    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100dvh', background: SPACE, position: 'relative', overflow: 'hidden', touchAction: 'none' }}>
      <canvas ref={canvasRef} />

      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 12,
          right: 12,
          display: 'flex',
          justifyContent: 'space-between',
          color: CYAN,
          fontFamily: 'monospace',
          fontSize: 14,
          letterSpacing: 1,
          textShadow: `0 0 8px ${CYAN}`,
          pointerEvents: 'none',
        }}
      >
        <div>LEVEL {hud.level} · SCORE {hud.score.toLocaleString()}</div>
        <div>TARGET {hud.target}% · CLAIMED {hud.captured}% · LIVES {'⚡'.repeat(Math.max(0, hud.lives))}</div>
      </div>

      {hud.phase === 'levelup' && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <div style={{ color: MAGENTA, fontFamily: 'monospace', fontSize: 32, textShadow: `0 0 16px ${MAGENTA}` }}>SECTOR CLEARED</div>
        </div>
      )}

      {hud.phase === 'gameover' && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(2,0,8,0.55)' }}>
          <div style={{ textAlign: 'center', fontFamily: 'monospace' }}>
            <div style={{ color: '#ff6f7f', fontSize: 34, marginBottom: 10 }}>SYSTEM SHOCK</div>
            <div style={{ color: CYAN }}>Press Space/Enter or Tap to Reboot</div>
          </div>
        </div>
      )}
    </div>
  );
}
