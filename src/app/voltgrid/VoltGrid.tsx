'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { INITIAL_LIVES, TARGET_REVEAL_PERCENT } from './constants';
import { VoltGridAudio } from './audio';
import { createInitialState, startGame, stepGame } from './gameLoop';
import { renderGame } from './render';
import type { GamePhase, GameState, InputState } from './types';

const initialInput: InputState = {
  up: false,
  down: false,
  left: false,
  right: false,
  pointerActive: false,
};

export default function VoltGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const stateRef = useRef<GameState>(createInitialState());
  const inputRef = useRef<InputState>({ ...initialInput });
  const lastTimeRef = useRef<number>(0);
  const pointerIdRef = useRef<number | null>(null);
  const pointerOriginRef = useRef<{ x: number; y: number } | null>(null);
  const audioRef = useRef<VoltGridAudio>(new VoltGridAudio());

  const [phase, setPhase] = useState<GamePhase>('start');
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [revealPct, setRevealPct] = useState(0);
  const [statusText, setStatusText] = useState('Trace, trap, and dominate the grid.');
  const [muted, setMuted] = useState(false);

  const syncHud = useCallback((s: GameState) => {
    setPhase(s.phase);
    setLives(s.player.lives);
    setRevealPct(s.revealPct);
    setStatusText(s.statusText);
  }, []);

  const resetPointerInput = useCallback(() => {
    pointerIdRef.current = null;
    pointerOriginRef.current = null;
    inputRef.current = { ...inputRef.current, up: false, down: false, left: false, right: false, pointerActive: false };
  }, []);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
  }, []);

  const start = useCallback(async () => {
    await audioRef.current.ensureReady();
    const next = startGame();
    stateRef.current = next;
    inputRef.current = { ...initialInput };
    pointerOriginRef.current = null;
    syncHud(next);
  }, [syncHud]);

  const restart = useCallback(async () => {
    stateRef.current = createInitialState();
    resetPointerInput();
    await start();
  }, [resetPointerInput, start]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) e.preventDefault();
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': inputRef.current.up = true; break;
        case 'ArrowDown': case 's': case 'S': inputRef.current.down = true; break;
        case 'ArrowLeft': case 'a': case 'A': inputRef.current.left = true; break;
        case 'ArrowRight': case 'd': case 'D': inputRef.current.right = true; break;
        case ' ': if (stateRef.current.phase === 'start') void start(); break;
        case 'p': case 'P': {
          if (stateRef.current.phase === 'playing') stateRef.current = { ...stateRef.current, phase: 'paused' };
          else if (stateRef.current.phase === 'paused') stateRef.current = { ...stateRef.current, phase: 'playing' };
          syncHud(stateRef.current);
          break;
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent): void => {
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': inputRef.current.up = false; break;
        case 'ArrowDown': case 's': case 'S': inputRef.current.down = false; break;
        case 'ArrowLeft': case 'a': case 'A': inputRef.current.left = false; break;
        case 'ArrowRight': case 'd': case 'D': inputRef.current.right = false; break;
      }
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    window.addEventListener('blur', resetPointerInput);
    resize();

    const loop = (now: number): void => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dtMs = lastTimeRef.current ? now - lastTimeRef.current : 16;
      lastTimeRef.current = now;

      const result = stepGame(stateRef.current, inputRef.current, dtMs);
      stateRef.current = result.state;
      if (result.clearPointerInput) resetPointerInput();
      result.events.forEach((event) => audioRef.current.play(event));
      syncHud(stateRef.current);

      renderGame(ctx, stateRef.current, canvas.width, canvas.height, now);
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', resize);
      window.removeEventListener('blur', resetPointerInput);
      cancelAnimationFrame(frameRef.current);
    };
  }, [resetPointerInput, resize, start, syncHud]);

  const handlePointer = (clientX: number, clientY: number): void => {
    const origin = pointerOriginRef.current;
    if (!origin) return;

    const dx = clientX - origin.x;
    const dy = clientY - origin.y;
    const deadZone = 18;
    const engageDistance = 30;

    if (Math.hypot(dx, dy) < deadZone) {
      inputRef.current.up = false;
      inputRef.current.down = false;
      inputRef.current.left = false;
      inputRef.current.right = false;
      return;
    }

    if (Math.abs(dx) > Math.abs(dy) + engageDistance * 0.16) {
      inputRef.current.left = dx < 0;
      inputRef.current.right = dx > 0;
      inputRef.current.up = false;
      inputRef.current.down = false;
      return;
    }

    inputRef.current.up = dy < 0;
    inputRef.current.down = dy > 0;
    inputRef.current.left = false;
    inputRef.current.right = false;
  };

  return (
    <div className="voltgrid-shell text-cyan-100 select-none" style={{ touchAction: 'none', overscrollBehavior: 'none' }}>
      <header className="voltgrid-hud z-20">
        <div className="flex items-center gap-2">
          <h1 className="text-[10px] font-semibold tracking-[0.28em] text-cyan-200">VOLTGRID</h1>
          <span className="text-[10px] text-cyan-100/85">{revealPct.toFixed(1)}%</span>
          <span className="hidden text-[9px] text-cyan-300/70 sm:inline">Goal {TARGET_REVEAL_PERCENT}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-cyan-100/90">Lives {lives}</span>
          <button className="voltgrid-btn" onClick={() => void restart()}>Restart</button>
          <button
            className="voltgrid-btn"
            onClick={async () => {
              await audioRef.current.ensureReady();
              const next = !muted;
              setMuted(next);
              audioRef.current.setMuted(next);
            }}
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
        </div>
      </header>

      <main className="relative flex-1 min-h-0 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          onPointerDown={async (e) => {
            e.preventDefault();
            await audioRef.current.ensureReady();
            if (stateRef.current.phase === 'start') await start();
            pointerIdRef.current = e.pointerId;
            pointerOriginRef.current = { x: e.clientX, y: e.clientY };
            inputRef.current.pointerActive = true;
            handlePointer(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (pointerIdRef.current !== e.pointerId) return;
            e.preventDefault();
            handlePointer(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (pointerIdRef.current !== e.pointerId) return;
            e.preventDefault();
            resetPointerInput();
          }}
          onPointerCancel={() => {
            resetPointerInput();
          }}
          onContextMenu={(e) => e.preventDefault()}
        />

        {(phase === 'start' || phase === 'won' || phase === 'lost' || phase === 'paused') && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/56 backdrop-blur-[2px] px-4 text-center">
            <div className="w-full max-w-md rounded-2xl border border-cyan-300/25 bg-slate-950/84 p-6 md:p-8 shadow-[0_0_40px_rgba(81,255,226,0.25)]">
              <h2 className="mb-3 text-2xl font-bold tracking-wide text-cyan-200 md:text-3xl">
                {phase === 'start' && 'VoltGrid'}
                {phase === 'won' && 'Grid Secured'}
                {phase === 'lost' && 'System Overload'}
                {phase === 'paused' && 'Paused'}
              </h2>
              <p className="mb-5 text-sm text-cyan-100/70">{statusText}</p>
              <div className="mb-5 text-xs text-cyan-300/60">Keyboard: Arrows / WASD • Touch: drag from touch-down point, release to stop.</div>
              {phase === 'start' && <button className="rounded-lg border border-cyan-300/50 px-6 py-2 hover:bg-cyan-500/20" onClick={() => void start()}>Start Mission</button>}
              {(phase === 'won' || phase === 'lost') && <button className="rounded-lg border border-cyan-300/50 px-6 py-2 hover:bg-cyan-500/20" onClick={() => void restart()}>Play Again</button>}
              {phase === 'paused' && (
                <button
                  className="rounded-lg border border-cyan-300/50 px-6 py-2 hover:bg-cyan-500/20"
                  onClick={() => {
                    stateRef.current = { ...stateRef.current, phase: 'playing' };
                    syncHud(stateRef.current);
                  }}
                >
                  Resume
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      <div className="voltgrid-status">{statusText}</div>
    </div>
  );
}
