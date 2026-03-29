'use client';

import { useEffect, useRef, useState } from 'react';

class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private unlocked = false;

  init = () => {
    if (this.ctx) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.18;
    this.master.connect(this.ctx.destination);
  };

  unlock = async () => {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.unlocked = true;
  };

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, gainAmt = 0.2, filterFreq = 2400) {
    if (!this.ctx || !this.master || !this.unlocked) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), now + dur);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    gain.gain.setValueAtTime(gainAmt, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  playZap() {
    this.tone('square', 420, 1300, 0.1, 0.16, 3200);
    this.tone('triangle', 620, 1800, 0.07, 0.11, 4500);
  }

  playHum() {
    this.tone('sawtooth', 180, 220, 0.06, 0.05, 1300);
  }

  playCrash() {
    if (!this.ctx || !this.master || !this.unlocked) return;
    const now = this.ctx.currentTime;
    const len = 0.25;
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * len), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(900, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + len);
    src.connect(bp);
    bp.connect(gain);
    gain.connect(this.master);
    src.start(now);
  }
}


type Dir = 'up' | 'down' | 'left' | 'right' | 'none';

type V2 = { x: number; y: number };

type Orb = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
};

type Spark = { t: number; speed: number };

type Joystick = {
  active: boolean;
  id: number | null;
  baseX: number;
  baseY: number;
  knobX: number;
  knobY: number;
};

type TrailNode = { x: number; y: number; life: number };

const MAX_TRAIL_HISTORY = 8;

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
  trailIndexMap: Int32Array;
  player: V2;
  dir: Dir;
  moveAcc: number;
  playerSpeed: number;
  drawing: boolean;
  level: number;
  score: number;
  lives: number;
  targetPct: number;
  capturedPct: number;
  phase: 'ready' | 'playing' | 'levelup' | 'gameover';
  orbs: Orb[];
  spark: Spark;
  fuseActive: boolean;
  fusePos: number;
  fuseSpeed: number;
  joystick: Joystick;
  levelupTimer: number;
  sound: SoundManager;
  moveHumCooldown: number;
  sparkTrail: TrailNode[];
  playerTrail: TrailNode[];
  bgCanvas: HTMLCanvasElement | OffscreenCanvas | null;
};



const drawPlayerSpark = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, dir: Dir, drawing: boolean, history: TrailNode[]) => {
  const color = drawing ? '#ff46f9' : '#36f6ff';
  for (const node of history) {
    const alpha = Math.max(0, node.life);
    ctx.fillStyle = `rgba(54,246,255,${0.08 * alpha})`;
    ctx.beginPath();
    ctx.arc(node.x, node.y, size * (0.2 + alpha * 0.35), 0, Math.PI * 2);
    ctx.fill();
  }

  const ang = dir === 'up' ? -Math.PI / 2 : dir === 'down' ? Math.PI / 2 : dir === 'left' ? Math.PI : dir === 'right' ? 0 : -Math.PI / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size * 0.7, 0);
  ctx.lineTo(-size * 0.5, -size * 0.5);
  ctx.lineTo(-size * 0.15, 0);
  ctx.lineTo(-size * 0.5, size * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#dfffff';
  ctx.beginPath();
  ctx.arc(size * 0.1, 0, size * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.shadowBlur = 0;
};

const drawVirus = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, hueShift = 0) => {
  const spikes = 8;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(performance.now() * 0.001 + hueShift);
  ctx.shadowColor = '#ff6d2b';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#ff9b2f';
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const a = (Math.PI * i) / spikes;
    const r = i % 2 === 0 ? radius : radius * 0.55;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff6d0';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.shadowBlur = 0;
};

