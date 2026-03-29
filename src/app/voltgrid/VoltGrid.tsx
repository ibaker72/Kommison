'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────
type Vec2 = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type Direction = 'up' | 'down' | 'left' | 'right' | null;
type GamePhase = 'start' | 'playing' | 'gameover';

// ─── Constants ───────────────────────────────────────────────────────────────
const COLORS = {
  deepSpace: '#050510',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  white: '#dffbff',
  hudBg: 'rgba(5, 5, 16, 0.68)',
} as const;
// Fixed square internal resolution — canvas always renders at 600×600 logical pixels.
const RES = { w: 600, h: 600 } as const;
const GRID = 30;
const GHOST_SPEED = 210;
const ORB_SPEED = 165;
const SPARK_SPEED = 150;
const SHOCK_DURATION = 2000;
const SLOW_MO_DURATION = 500;
const HIGH_SCORE_KEY = 'voltgrid:high-score';

// ─── Utility ─────────────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function vec2Length(v: Vec2) { return Math.hypot(v.x, v.y); }
function lineDistance(point: Vec2, a: Vec2, b: Vec2) {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const ap = { x: point.x - a.x, y: point.y - a.y };
  const d2 = ab.x * ab.x + ab.y * ab.y;
  const t = d2 <= 0 ? 0 : clamp((ap.x * ab.x + ap.y * ab.y) / d2, 0, 1);
  const proj = { x: a.x + ab.x * t, y: a.y + ab.y * t };
  return Math.hypot(point.x - proj.x, point.y - proj.y);
}
function pointInRect(p: Vec2, r: Rect) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

// ─── Perlin-lite noise (single-octave fade implementation) ───────────────────
const PERM: number[] = [];
(function buildPerm() {
  const base = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = base[i & 255];
})();
function grad(hash: number, x: number): number {
  return (hash & 1) === 0 ? x : -x;
}
function fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }
function perlin1d(x: number): number {
  const xi = Math.floor(x) & 255;
  const xf = x - Math.floor(x);
  const u = fade(xf);
  return (1 - u) * grad(PERM[xi], xf) + u * grad(PERM[xi + 1], xf - 1);
}

// ─── Floating Text ────────────────────────────────────────────────────────────
type FloatText = { x: number; y: number; text: string; ttl: number; maxTtl: number };

// ─── SoundEngine ─────────────────────────────────────────────────────────────
class SoundEngine {
  private ctx: AudioContext | null = null;
  private buzzGain: GainNode | null = null;
  private buzzOsc: OscillatorNode | null = null;
  private buzzRunning = false;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  resume() { if (this.ctx?.state === 'suspended') void this.ctx.resume(); }
  getAudioTime() { return this.ctx?.currentTime ?? 0; }

  playCut(now: number) {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(480, now + 0.08);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playCapture(now: number) {
    const ctx = this.getCtx();
    // thud
    const tOsc = ctx.createOscillator();
    const tGain = ctx.createGain();
    tOsc.type = 'sawtooth';
    tOsc.frequency.setValueAtTime(120, now);
    tOsc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    tGain.gain.setValueAtTime(0.35, now);
    tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    tOsc.connect(tGain).connect(ctx.destination);
    tOsc.start(now); tOsc.stop(now + 0.2);
    // chime
    const cOsc = ctx.createOscillator();
    const cGain = ctx.createGain();
    cOsc.type = 'sine';
    cOsc.frequency.setValueAtTime(1320, now + 0.05);
    cOsc.frequency.setValueAtTime(1760, now + 0.12);
    cGain.gain.setValueAtTime(0, now + 0.05);
    cGain.gain.linearRampToValueAtTime(0.25, now + 0.07);
    cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    cOsc.connect(cGain).connect(ctx.destination);
    cOsc.start(now + 0.05); cOsc.stop(now + 0.42);
  }

  playDeath(now: number) {
    const ctx = this.getCtx();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / data.length);
    const src = ctx.createBufferSource();
    const lp = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = buf;
    lp.type = 'lowpass'; lp.frequency.value = 320;
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    src.connect(lp).connect(gain).connect(ctx.destination);
    src.start(now);
  }

