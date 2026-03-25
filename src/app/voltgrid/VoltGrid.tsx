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

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
  }, []);

  const start = useCallback(async () => {
    await audioRef.current.ensureReady();
    const next = startGame();
    stateRef.current = next;
    inputRef.current = { ...initialInput };
    syncHud(next);
  }, [syncHud]);

  const restart = useCallback(async () => {
    stateRef.current = createInitialState();
    await start();
  }, [start]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
        e.preventDefault();
      }
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
      cancelAnimationFrame(frameRef.current);
    };
  }, [resize, start, syncHud]);

  const handlePointer = (clientX: number, clientY: number): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = clientX - (rect.left + rect.width / 2);
    const cy = clientY - (rect.top + rect.height / 2);
    const deadZone = 16;

    if (Math.hypot(cx, cy) < deadZone) {
      inputRef.current.up = false;
      inputRef.current.down = false;
      inputRef.current.left = false;
      inputRef.current.right = false;
      return;
    }

    if (Math.abs(cx) > Math.abs(cy)) {
      inputRef.current.left = cx < 0;
      inputRef.current.right = cx > 0;
      inputRef.current.up = false;
      inputRef.current.down = false;
    } else {
      inputRef.current.up = cy < 0;
      inputRef.current.down = cy > 0;
      inputRef.current.left = false;
      inputRef.current.right = false;
    }
  };

  return (
    <div className="fixed inset-0 bg-[#03040d] text-cyan-100 overflow-hidden select-none" style={{ touchAction: 'none', overscrollBehavior: 'none' }}>
      <div className="absolute inset-0 flex flex-col">
        <header className="h-14 md:h-16 px-4 md:px-6 flex items-center justify-between border-b border-cyan-400/15 bg-black/35 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-sm md:text-base font-semibold tracking-[0.32em] text-cyan-300">VOLTGRID</h1>
            <span className="text-xs md:text-sm text-cyan-200/70">{revealPct.toFixed(1)}%</span>
            <span className="text-xs text-cyan-500/80">Target {TARGET_REVEAL_PERCENT}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm text-cyan-200/80">Lives {lives}</span>
            <button className="px-3 py-1 text-xs rounded border border-cyan-400/40 hover:bg-cyan-500/20" onClick={() => void restart()}>
              Restart
            </button>
            <button
              className="px-3 py-1 text-xs rounded border border-cyan-400/40 hover:bg-cyan-500/20"
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

        <main className="relative flex-1 min-h-0">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            onPointerDown={async (e) => {
              e.preventDefault();
              await audioRef.current.ensureReady();
              if (stateRef.current.phase === 'start') {
                await start();
              }
              pointerIdRef.current = e.pointerId;
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
              pointerIdRef.current = null;
              inputRef.current = { ...inputRef.current, up: false, down: false, left: false, right: false, pointerActive: false };
            }}
            onPointerCancel={() => {
              pointerIdRef.current = null;
              inputRef.current = { ...inputRef.current, up: false, down: false, left: false, right: false, pointerActive: false };
            }}
            onContextMenu={(e) => e.preventDefault()}
          />

          {(phase === 'start' || phase === 'won' || phase === 'lost' || phase === 'paused') && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 backdrop-blur-sm px-4 text-center">
              <div className="w-full max-w-md rounded-2xl border border-cyan-300/20 bg-slate-950/80 p-6 md:p-8 shadow-[0_0_50px_rgba(81,255,226,0.2)]">
                <h2 className="text-2xl md:text-3xl font-bold text-cyan-200 mb-3 tracking-wide">
                  {phase === 'start' && 'VoltGrid'}
                  {phase === 'won' && 'Grid Secured'}
                  {phase === 'lost' && 'System Overload'}
                  {phase === 'paused' && 'Paused'}
                </h2>
                <p className="text-sm text-cyan-100/70 mb-6">{statusText}</p>
                <div className="text-xs text-cyan-300/60 mb-6">Keyboard: Arrows / WASD • Touch: drag anywhere, release to stop.</div>
                {phase === 'start' && (
                  <button className="px-6 py-2 rounded-lg border border-cyan-300/50 hover:bg-cyan-500/20" onClick={() => void start()}>
                    Start Mission
                  </button>
                )}
                {(phase === 'won' || phase === 'lost') && (
                  <button className="px-6 py-2 rounded-lg border border-cyan-300/50 hover:bg-cyan-500/20" onClick={() => void restart()}>
                    Play Again
                  </button>
                )}
                {phase === 'paused' && (
                  <button
                    className="px-6 py-2 rounded-lg border border-cyan-300/50 hover:bg-cyan-500/20"
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

          <div className="absolute bottom-0 left-0 right-0 z-20 px-4 py-2 text-[11px] md:text-xs text-cyan-300/65 bg-gradient-to-t from-black/70 to-transparent">
            {statusText}
          </div>
        </main>
      </div>
    </div>
  );
}