const createStaticGridCanvas = (g: Game) => {
  const bw = Math.max(1, Math.floor(g.w * g.dpr));
  const bh = Math.max(1, Math.floor(g.h * g.dpr));
  const offscreen = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(bw, bh) : Object.assign(document.createElement('canvas'), { width: bw, height: bh });
  const ctx = offscreen.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, g.w, g.h);
  ctx.strokeStyle = '#0d2a44';
  ctx.globalAlpha = 0.4;
  for (let x = 0; x <= g.cols; x += 2) {
    ctx.beginPath();
    ctx.moveTo(x * g.cell, 0);
    ctx.lineTo(x * g.cell, g.h);
    ctx.stroke();
  }
  for (let y = 0; y <= g.rows; y += 2) {
    ctx.beginPath();
    ctx.moveTo(0, y * g.cell);
    ctx.lineTo(g.w, y * g.cell);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return offscreen;
};

const BG = '#03050d';
const CYAN = '#19f0ff';
const MAGENTA = '#ff2ff1';

const key = (x: number, y: number, cols: number) => y * cols + x;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function VoltGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const gameRef = useRef<Game | null>(null);

  const [hud, setHud] = useState({ level: 1, score: 0, lives: 3, targetPct: 75, capturedPct: 0, fuse: false });

  const buildLevel = (g: Game, level: number) => {
    g.level = level;
    g.phase = 'playing';
    g.levelupTimer = 0;
    g.cell = clamp(Math.floor(Math.min(g.w, g.h) / 78), 8, 16);
    g.cols = Math.max(40, Math.floor(g.w / g.cell));
    g.rows = Math.max(26, Math.floor(g.h / g.cell));
    g.safe = new Uint8Array(g.cols * g.rows);
    g.trail = new Uint8Array(g.cols * g.rows);
    g.trailList = [];
    g.trailIndexMap = new Int32Array(g.cols * g.rows).fill(-1);
    for (let x = 0; x < g.cols; x++) {
      g.safe[key(x, 0, g.cols)] = 1;
      g.safe[key(x, g.rows - 1, g.cols)] = 1;
    }
    for (let y = 0; y < g.rows; y++) {
      g.safe[key(0, y, g.cols)] = 1;
      g.safe[key(g.cols - 1, y, g.cols)] = 1;
    }
    g.player = { x: 0, y: Math.floor(g.rows / 2) };
    g.dir = 'none';
    g.moveAcc = 0;
    g.drawing = false;
    g.playerSpeed = 24 + level * 1.7;
    g.targetPct = Math.min(90, 75 + (level - 1) * 2);
    g.capturedPct = 0;

    const orbCount = level;
    const base = 78 + level * 12;
    g.orbs = Array.from({ length: orbCount }, (_, i) => {
      const px = (g.cols * 0.3 + i * 3) * g.cell;
      const py = (g.rows * 0.3 + i * 2) * g.cell;
      const ang = Math.random() * Math.PI * 2;
      return { x: px, y: py, vx: Math.cos(ang) * base, vy: Math.sin(ang) * base, alive: true };
    });
    g.spark = { t: 0, speed: 0.12 + level * 0.02 };
    g.fuseActive = false;
    g.fusePos = 0;
    g.fuseSpeed = 46 + level * 6;
    g.sparkTrail = [];
    g.playerTrail = [];
    g.bgCanvas = createStaticGridCanvas(g);
  };

  const loseLife = (g: Game) => {
    g.lives -= 1;
    g.trail.fill(0);
    g.trailIndexMap.fill(-1);
    g.trailList = [];
    g.drawing = false;
    g.fuseActive = false;
    g.player = { x: 0, y: Math.floor(g.rows / 2) };
    g.dir = 'none';
    g.sound.playCrash();
    if (g.lives <= 0) g.phase = 'gameover';
  };

  const captureRegion = (g: Game) => {
    for (const i of g.trailList) g.safe[i] = 1;

    const visited = new Uint8Array(g.cols * g.rows);
    const queue = new Int32Array(g.cols * g.rows);
    let qh = 0;
    let qt = 0;

    const push = (idx: number) => {
      if (visited[idx] || g.safe[idx]) return;
      visited[idx] = 1;
      queue[qt++] = idx;
    };

    for (const orb of g.orbs) {
      if (!orb.alive) continue;
      const cx = clamp(Math.floor(orb.x / g.cell), 1, g.cols - 2);
      const cy = clamp(Math.floor(orb.y / g.cell), 1, g.rows - 2);
      push(key(cx, cy, g.cols));
    }

    while (qh < qt) {
      const idx = queue[qh++];
      const x = idx % g.cols;
      const y = (idx / g.cols) | 0;
      if (x > 1) push(idx - 1);
      if (x < g.cols - 2) push(idx + 1);
      if (y > 1) push(idx - g.cols);
      if (y < g.rows - 2) push(idx + g.cols);
    }

    let capturedNow = 0;
    for (let y = 1; y < g.rows - 1; y++) {
      for (let x = 1; x < g.cols - 1; x++) {
        const idx = key(x, y, g.cols);
        if (!g.safe[idx] && !visited[idx]) {
          g.safe[idx] = 1;
          capturedNow += 1;
        }
      }
    }

    let kills = 0;
    for (const orb of g.orbs) {
      if (!orb.alive) continue;
      const ox = clamp(Math.floor(orb.x / g.cell), 1, g.cols - 2);
      const oy = clamp(Math.floor(orb.y / g.cell), 1, g.rows - 2);
      if (g.safe[key(ox, oy, g.cols)] && !visited[key(ox, oy, g.cols)]) {
        orb.alive = false;
        kills += 1;
      }
    }

    g.orbs = g.orbs.filter(o => o.alive);
    const totalVoid = (g.cols - 2) * (g.rows - 2);
    let safeInside = 0;
    for (let y = 1; y < g.rows - 1; y++) {
      for (let x = 1; x < g.cols - 1; x++) safeInside += g.safe[key(x, y, g.cols)] ? 1 : 0;
    }

    g.capturedPct = Math.floor((safeInside / totalVoid) * 100);
    g.score += Math.floor(capturedNow * 5) + kills * 5000;
    g.sound.playZap();

    g.trail.fill(0);
    g.trailIndexMap.fill(-1);
    g.trailList = [];
    g.drawing = false;
    g.fuseActive = false;

    if (g.capturedPct >= g.targetPct) {
      g.phase = 'levelup';
      g.levelupTimer = 1.25;
      g.score += 1200 + g.level * 400;
    }
  };

  const movePlayerStep = (g: Game) => {
    if (g.dir === 'none' || g.phase !== 'playing') return;
    let nx = g.player.x;
    let ny = g.player.y;
    if (g.dir === 'left') nx -= 1;
    if (g.dir === 'right') nx += 1;
    if (g.dir === 'up') ny -= 1;
    if (g.dir === 'down') ny += 1;
    nx = clamp(nx, 0, g.cols - 1);
    ny = clamp(ny, 0, g.rows - 1);

    const ni = key(nx, ny, g.cols);
    const onSafe = g.safe[ni] === 1;

    if (!g.drawing && !onSafe) {
      g.drawing = true;
    }

    if (g.drawing) {
      if (!g.trail[ni]) {
        g.trail[ni] = 1;
        g.trailIndexMap[ni] = g.trailList.length;
        g.trailList.push(ni);
      }

      if (onSafe && g.trailList.length > 2) captureRegion(g);
    }

    g.player.x = nx;
    g.player.y = ny;
  };

  const updateOrb = (g: Game, orb: Orb, dt: number) => {
    const r = g.cell * 0.35;
    let nx = orb.x + orb.vx * dt;
    let ny = orb.y + orb.vy * dt;

    const tryBounce = (tx: number, ty: number) => {
      const cx = clamp(Math.floor(tx / g.cell), 0, g.cols - 1);
      const cy = clamp(Math.floor(ty / g.cell), 0, g.rows - 1);
      return g.safe[key(cx, cy, g.cols)] === 1;
    };

    if (tryBounce(nx + Math.sign(orb.vx) * r, orb.y)) {
      orb.vx *= -1;
      nx = orb.x + orb.vx * dt;
    }
    if (tryBounce(orb.x, ny + Math.sign(orb.vy) * r)) {
      orb.vy *= -1;
      ny = orb.y + orb.vy * dt;
    }

    orb.x = clamp(nx, g.cell, g.w - g.cell);
    orb.y = clamp(ny, g.cell, g.h - g.cell);

    const cx = clamp(Math.floor(orb.x / g.cell), 0, g.cols - 1);
    const cy = clamp(Math.floor(orb.y / g.cell), 0, g.rows - 1);
    const idx = key(cx, cy, g.cols);

    if (g.trail[idx] && !g.fuseActive && g.trailList.length > 1) {
      const start = g.trailIndexMap[idx];
      if (start >= 0) {
        g.fuseActive = true;
        g.fusePos = start;
      }
    }

    const px = (g.player.x + 0.5) * g.cell;
    const py = (g.player.y + 0.5) * g.cell;
    if ((orb.x - px) ** 2 + (orb.y - py) ** 2 < (g.cell * 0.5) ** 2) loseLife(g);
  };

  const updateSpark = (g: Game, dt: number) => {
    const perimeter = (g.cols - 1) * 2 + (g.rows - 1) * 2;
    g.spark.t = (g.spark.t + g.spark.speed * dt * perimeter) % perimeter;

    let p = g.spark.t;
    let x = 0;
    let y = 0;
    if (p < g.cols - 1) {
      x = p;
      y = 0;
    } else if ((p -= g.cols - 1) < g.rows - 1) {
      x = g.cols - 1;
      y = p;
    } else if ((p -= g.rows - 1) < g.cols - 1) {
      x = g.cols - 1 - p;
      y = g.rows - 1;
    } else {
      p -= g.cols - 1;
      x = 0;
      y = g.rows - 1 - p;
    }

    if (Math.abs(g.player.x - x) <= 0.4 && Math.abs(g.player.y - y) <= 0.4) loseLife(g);
  };

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
      trailIndexMap: new Int32Array(0),
      player: { x: 0, y: 0 },
      dir: 'none',
      moveAcc: 0,
      playerSpeed: 24,
      drawing: false,
      level: 1,
      score: 0,
      lives: 3,
      targetPct: 75,
      capturedPct: 0,
      phase: 'ready',
      orbs: [],
      spark: { t: 0, speed: 0.1 },
      fuseActive: false,
      fusePos: 0,
      fuseSpeed: 50,
      joystick: { active: false, id: null, baseX: 0, baseY: 0, knobX: 0, knobY: 0 },
      levelupTimer: 0,
      sound: new SoundManager(),
      moveHumCooldown: 0,
      sparkTrail: [],
      playerTrail: [],
      bgCanvas: null,
    };

    gameRef.current = g;
    g.sound.init();

    const resize = () => {
      g.w = window.innerWidth;
      g.h = window.innerHeight;
      g.dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(g.w * g.dpr);
      canvas.height = Math.floor(g.h * g.dpr);
      canvas.style.width = `${g.w}px`;
      canvas.style.height = `${g.h}px`;
      buildLevel(g, g.level);
    };

    resize();
    window.addEventListener('resize', resize);

    const onKeyDown = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
        a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down',
      };
      const d = map[e.key];
      if (d) {
        g.dir = d;
        e.preventDefault();
      }
      if (e.key === ' ' && g.phase === 'gameover') {
        g.level = 1;
        g.score = 0;
        g.lives = 3;
        buildLevel(g, 1);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if ([
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's', 'A', 'D', 'W', 'S',
      ].includes(e.key)) g.dir = 'none';
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    const restartIfGameOver = () => {
      if (g.phase !== 'gameover') return;
      g.level = 1;
      g.score = 0;
      g.lives = 3;
      buildLevel(g, 1);
    };

    const onFirstInteraction = () => {
      void g.sound.unlock();
    };

    const onGlobalPointerDown = () => {
      onFirstInteraction();
      restartIfGameOver();
    };

    const onGlobalTouchStart = () => {
      onFirstInteraction();
      restartIfGameOver();
    };

    window.addEventListener('pointerdown', onGlobalPointerDown, { passive: true });
    window.addEventListener('touchstart', onGlobalTouchStart, { passive: true });

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - lastRef.current) / 1000 || 0.016);
      lastRef.current = t;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (g.phase === 'levelup') {
        g.levelupTimer -= dt;
        if (g.levelupTimer <= 0) buildLevel(g, g.level + 1);
      }

      if (g.phase === 'playing') {
        g.moveAcc += dt * g.playerSpeed;
        g.moveHumCooldown -= dt;
        while (g.moveAcc >= 1) {
          movePlayerStep(g);
          if (g.dir !== 'none' && g.moveHumCooldown <= 0) {
            g.sound.playHum();
            g.moveHumCooldown = 0.08;
          }
          g.moveAcc -= 1;
        }

        for (const orb of g.orbs) updateOrb(g, orb, dt);
        updateSpark(g, dt);

        if (g.fuseActive && g.trailList.length) {
          g.fusePos += dt * g.fuseSpeed;
          if (g.fusePos >= g.trailList.length - 1) loseLife(g);
        }
      }

      ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
      ctx.clearRect(0, 0, g.w, g.h);
      if (g.bgCanvas) ctx.drawImage(g.bgCanvas as CanvasImageSource, 0, 0, g.w, g.h);
      else {
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, g.w, g.h);
      }

      for (let y = 0; y < g.rows; y++) {
        for (let x = 0; x < g.cols; x++) {
          const idx = key(x, y, g.cols);
          if (g.safe[idx]) {
            ctx.fillStyle = x % 2 === y % 2 ? 'rgba(20,210,255,0.15)' : 'rgba(255,50,235,0.08)';
            ctx.fillRect(x * g.cell, y * g.cell, g.cell, g.cell);
          }
        }
      }

      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 2;
      ctx.shadowColor = CYAN;
      ctx.shadowBlur = 10;
      ctx.strokeRect(0.5, 0.5, g.cols * g.cell - 1, g.rows * g.cell - 1);
      ctx.shadowBlur = 0;

      if (g.trailList.length) {
        ctx.strokeStyle = MAGENTA;
        ctx.lineWidth = Math.max(2, g.cell * 0.35);
        ctx.beginPath();
        g.trailList.forEach((idx, i) => {
          const x = (idx % g.cols + 0.5) * g.cell;
          const y = (((idx / g.cols) | 0) + 0.5) * g.cell;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      for (let i = 0; i < g.orbs.length; i++) {
        const orb = g.orbs[i];
        drawVirus(ctx, orb.x, orb.y, g.cell * 0.42, i * 0.3);
      }

      const perimeter = (g.cols - 1) * 2 + (g.rows - 1) * 2;
      let p = g.spark.t % perimeter;
      let sx = 0;
      let sy = 0;
      if (p < g.cols - 1) {
        sx = p; sy = 0;
      } else if ((p -= g.cols - 1) < g.rows - 1) {
        sx = g.cols - 1; sy = p;
      } else if ((p -= g.rows - 1) < g.cols - 1) {
        sx = g.cols - 1 - p; sy = g.rows - 1;
      } else {
        p -= g.cols - 1; sx = 0; sy = g.rows - 1 - p;
      }
      const sparkX = (sx + 0.5) * g.cell;
      const sparkY = (sy + 0.5) * g.cell;
      g.sparkTrail.push({ x: sparkX, y: sparkY, life: 1 });
      if (g.sparkTrail.length > MAX_TRAIL_HISTORY) g.sparkTrail.shift();
      for (const node of g.sparkTrail) node.life -= dt * 5;
      g.sparkTrail = g.sparkTrail.filter(node => node.life > 0);
      drawVirus(ctx, sparkX, sparkY, g.cell * 0.3, 1.8);

      if (g.fuseActive && g.trailList.length) {
        const idx = g.trailList[Math.floor(g.fusePos)];
        if (idx !== undefined) {
          const fx = (idx % g.cols + 0.5) * g.cell;
          const fy = (((idx / g.cols) | 0) + 0.5) * g.cell;
          ctx.fillStyle = '#fff76e';
          ctx.beginPath();
          ctx.arc(fx, fy, g.cell * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const px = (g.player.x + 0.5) * g.cell;
      const py = (g.player.y + 0.5) * g.cell;
      g.playerTrail.push({ x: px, y: py, life: 0.9 });
      if (g.playerTrail.length > MAX_TRAIL_HISTORY) g.playerTrail.shift();
      for (const node of g.playerTrail) node.life -= dt * 4;
      g.playerTrail = g.playerTrail.filter(node => node.life > 0);
      drawPlayerSpark(ctx, px, py, g.cell * 0.7, g.dir, g.drawing, g.playerTrail);

      if (g.joystick.active) {
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = '#8ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(g.joystick.baseX, g.joystick.baseY, 32, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#8ff';
        ctx.beginPath();
        ctx.arc(g.joystick.knobX, g.joystick.knobY, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      setHud(prev => (
        prev.level === g.level && prev.score === g.score && prev.lives === g.lives &&
        prev.targetPct === g.targetPct && prev.capturedPct === g.capturedPct && prev.fuse === g.fuseActive
          ? prev
          : { level: g.level, score: g.score, lives: g.lives, targetPct: g.targetPct, capturedPct: g.capturedPct, fuse: g.fuseActive }
      ));

      rafRef.current = requestAnimationFrame(loop);
    };

    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerdown', onGlobalPointerDown);
      window.removeEventListener('touchstart', onGlobalTouchStart);
    };
  }, []);

  const updateTouchDir = (touch: { clientX: number; clientY: number }, g: Game) => {
    const dx = touch.clientX - g.joystick.baseX;
    const dy = touch.clientY - g.joystick.baseY;
    const m = Math.hypot(dx, dy);
    const dead = 10;
    if (m < dead) {
      g.dir = 'none';
      g.joystick.knobX = g.joystick.baseX;
      g.joystick.knobY = g.joystick.baseY;
      return;
    }
    const r = Math.min(28, m);
    g.joystick.knobX = g.joystick.baseX + (dx / m) * r;
    g.joystick.knobY = g.joystick.baseY + (dy / m) * r;
    g.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  };

  return (
    <div
      style={{ width: '100vw', height: '100dvh', overflow: 'hidden', position: 'relative', background: BG, touchAction: 'none' }}
      onTouchStart={(e) => {
        const g = gameRef.current;
        if (!g) return;
        const t = e.touches[0];
        g.joystick = { active: true, id: t.identifier, baseX: t.clientX, baseY: t.clientY, knobX: t.clientX, knobY: t.clientY };
        updateTouchDir(t, g);
      }}
      onTouchMove={(e) => {
        const g = gameRef.current;
        if (!g || !g.joystick.active) return;
        const t = Array.from(e.touches).find(v => v.identifier === g.joystick.id);
        if (!t) return;
        updateTouchDir(t, g);
      }}
      onTouchEnd={() => {
        const g = gameRef.current;
        if (!g) return;
        g.joystick.active = false;
        g.dir = 'none';
      }}
    >
      <canvas ref={canvasRef} />
      <div style={{ position: 'absolute', top: 10, left: 12, right: 12, color: CYAN, fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between', fontSize: 14, letterSpacing: 1 }}>
        <div>LVL {hud.level} · SCORE {hud.score.toLocaleString()}</div>
        <div>TARGET {hud.targetPct}% · CLAIMED {hud.capturedPct}% · {'♥'.repeat(Math.max(0, hud.lives))}</div>
      </div>
      {gameRef.current?.phase === 'gameover' && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', fontFamily: 'monospace', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ff5a5a', fontSize: 36, marginBottom: 8 }}>SHOCKED OUT</div>
            <div style={{ marginBottom: 8 }}>SHOCKED OUT! Press Space or Tap to Restart</div>
          </div>
        </div>
      )}
    </div>
  );
}