  playContainmentKill(now: number) {
    // extra sting on top of capture for orb-trap event
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.12);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.24);
  }

  startBuzz() {
    if (this.buzzRunning) return;
    const ctx = this.getCtx();
    this.buzzOsc = ctx.createOscillator();
    this.buzzGain = ctx.createGain();
    this.buzzOsc.type = 'sawtooth';
    this.buzzOsc.frequency.value = 55;
    this.buzzGain.gain.value = 0.04;
    this.buzzOsc.connect(this.buzzGain).connect(ctx.destination);
    this.buzzOsc.start();
    this.buzzRunning = true;
  }

  modulateBuzz(t: number) {
    if (!this.buzzGain || !this.buzzOsc) return;
    this.buzzGain.gain.value = 0.03 + Math.abs(Math.sin(t * 4.2)) * 0.06;
    this.buzzOsc.frequency.value = 52 + Math.abs(Math.sin(t * 2.7)) * 28;
  }

  stopBuzz() {
    if (!this.buzzRunning) return;
    this.buzzGain?.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.08);
    setTimeout(() => {
      try { this.buzzOsc?.stop(); } catch { /* already stopped */ }
      this.buzzOsc = null; this.buzzGain = null; this.buzzRunning = false;
    }, 250);
  }
}

// ─── Camera (screen-shake) ────────────────────────────────────────────────────
class Camera {
  private shakeUntil = 0;
  private shakeAmp = 0;
  dx = 0; dy = 0;

  trigger(now: number, amplitude: number, durationMs: number) {
    this.shakeUntil = now + durationMs;
    this.shakeAmp = Math.max(this.shakeAmp, amplitude);
  }

