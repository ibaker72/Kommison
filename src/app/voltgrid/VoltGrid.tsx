'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Vec2 = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };

type Direction = 'up' | 'down' | 'left' | 'right' | null;

const COLORS = {
  deepSpace: '#050510',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  white: '#dffbff',
  hudBg: 'rgba(5, 5, 16, 0.68)',
} as const;

const INTERNAL_RES = {
  portrait: { w: 600, h: 900 },
  landscape: { w: 900, h: 600 },
} as const;

const GRID = 30;
const GHOST_SPEED = 210;
const ORB_SPEED = 165;
const SPARK_SPEED = 150;
const SHOCK_DURATION = 2000;
const SLOW_MO_DURATION = 500;
const HIGH_SCORE_KEY = 'voltgrid:high-score';

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function length(v: Vec2) {
  return Math.hypot(v.x, v.y);
}

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

export default function VoltGrid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bufferRef = useRef<HTMLCanvasElement | null>(null);

  const [portrait, setPortrait] = useState(true);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [goal, setGoal] = useState(70);
  const [captured, setCaptured] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const stored = Number.parseInt(window.localStorage.getItem(HIGH_SCORE_KEY) ?? '0', 10);
    return Number.isFinite(stored) ? stored : 0;
  });
  const [joystickUi, setJoystickUi] = useState<{ base: Vec2; knob: Vec2 } | null>(null);

  const stateRef = useRef({
    ghost: { x: GRID, y: GRID } as Vec2,
    orb: { x: 0, y: 0 } as Vec2,
    orbVel: { x: ORB_SPEED, y: ORB_SPEED } as Vec2,
    spark: { x: 0, y: 0 } as Vec2,
    sparkVel: { x: -SPARK_SPEED, y: SPARK_SPEED } as Vec2,
    direction: 'right' as Direction,
    trail: [] as Vec2[],
    captureRects: [] as Rect[],
    shockEndsAt: 0,
    slowMoUntil: 0,
    slowMoScale: 1,
    joystickTouchId: -1,
    joystickBase: null as Vec2 | null,
    joystickKnob: null as Vec2 | null,
    deadzone: 24,
    lastMs: 0,
  });

  const res = useMemo(
    () => (portrait ? INTERNAL_RES.portrait : INTERNAL_RES.landscape),
    [portrait],
  );

  useEffect(() => {
    const handleResize = () => {
      setPortrait(window.innerHeight > window.innerWidth);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function updateGhost(dt: number, width: number, height: number) {
    const s = stateRef.current;
    if (!s.direction) return;

    const velocity: Vec2 =
      s.direction === 'up'
        ? { x: 0, y: -GHOST_SPEED }
        : s.direction === 'down'
          ? { x: 0, y: GHOST_SPEED }
          : s.direction === 'left'
            ? { x: -GHOST_SPEED, y: 0 }
            : { x: GHOST_SPEED, y: 0 };

    const next = {
      x: clamp(s.ghost.x + velocity.x * dt, GRID * 0.5, width - GRID * 0.5),
      y: clamp(s.ghost.y + velocity.y * dt, GRID * 0.5, height - GRID * 0.5),
    };

    const onWall =
      next.x <= GRID || next.x >= width - GRID || next.y <= GRID || next.y >= height - GRID;

    if (!onWall) {
      s.trail.push({ ...next });
    } else if (s.trail.length > 4) {
      const xs = s.trail.map((p) => p.x);
      const ys = s.trail.map((p) => p.y);
      const rect: Rect = {
        x: clamp(Math.min(...xs), GRID, width - GRID * 2),
        y: clamp(Math.min(...ys), GRID, height - GRID * 2),
        w: clamp(Math.max(...xs) - Math.min(...xs), GRID, width - GRID * 2),
        h: clamp(Math.max(...ys) - Math.min(...ys), GRID, height - GRID * 2),
      };
      s.captureRects.push(rect);
      s.trail = [];
      const gain = Math.floor((rect.w * rect.h) / 900);
      setScore((old) => old + gain);
      setCaptured((old) => clamp(old + gain / 15, 0, 100));
      if (navigator.vibrate) navigator.vibrate(50);

      if (pointInRect(s.orb, rect)) {
        s.orb = { x: width * 0.5, y: height * 0.5 };
        s.slowMoScale = 0.5;
        s.slowMoUntil = performance.now() + SLOW_MO_DURATION;
        setScore((old) => old + 400);
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

  function loseLife() {
    setLives((old) => {
      const next = Math.max(0, old - 1);
      return next;
    });
    if (navigator.vibrate) navigator.vibrate(50);
  }

  function handleCollisions(now: number) {
    const s = stateRef.current;

    if (s.trail.length > 1) {
      for (let i = 1; i < s.trail.length; i += 1) {
        const a = s.trail[i - 1];
        const b = s.trail[i];
        if (lineDistance(s.orb, a, b) < 11) {
          s.shockEndsAt = now + SHOCK_DURATION;
        }
      }
    }

    if (Math.hypot(s.orb.x - s.ghost.x, s.orb.y - s.ghost.y) < 18) {
      loseLife();
      s.orb = { x: res.w * 0.5, y: res.h * 0.6 };
    }

    if (Math.hypot(s.spark.x - s.ghost.x, s.spark.y - s.ghost.y) < 18) {
      loseLife();
      s.spark = { x: res.w * 0.8, y: res.h * 0.3 };
    }

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

  function renderFrame(
    now: number,
    canvas: HTMLCanvasElement,
    buffer: HTMLCanvasElement,
  ) {
    const s = stateRef.current;
    const ctx = buffer.getContext('2d');
    const screen = canvas.getContext('2d');
    if (!ctx || !screen) return;

    ctx.clearRect(0, 0, res.w, res.h);
    ctx.fillStyle = COLORS.deepSpace;
    ctx.fillRect(0, 0, res.w, res.h);

    ctx.strokeStyle = 'rgba(0,255,255,0.4)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= res.w; x += GRID) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, res.h);
      ctx.stroke();
    }
    for (let y = 0; y <= res.h; y += GRID) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(res.w, y);
      ctx.stroke();
    }

    ctx.strokeStyle = COLORS.magenta;
    ctx.lineWidth = 3;
    for (const r of s.captureRects) {
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }

    if (s.trail.length > 1) {
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(s.trail[0].x, s.trail[0].y);
      for (let i = 1; i < s.trail.length; i += 1) ctx.lineTo(s.trail[i].x, s.trail[i].y);
      ctx.stroke();
    }

    // Ghost
    ctx.fillStyle = COLORS.white;
    ctx.beginPath();
    ctx.arc(s.ghost.x, s.ghost.y, 14, Math.PI, 0);
    ctx.lineTo(s.ghost.x + 14, s.ghost.y + 10);
    for (let i = 0; i < 4; i += 1) {
      const waveX = s.ghost.x + 14 - i * 9;
      const waveY = s.ghost.y + (i % 2 === 0 ? 10 : 6);
      ctx.lineTo(waveX, waveY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.deepSpace;
    ctx.beginPath();
    ctx.arc(s.ghost.x - 5, s.ghost.y - 2, 2.1, 0, Math.PI * 2);
    ctx.arc(s.ghost.x + 5, s.ghost.y - 2, 2.1, 0, Math.PI * 2);
    ctx.fill();

    if (now < s.shockEndsAt) {
      const remaining = (s.shockEndsAt - now) / SHOCK_DURATION;
      ctx.strokeStyle = COLORS.magenta;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(
        s.ghost.x,
        s.ghost.y,
        24,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * remaining,
      );
      ctx.stroke();
      ctx.fillStyle = COLORS.magenta;
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${((s.shockEndsAt - now) / 1000).toFixed(1)}s`, s.ghost.x, s.ghost.y - 30);
    }

    ctx.fillStyle = COLORS.cyan;
    ctx.beginPath();
    ctx.arc(s.orb.x, s.orb.y, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.magenta;
    ctx.beginPath();
    ctx.arc(s.spark.x, s.spark.y, 8, 0, Math.PI * 2);
    ctx.fill();

    screen.clearRect(0, 0, res.w, res.h);
    screen.imageSmoothingEnabled = false;
    screen.drawImage(buffer, 0, 0);
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

    canvas.width = res.w;
    canvas.height = res.h;
    buffer.width = res.w;
    buffer.height = res.h;

    const s = stateRef.current;
    s.ghost = { x: GRID, y: GRID };
    s.orb = { x: res.w * 0.5, y: res.h * 0.6 };
    s.spark = { x: res.w * 0.75, y: res.h * 0.35 };
    s.orbVel = { x: ORB_SPEED, y: ORB_SPEED };
    s.sparkVel = { x: -SPARK_SPEED, y: SPARK_SPEED };
    s.trail = [];
    s.captureRects = [];
    s.lastMs = performance.now();

    let raf = 0;

    const loop = (now: number) => {
      const dtMs = clamp(now - s.lastMs, 0, 34);
      s.lastMs = now;
      const dt = dtMs / 1000;
      const scaledDt = dt * s.slowMoScale;

      if (now > s.slowMoUntil) s.slowMoScale = 1;

      updateGhost(scaledDt, res.w, res.h);
      updateOrb(scaledDt, res.w, res.h);
      updateSpark(scaledDt, res.w, res.h);
      handleCollisions(now);
      renderFrame(now, canvas, buffer);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [res.h, res.w]);

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (e.clientX > window.innerWidth * 0.6) return;
    const s = stateRef.current;
    s.joystickTouchId = e.pointerId;
    s.joystickBase = { x: e.clientX, y: e.clientY };
    s.joystickKnob = { x: e.clientX, y: e.clientY };
    setJoystickUi({ base: { x: e.clientX, y: e.clientY }, knob: { x: e.clientX, y: e.clientY } });
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const s = stateRef.current;
    if (s.joystickTouchId !== e.pointerId || !s.joystickBase) return;

    const dx = e.clientX - s.joystickBase.x;
    const dy = e.clientY - s.joystickBase.y;
    const dir = resolveCardinal(dx, dy);
    if (dir) s.direction = dir;

    const mag = Math.min(46, length({ x: dx, y: dy }));
    const ang = Math.atan2(dy, dx);
    s.joystickKnob = {
      x: s.joystickBase.x + Math.cos(ang) * mag,
      y: s.joystickBase.y + Math.sin(ang) * mag,
    };
    setJoystickUi({ base: s.joystickBase, knob: s.joystickKnob });
  };

  const onPointerEnd: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const s = stateRef.current;
    if (s.joystickTouchId !== e.pointerId) return;
    s.joystickTouchId = -1;
    s.joystickBase = null;
    s.joystickKnob = null;
    setJoystickUi(null);
  };

  return (
    <section
      className="voltgrid-shell"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <canvas ref={canvasRef} className="voltgrid-canvas" />

      <div className={portrait ? 'hud hud-bottom' : 'hud hud-top'}>
        <span>Score: {score}</span>
        <span>Lives: {lives}</span>
        <span>Goal: {goal}%</span>
        <span>Captured: {captured.toFixed(1)}%</span>
        <span>High: {highScore}</span>
      </div>

      {joystickUi && (
        <div className="joystick-root">
          <div
            className="joystick-base"
            style={{ left: joystickUi.base.x, top: joystickUi.base.y }}
          />
          <div
            className="joystick-knob"
            style={{ left: joystickUi.knob.x, top: joystickUi.knob.y }}
          />
        </div>
      )}

      <style jsx>{`
        .voltgrid-shell {
          position: fixed;
          inset: 0;
          overflow: hidden;
          background: ${COLORS.deepSpace};
          touch-action: none;
          user-select: none;
        }
        .voltgrid-canvas {
          width: 100vw;
          height: 100vh;
          image-rendering: pixelated;
          image-rendering: crisp-edges;
          display: block;
        }
        .hud {
          position: fixed;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 10px;
          padding: 10px 14px;
          border: 1px solid rgba(0, 255, 255, 0.4);
          border-radius: 14px;
          color: ${COLORS.white};
          background: ${COLORS.hudBg};
          font: 600 12px/1.3 system-ui;
          backdrop-filter: blur(6px);
          z-index: 4;
          flex-wrap: wrap;
          justify-content: center;
        }
        .hud-top {
          top: env(safe-area-inset-top, 8px);
        }
        .hud-bottom {
          bottom: calc(env(safe-area-inset-bottom, 0px) + 12px);
          width: min(96vw, 520px);
        }
        .joystick-root {
          position: fixed;
          inset: 0;
          z-index: 5;
          pointer-events: none;
        }
        .joystick-base,
        .joystick-knob {
          position: absolute;
          transform: translate(-50%, -50%);
          border-radius: 999px;
        }
        .joystick-base {
          width: 96px;
          height: 96px;
          background: rgba(0, 255, 255, 0.18);
          border: 2px solid rgba(0, 255, 255, 0.45);
        }
        .joystick-knob {
          width: 42px;
          height: 42px;
          background: rgba(255, 0, 255, 0.65);
          border: 2px solid rgba(255, 255, 255, 0.7);
        }
      `}</style>
    </section>
  );
}
