'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { VoltGridEngine } from './core/engine';
import { renderVoltGrid } from './core/renderer';
import type { GameSnapshot, Vec2 } from './core/types';

const EMPTY_SNAPSHOT: GameSnapshot = {
  score: 0,
  highScore: 0,
  lives: 3,
  stage: 1,
  capturedPct: 0,
  targetPct: 70,
  combo: 0,
  phase: 'ready',
  pulse: 0,
  shake: 0,
  floatTexts: [],
  touchVector: null,
};

async function vibrate(style: 'light' | 'medium' | 'heavy'): Promise<void> {
  try {
    const cap = (globalThis as { Capacitor?: { Plugins?: { Haptics?: { impact: (args: { style: string }) => Promise<void> } } } }).Capacitor;
    const mapped = style === 'light' ? 'LIGHT' : style === 'medium' ? 'MEDIUM' : 'HEAVY';
    if (cap?.Plugins?.Haptics?.impact) {
      await cap.Plugins.Haptics.impact({ style: mapped });
      return;
    }
    if (navigator.vibrate) {
      navigator.vibrate(style === 'light' ? 12 : style === 'medium' ? 24 : 42);
    }
  } catch {
    // no-op for browser sessions without haptics
  }
}

export default function VoltGrid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<VoltGridEngine | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(EMPTY_SNAPSHOT);
  const [touchOrigin, setTouchOrigin] = useState<Vec2 | null>(null);

  useEffect(() => {
    const engine = new VoltGridEngine({
      onSnapshot: (next) => setSnapshot(next),
      onCapture: () => {
        void vibrate('medium');
      },
      onDeath: () => {
        void vibrate('heavy');
      },
      onStageClear: () => {
        void vibrate('heavy');
      },
    });
    engineRef.current = engine;
    engine.start();

    let raf = 0;
    const paint = (time: number) => {
      const canvas = canvasRef.current;
      if (canvas && engineRef.current) {
        renderVoltGrid(canvas, engineRef.current.getState(), time / 1000);
      }
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);

    return () => {
      cancelAnimationFrame(raf);
      engine.stop();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') engine.setDirection('up');
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') engine.setDirection('down');
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') engine.setDirection('left');
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') engine.setDirection('right');
      if (event.key.toLowerCase() === 'p') engine.togglePause();
      if (event.key.toLowerCase() === 'r') engine.restart();
      if (event.key === ' ') {
        if (snapshot.phase === 'ready' || snapshot.phase === 'gameOver') engine.startRun();
        else if (snapshot.phase === 'stageClear') engine.advanceStage();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [snapshot.phase]);

  const overlay = useMemo(() => {
    if (snapshot.phase === 'ready') {
      return {
        title: 'VOLTGRID',
        subtitle: 'Carve the arena. Survive the voltage.',
        action: 'Start Run',
      };
    }
    if (snapshot.phase === 'paused') {
      return {
        title: 'PAUSED',
        subtitle: 'Signal suspended.',
        action: 'Resume',
      };
    }
    if (snapshot.phase === 'stageClear') {
      return {
        title: 'SECTOR SEALED',
        subtitle: `Target breached at ${snapshot.capturedPct.toFixed(1)}%`,
        action: 'Next Stage',
      };
    }
    if (snapshot.phase === 'gameOver') {
      return {
        title: 'SYSTEM LOST',
        subtitle: `High Score ${snapshot.highScore}`,
        action: 'Retry',
      };
    }
    return null;
  }, [snapshot]);

  const onOverlayAction = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (snapshot.phase === 'ready') engine.startRun();
    else if (snapshot.phase === 'paused') engine.togglePause();
    else if (snapshot.phase === 'stageClear') engine.advanceStage();
    else if (snapshot.phase === 'gameOver') engine.restart();
  }, [snapshot.phase]);

  const handleTouchStart = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const origin = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    setTouchOrigin(origin);
  }, []);

  const handleTouchMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' || !touchOrigin) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const dx = event.clientX - rect.left - touchOrigin.x;
      const dy = event.clientY - rect.top - touchOrigin.y;
      const maxLen = Math.max(40, Math.hypot(dx, dy));
      const vector = { x: dx / maxLen, y: dy / maxLen };
      engineRef.current?.setTouchVector(vector);
    },
    [touchOrigin],
  );

  const handleTouchEnd = useCallback(() => {
    setTouchOrigin(null);
    engineRef.current?.setTouchVector(null);
  }, []);

  return (
    <section className="voltgrid-shell" aria-label="VoltGrid arcade arena">
      <canvas ref={canvasRef} className="voltgrid-board-canvas" />

      <header className="voltgrid-hud premium-panel">
        <div className="hud-block"><span>Score</span><strong>{snapshot.score}</strong></div>
        <div className="hud-block"><span>Lives</span><strong>{snapshot.lives}</strong></div>
        <div className="hud-block"><span>Stage</span><strong>{snapshot.stage}</strong></div>
        <div className="hud-block"><span>Capture</span><strong>{snapshot.capturedPct.toFixed(1)}%</strong></div>
        <div className="hud-block"><span>Target</span><strong>{snapshot.targetPct}%</strong></div>
        <button className="voltgrid-action" onClick={() => engineRef.current?.togglePause()}>{snapshot.phase === 'paused' ? 'Resume' : 'Pause'}</button>
      </header>

      <footer className="voltgrid-status premium-panel">
        <div>Combo x{Math.max(1, snapshot.combo)}</div>
        <div>High {snapshot.highScore}</div>
        <div>WASD / Arrows · Drag anywhere to steer</div>
      </footer>

      <div
        className="voltgrid-touch-layer"
        onPointerDown={handleTouchStart}
        onPointerMove={handleTouchMove}
        onPointerUp={handleTouchEnd}
        onPointerCancel={handleTouchEnd}
      >
        {touchOrigin ? <div className="touch-orb" style={{ left: touchOrigin.x, top: touchOrigin.y }} /> : null}
      </div>

      {overlay ? (
        <div className="voltgrid-overlay">
          <div className="overlay-card premium-panel">
            <p className="overlay-kicker">Neon Territory Protocol</p>
            <h2>{overlay.title}</h2>
            <p>{overlay.subtitle}</p>
            <button className="voltgrid-action" onClick={onOverlayAction}>{overlay.action}</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