  update(now: number) {
    if (now >= this.shakeUntil) { this.shakeAmp = 0; this.dx = 0; this.dy = 0; return; }
    const t = now / 1000;
    const decay = (this.shakeUntil - now) / this.shakeAmp;
    const amp = this.shakeAmp * Math.min(1, decay * 0.3);
    this.dx = perlin1d(t * 30) * amp;
    this.dy = perlin1d(t * 30 + 100) * amp;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function VoltGrid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bufferRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [goal, setGoal] = useState(70);
  const [captured, setCaptured] = useState(0);
  const [phase, setPhase] = useState<GamePhase>('start');
  const [highScore, setHighScore] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const stored = Number.parseInt(window.localStorage.getItem(HIGH_SCORE_KEY) ?? '0', 10);
    return Number.isFinite(stored) ? stored : 0;
  });
  const [joystickUi, setJoystickUi] = useState<{ base: Vec2; knob: Vec2 } | null>(null);

  const soundRef = useRef(new SoundEngine());
  const cameraRef = useRef(new Camera());
  const arenaRef = useRef<HTMLDivElement>(null);

  const stateRef = useRef({
    ghost: { x: GRID, y: GRID } as Vec2,
    ghostTrail: [] as { pos: Vec2; age: number }[],   // motion-blur trail
    orb: { x: 0, y: 0 } as Vec2,
    orbVel: { x: ORB_SPEED, y: ORB_SPEED } as Vec2,
    spark: { x: 0, y: 0 } as Vec2,
    sparkVel: { x: -SPARK_SPEED, y: SPARK_SPEED } as Vec2,
    direction: 'right' as Direction,
    trail: [] as Vec2[],
    captureRects: [] as Rect[],
    floatTexts: [] as FloatText[],
    shockEndsAt: 0,
    slowMoUntil: 0,
    slowMoScale: 1,
    joystickTouchId: -1,
    joystickBase: null as Vec2 | null,
    joystickKnob: null as Vec2 | null,
    deadzone: 24,
    lastMs: 0,
  });

  // Fixed alias — all internal game logic continues to reference `res.w` / `res.h` unchanged.
  const res = RES;

  const initSimulation = useCallback(() => {
    const s = stateRef.current;
    s.ghost = { x: GRID, y: GRID };
    s.ghostTrail = [];
    s.orb = { x: res.w * 0.5, y: res.h * 0.6 };
    s.spark = { x: res.w * 0.75, y: res.h * 0.35 };
    s.orbVel = { x: ORB_SPEED, y: ORB_SPEED };
    s.sparkVel = { x: -SPARK_SPEED, y: SPARK_SPEED };
    s.direction = 'right';
    s.trail = [];
    s.captureRects = [];
    s.floatTexts = [];
    s.shockEndsAt = 0;
    s.slowMoUntil = 0;
    s.slowMoScale = 1;
    s.lastMs = performance.now();
  }, [res.h, res.w]);

  const resetRun = useCallback(() => {
    initSimulation();
    setScore(0);
    setLives(3);
    setGoal(70);
    setCaptured(0);
  }, [initSimulation]);

  // ── Ghost movement + capture ──────────────────────────────────────────────
  function updateGhost(dt: number, now: number, width: number, height: number) {
    const s = stateRef.current;
    if (!s.direction) return;

    // Cut sound while drawing a trail
    if (s.trail.length > 0 && s.trail.length % 4 === 1) {
      soundRef.current.playCut(soundRef.current.getAudioTime());
    }

    const velocity: Vec2 =
      s.direction === 'up'    ? { x: 0, y: -GHOST_SPEED }
      : s.direction === 'down'  ? { x: 0, y:  GHOST_SPEED }
      : s.direction === 'left'  ? { x: -GHOST_SPEED, y: 0 }
                                : { x:  GHOST_SPEED, y: 0 };

    const next = {
      x: clamp(s.ghost.x + velocity.x * dt, GRID * 0.5, width  - GRID * 0.5),
      y: clamp(s.ghost.y + velocity.y * dt, GRID * 0.5, height - GRID * 0.5),
    };

    // Motion-blur ghost trail
    s.ghostTrail.push({ pos: { ...s.ghost }, age: now });
    // keep last 12 positions, drop older than 180ms
    s.ghostTrail = s.ghostTrail.filter((e) => now - e.age < 180).slice(-12);

    const onWall =
      next.x <= GRID || next.x >= width - GRID ||
      next.y <= GRID || next.y >= height - GRID;

    if (!onWall) {
      s.trail.push({ ...next });
    } else if (s.trail.length > 4) {
      const xs = s.trail.map((p) => p.x);
      const ys = s.trail.map((p) => p.y);
      const rect: Rect = {
        x: clamp(Math.min(...xs),           GRID, width  - GRID * 2),
        y: clamp(Math.min(...ys),           GRID, height - GRID * 2),
        w: clamp(Math.max(...xs) - Math.min(...xs), GRID, width  - GRID * 2),
        h: clamp(Math.max(...ys) - Math.min(...ys), GRID, height - GRID * 2),
      };
      s.captureRects.push(rect);
      s.trail = [];
      const gain = Math.floor((rect.w * rect.h) / 900);
      setScore((old) => old + gain);
      setCaptured((old) => clamp(old + gain / 15, 0, 100));

      const snd = soundRef.current;
      const audioCtx = (snd as unknown as { ctx: AudioContext | null }).ctx;
      const t = audioCtx?.currentTime ?? 0;
      snd.playCapture(t);

      // ── Containment Kill ─────────────────────────────────────────────────
      if (pointInRect(s.orb, rect)) {
        s.orb = { x: width * 0.5, y: height * 0.5 };
        s.slowMoScale = 0.5;
        s.slowMoUntil = now + SLOW_MO_DURATION;
        setScore((old) => old + 5000);
        s.floatTexts.push({ x: next.x, y: next.y, text: '5,000!!', ttl: 1400, maxTtl: 1400 });

        // simultaneous haptics + camera shake
        void Haptics.impact({ style: ImpactStyle.Heavy });
        cameraRef.current.trigger(now, 18, 420);
        snd.playContainmentKill(t);
      } else {
        // normal capture — lighter impact shake
        void Haptics.impact({ style: ImpactStyle.Heavy });
        cameraRef.current.trigger(now, 8, 200);
      }
    }

    s.ghost = next;
  }

  function bounce(pos: Vec2, vel: Vec2, width: number, height: number) {
    if (pos.x < GRID || pos.x > width - GRID) vel.x *= -1;
    if (pos.y < GRID || pos.y > height - GRID) vel.y *= -1;
  }

  function updateOrb(dt: number, width: number, height: number) {
    const s = stateRef.current;
    s.orb.x += s.orbVel.x * dt;
    s.orb.y += s.orbVel.y * dt;
    bounce(s.orb, s.orbVel, width, height);
  }

  function updateSpark(dt: number, width: number, height: number) {
    const s = stateRef.current;
    s.spark.x += s.sparkVel.x * dt;
    s.spark.y += s.sparkVel.y * dt;
    bounce(s.spark, s.sparkVel, width, height);
  }

  function loseLife(now: number) {
    setLives((old) => {
      const next = Math.max(0, old - 1);
      if (next === 0) {
        const s = stateRef.current;
        soundRef.current.stopBuzz();
        s.direction = null;
        s.trail = [];
        setPhase('gameover');
      }
      return next;
    });
    void Haptics.impact({ style: ImpactStyle.Heavy });
    cameraRef.current.trigger(now, 22, 500);
    const snd = soundRef.current;
    const audioCtx = (snd as unknown as { ctx: AudioContext | null }).ctx;
    snd.playDeath(audioCtx?.currentTime ?? 0);
  }

  function handleCollisions(now: number) {
    const s = stateRef.current;
    const snd = soundRef.current;

    // Trail-shock check
    if (s.trail.length > 1) {
      for (let i = 1; i < s.trail.length; i++) {
        if (lineDistance(s.orb, s.trail[i - 1], s.trail[i]) < 11) {
          if (s.shockEndsAt < now) snd.startBuzz();
          s.shockEndsAt = now + SHOCK_DURATION;
        }
      }
    }

    // Stop buzz when shock timer expires
    if (s.shockEndsAt > 0 && now > s.shockEndsAt) {
      snd.stopBuzz();
      loseLife(now);
      s.trail = [];
      s.shockEndsAt = 0;
    }

    if (Math.hypot(s.orb.x - s.ghost.x,   s.orb.y   - s.ghost.y) < 18) {
      loseLife(now);
      s.orb = { x: res.w * 0.5, y: res.h * 0.6 };
    }
    if (Math.hypot(s.spark.x - s.ghost.x, s.spark.y - s.ghost.y) < 18) {
      loseLife(now);
      s.spark = { x: res.w * 0.8, y: res.h * 0.3 };
    }

    // Modulate buzz oscillation
    if (s.shockEndsAt > now) snd.modulateBuzz(now / 1000);

    setCaptured((old) => {
      if (old >= goal) {
        setGoal((g) => g + 10);
        setLives((l) => Math.min(5, l + 1));
        return 0;
      }
      return old;
    });

    setScore((old) => {
      if (old > highScore) {
        setHighScore(old);
        localStorage.setItem(HIGH_SCORE_KEY, String(old));
      }
      return old;
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function renderFrame(now: number, canvas: HTMLCanvasElement, buffer: HTMLCanvasElement) {
    const s = stateRef.current;
    const cam = cameraRef.current;
    cam.update(now);

    const ctx = buffer.getContext('2d');
    const screen = canvas.getContext('2d');
    if (!ctx || !screen) return;

    ctx.clearRect(0, 0, res.w, res.h);
    ctx.fillStyle = COLORS.deepSpace;
    ctx.fillRect(0, 0, res.w, res.h);

    // Grid lines
    ctx.strokeStyle = 'rgba(0,255,255,0.18)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= res.w; x += GRID) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, res.h); ctx.stroke();
    }
    for (let y = 0; y <= res.h; y += GRID) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(res.w, y); ctx.stroke();
    }

    // Captured rects
    ctx.strokeStyle = COLORS.magenta;
    ctx.lineWidth = 3;
    for (const r of s.captureRects) ctx.strokeRect(r.x, r.y, r.w, r.h);

    // Active trail
    if (s.trail.length > 1) {
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(s.trail[0].x, s.trail[0].y);
      for (let i = 1; i < s.trail.length; i++) ctx.lineTo(s.trail[i].x, s.trail[i].y);
      ctx.stroke();
    }

    // ── Ghost motion-blur trail ────────────────────────────────────────────
    for (let i = 0; i < s.ghostTrail.length; i++) {
      const entry = s.ghostTrail[i];
      const ageFrac = (now - entry.age) / 180;          // 0=fresh → 1=old
      const alpha = (1 - ageFrac) * 0.55;
      const radius = 14 * (1 - ageFrac * 0.45);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = COLORS.white;
      ctx.beginPath();
      ctx.arc(entry.pos.x, entry.pos.y, radius, Math.PI, 0);
      ctx.lineTo(entry.pos.x + radius, entry.pos.y + 8);
      for (let j = 0; j < 4; j++) {
        const wx = entry.pos.x + radius - j * (radius * 0.6);
        const wy = entry.pos.y + (j % 2 === 0 ? 8 : 5);
        ctx.lineTo(wx, wy);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── Ghost ──────────────────────────────────────────────────────────────
    ctx.fillStyle = COLORS.white;
    ctx.beginPath();
    ctx.arc(s.ghost.x, s.ghost.y, 14, Math.PI, 0);
    ctx.lineTo(s.ghost.x + 14, s.ghost.y + 10);
    for (let i = 0; i < 4; i++) {
      const waveX = s.ghost.x + 14 - i * 9;
      const waveY = s.ghost.y + (i % 2 === 0 ? 10 : 6);
      ctx.lineTo(waveX, waveY);
    }
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = COLORS.deepSpace;
    ctx.beginPath();
    ctx.arc(s.ghost.x - 5, s.ghost.y - 2, 2.1, 0, Math.PI * 2);
    ctx.arc(s.ghost.x + 5, s.ghost.y - 2, 2.1, 0, Math.PI * 2);
    ctx.fill();

    // ── Death Ring ─────────────────────────────────────────────────────────
    if (now < s.shockEndsAt) {
      const remaining = clamp((s.shockEndsAt - now) / SHOCK_DURATION, 0, 1);
      const pulse = 0.7 + Math.sin(now * 0.015) * 0.3;

      // Glow
      const grd = ctx.createRadialGradient(s.ghost.x, s.ghost.y, 18, s.ghost.x, s.ghost.y, 32);
      grd.addColorStop(0, `rgba(255,0,255,${(0.35 * pulse).toFixed(2)})`);
      grd.addColorStop(1, 'rgba(255,0,255,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(s.ghost.x, s.ghost.y, 32, 0, Math.PI * 2);
      ctx.fill();

      // Ring arc
      ctx.strokeStyle = `rgba(255,40,255,${(0.6 + pulse * 0.4).toFixed(2)})`;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(s.ghost.x, s.ghost.y, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remaining);
      ctx.stroke();
      ctx.lineCap = 'butt';

      // Timer text
      ctx.fillStyle = COLORS.magenta;
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${((s.shockEndsAt - now) / 1000).toFixed(1)}s`, s.ghost.x, s.ghost.y - 32);
    }

    // ── Orb ────────────────────────────────────────────────────────────────
    ctx.fillStyle = COLORS.cyan;
    ctx.beginPath();
    ctx.arc(s.orb.x, s.orb.y, 10, 0, Math.PI * 2);
    ctx.fill();

    // ── Spark ──────────────────────────────────────────────────────────────
    ctx.fillStyle = COLORS.magenta;
    ctx.beginPath();
    ctx.arc(s.spark.x, s.spark.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // ── Floating texts ─────────────────────────────────────────────────────
    s.floatTexts = s.floatTexts.filter((ft) => ft.ttl > 0);
    for (const ft of s.floatTexts) {
      const life = ft.ttl / ft.maxTtl;
      const dy = (1 - life) * 60;
      ctx.globalAlpha = life * 1.0;
      ctx.font = 'bold 22px system-ui';
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.magenta;
      ctx.shadowColor = COLORS.magenta;
      ctx.shadowBlur = 12;
      ctx.fillText(ft.text, ft.x, ft.y - dy);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // ── Blit with camera shake ─────────────────────────────────────────────
    screen.clearRect(0, 0, res.w, res.h);
    screen.imageSmoothingEnabled = false;
    screen.drawImage(buffer, Math.round(cam.dx), Math.round(cam.dy));
  }

  function resolveCardinal(dx: number, dy: number): Direction {
    const s = stateRef.current;
    const dist = Math.hypot(dx, dy);
    if (dist < s.deadzone) return null;
    if (Math.abs(dx) > Math.abs(dy) * 1.35) return dx > 0 ? 'right' : 'left';
    if (Math.abs(dy) > Math.abs(dx) * 1.35) return dy > 0 ? 'down' : 'up';
    return null;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!bufferRef.current) bufferRef.current = document.createElement('canvas');
    const buffer = bufferRef.current;

    canvas.width  = res.w;
    canvas.height = res.h;
    buffer.width  = res.w;
    buffer.height = res.h;

    initSimulation();
    const s = stateRef.current;

    let raf = 0;
    const loop = (now: number) => {
      const dtMs = clamp(now - s.lastMs, 0, 34);
      s.lastMs = now;
      if (phase === 'playing') {
        const dt = dtMs / 1000;
        const scaledDt = dt * s.slowMoScale;
        if (now > s.slowMoUntil) s.slowMoScale = 1;

        // Advance float-text TTLs
        for (const ft of s.floatTexts) ft.ttl -= dtMs;

        updateGhost(scaledDt, now, res.w, res.h);
        updateOrb(scaledDt, res.w, res.h);
        updateSpark(scaledDt, res.w, res.h);
        handleCollisions(now);
      }
      renderFrame(now, canvas, buffer);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [initSimulation, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pointer handlers ───────────────────────────────────────────────────────
  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    soundRef.current.resume();
    if (phase !== 'playing') setPhase('playing');
    const arena = arenaRef.current;
    if (!arena) return;
    arena.setPointerCapture(e.pointerId);
    const { left, top } = arena.getBoundingClientRect();
    const relX = clamp(e.clientX - left, 0, arena.clientWidth);
    const relY = clamp(e.clientY - top, 0, arena.clientHeight);
    const s = stateRef.current;
    s.joystickTouchId = e.pointerId;
    s.joystickBase = { x: relX, y: relY };
    s.joystickKnob = { x: relX, y: relY };
    setJoystickUi({ base: { x: relX, y: relY }, knob: { x: relX, y: relY } });
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const s = stateRef.current;
    if (s.joystickTouchId !== e.pointerId || !s.joystickBase) return;
    const arena = arenaRef.current;
    const rect = arena?.getBoundingClientRect();
    const relX = clamp(e.clientX - (rect?.left ?? 0), 0, arena?.clientWidth ?? res.w);
    const relY = clamp(e.clientY - (rect?.top ?? 0), 0, arena?.clientHeight ?? res.h);
    const dx = relX - s.joystickBase.x;
    const dy = relY - s.joystickBase.y;
    const dir = resolveCardinal(dx, dy);
    if (dir) s.direction = dir;
    const mag = Math.min(46, vec2Length({ x: dx, y: dy }));
    const ang = Math.atan2(dy, dx);
    s.joystickKnob = { x: s.joystickBase.x + Math.cos(ang) * mag, y: s.joystickBase.y + Math.sin(ang) * mag };
    setJoystickUi({ base: s.joystickBase, knob: s.joystickKnob });
  };

  const onPointerEnd: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const s = stateRef.current;
    if (s.joystickTouchId !== e.pointerId) return;
    arenaRef.current?.releasePointerCapture(e.pointerId);
    s.joystickTouchId = -1; s.joystickBase = null; s.joystickKnob = null;
    setJoystickUi(null);
  };

  // ── JSX ───────────────────────────────────────────────────────────────────
  const level = Math.floor((goal - 70) / 10) + 1;

  return (
    <div className="vg-page">
      <div className="vg-shell">
        <header className="vg-hud">
          <span className="vg-stat"><span className="vg-lbl">Score</span><span className="vg-val">{score.toLocaleString()}</span></span>
          <span className="vg-stat"><span className="vg-lbl">High Score</span><span className="vg-val">{highScore.toLocaleString()}</span></span>
          <span className="vg-stat"><span className="vg-lbl">Level</span><span className="vg-val">{level}</span></span>
          <span className="vg-stat"><span className="vg-lbl">Lives</span><span className="vg-val">{lives}</span></span>
          <span className="vg-stat"><span className="vg-lbl">Fill</span><span className="vg-val">{captured.toFixed(1)}%</span></span>
        </header>

        <div
          ref={arenaRef}
          className="vg-arena"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          <canvas ref={canvasRef} className="vg-canvas" />

          {joystickUi && (
            <div className="vg-joystick-root">
              <div className="vg-joystick-base" style={{ left: joystickUi.base.x, top: joystickUi.base.y }} />
              <div className="vg-joystick-knob" style={{ left: joystickUi.knob.x, top: joystickUi.knob.y }} />
            </div>
          )}

          {phase !== 'playing' && (
            <div className="vg-overlay">
              {phase === 'start' ? (
                <>
                  <h2>VoltGrid</h2>
                  <p>Drag anywhere inside the cabinet to move 👻 and trap the orb.</p>
                  <p className="vg-overlay-hint">Tap the arena to begin.</p>
                </>
              ) : (
                <>
                  <h2>Game Over</h2>
                  <p>Final Score: {score.toLocaleString()}</p>
                  <button
                    type="button"
                    className="vg-btn"
                    onClick={() => {
                      resetRun();
                      setPhase('start');
                    }}
                  >
                    Play Again
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .vg-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          background: ${COLORS.deepSpace};
          user-select: none;
        }
        .vg-shell {
          width: min(calc(100vw - 20px), calc(100dvh - 112px), 800px);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .vg-hud {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 6px 18px;
          padding: 10px 14px;
          width: 100%;
          box-sizing: border-box;
          border: 1px solid rgba(0,255,255,0.45);
          border-radius: 14px;
          background: ${COLORS.hudBg};
          backdrop-filter: blur(10px);
          font: 600 11px/1.4 system-ui;
          color: ${COLORS.white};
        }
        .vg-stat { display: flex; align-items: center; gap: 4px; }
        .vg-lbl  { opacity: 0.5; text-transform: uppercase; letter-spacing: 0.07em; font-size: 9px; }
        .vg-val  { color: ${COLORS.cyan}; font-size: 12px; }
        .vg-arena {
          position: relative;
          width: 100%;
          max-width: 800px;
          aspect-ratio: 1 / 1;
          border: 1px solid rgba(0,255,255,0.2);
          border-radius: 4px;
          overflow: hidden;
          touch-action: none;
        }
        .vg-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          max-width: 800px;
          height: 100%;
          aspect-ratio: 1 / 1;
          object-fit: contain;
          display: block;
          image-rendering: pixelated;
          image-rendering: crisp-edges;
        }
        .vg-joystick-root {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 5;
        }
        .vg-joystick-base,
        .vg-joystick-knob {
          position: absolute;
          transform: translate(-50%, -50%);
          border-radius: 999px;
        }
        .vg-joystick-base {
          width: 96px;
          height: 96px;
          background: rgba(0,255,255,0.18);
          border: 2px solid rgba(0,255,255,0.45);
        }
        .vg-joystick-knob {
          width: 42px;
          height: 42px;
          background: rgba(255,0,255,0.65);
          border: 2px solid rgba(255,255,255,0.7);
        }
        .vg-overlay {
          position: absolute;
          inset: 0;
          z-index: 6;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          text-align: center;
          color: ${COLORS.white};
          background: rgba(5, 5, 16, 0.72);
          border: 1px solid rgba(0,255,255,0.42);
          backdrop-filter: blur(10px);
          padding: 24px;
        }
        .vg-overlay h2 {
          margin: 0;
          font-size: 32px;
          letter-spacing: 0.06em;
          color: ${COLORS.cyan};
          text-shadow: 0 0 14px rgba(0,255,255,0.45);
        }
        .vg-overlay p { margin: 0; max-width: 32ch; opacity: 0.95; }
        .vg-overlay-hint { color: ${COLORS.magenta}; }
        .vg-btn {
          border: 1px solid rgba(255,0,255,0.65);
          background: rgba(255,0,255,0.15);
          color: ${COLORS.white};
          padding: 8px 14px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
