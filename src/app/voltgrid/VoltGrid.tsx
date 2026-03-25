'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { InputState, GameState } from './types';
import { ARENA_WIDTH, ARENA_HEIGHT, WIN_PERCENTAGE, INITIAL_LIVES } from './constants';
import { createInitialState, updateGame } from './gameLoop';
import { render, resetBackgroundCache } from './render';

// ─── VoltGrid Game Component ──────────────────────────────────────

export default function VoltGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const inputRef = useRef<InputState>({ up: false, down: false, left: false, right: false });
  const animFrameRef = useRef<number>(0);
  const touchOriginRef = useRef<{ x: number; y: number } | null>(null);

  const [revealPct, setRevealPct] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [phase, setPhase] = useState<GameState['phase']>('playing');
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [hasChaser, setHasChaser] = useState(false);

  // ─── Detect Touch ──────────────────────────────────────────
  useEffect(() => {
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const isSmallScreen = window.innerWidth <= 1024;
    if (isCoarsePointer && isSmallScreen) {
      setIsTouchDevice(true);
    }
    const onFirstTouch = () => {
      if (window.matchMedia('(pointer: coarse)').matches) {
        setIsTouchDevice(true);
      }
    };
    window.addEventListener('touchstart', onFirstTouch, { once: true });
    return () => window.removeEventListener('touchstart', onFirstTouch);
  }, []);

  // ─── Keyboard Input ────────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const input = inputRef.current;
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W':
        input.up = true; input.down = false; e.preventDefault(); break;
      case 'ArrowDown': case 's': case 'S':
        input.down = true; input.up = false; e.preventDefault(); break;
      case 'ArrowLeft': case 'a': case 'A':
        input.left = true; input.right = false; e.preventDefault(); break;
      case 'ArrowRight': case 'd': case 'D':
        input.right = true; input.left = false; e.preventDefault(); break;
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const input = inputRef.current;
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': input.up = false; break;
      case 'ArrowDown': case 's': case 'S': input.down = false; break;
      case 'ArrowLeft': case 'a': case 'A': input.left = false; break;
      case 'ArrowRight': case 'd': case 'D': input.right = false; break;
    }
  }, []);

  // ─── Touch Input (virtual joystick, no visible controls) ───
  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchOriginRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (!touchOriginRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchOriginRef.current.x;
    const dy = touch.clientY - touchOriginRef.current.y;

    const deadZone = 8;
    const input = inputRef.current;

    if (Math.abs(dx) < deadZone && Math.abs(dy) < deadZone) {
      return; // Stay in dead zone, keep current direction
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      input.left = dx < 0;
      input.right = dx > 0;
      input.up = false;
      input.down = false;
    } else {
      input.up = dy < 0;
      input.down = dy > 0;
      input.left = false;
      input.right = false;
    }
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    e.preventDefault();
    touchOriginRef.current = null;
    const input = inputRef.current;
    input.up = false;
    input.down = false;
    input.left = false;
    input.right = false;
  }, []);

  // ─── Restart ─────────────────────────────────────────────────
  const restart = useCallback(() => {
    resetBackgroundCache();
    stateRef.current = createInitialState();
    inputRef.current = { up: false, down: false, left: false, right: false };
    setRevealPct(0);
    setLives(INITIAL_LIVES);
    setPhase('playing');
    setHasChaser(false);
  }, []);

  // ─── Canvas Resize ──────────────────────────────────────────
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const maxW = container.clientWidth;
    const maxH = container.clientHeight;
    const ratio = ARENA_WIDTH / ARENA_HEIGHT;

    let w = maxW;
    let h = w / ratio;

    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }, []);

  // ─── Game Loop + Event Binding ─────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', resizeCanvas);

    // Touch events on canvas
    if (canvas) {
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
      canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    }

    resizeCanvas();

    const loop = (time: number) => {
      stateRef.current = updateGame(stateRef.current, inputRef.current);

      const s = stateRef.current;
      setRevealPct(s.revealPercentage);
      setLives(s.player.lives);
      setPhase(s.phase);
      setHasChaser(s.trailChaser !== null && s.trailChaser.active);

      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          render(ctx, s, canvas.width, canvas.height, time);
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', resizeCanvas);
      if (canvas) {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('touchcancel', handleTouchEnd);
      }
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [handleKeyDown, handleKeyUp, handleTouchStart, handleTouchMove, handleTouchEnd, resizeCanvas]);

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="h-dvh bg-[#050510] text-white flex flex-col overflow-hidden select-none">

      {/* ── Slim Top HUD (overlay-style) ──────────────────────── */}
      <div className="shrink-0 px-3 sm:px-5 py-1.5 sm:py-2 z-10">
        <div className="flex items-center justify-between gap-3">
          {/* Title + percentage */}
          <div className="flex items-center gap-3 sm:gap-4">
            <h1 className="text-sm sm:text-lg font-bold tracking-[0.2em] bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-500 bg-clip-text text-transparent leading-tight">
              VOLTGRID
            </h1>
            <span className="text-cyan-300 font-bold text-sm sm:text-base tabular-nums font-mono">
              {revealPct.toFixed(1)}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="flex-1 max-w-[200px] sm:max-w-xs h-1 sm:h-1.5 bg-cyan-950/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-200 shadow-[0_0_8px_rgba(0,255,204,0.4)]"
              style={{ width: `${Math.min(100, (revealPct / WIN_PERCENTAGE) * 100)}%` }}
            />
          </div>

          {/* Lives + restart */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex gap-1">
              {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300 ${
                    i < lives
                      ? 'bg-cyan-400 shadow-[0_0_6px_rgba(0,255,204,0.6)]'
                      : 'bg-cyan-900/30'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={restart}
              className="text-[9px] sm:text-[10px] px-2 py-0.5 border border-cyan-800/30 rounded text-cyan-600/60 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors uppercase tracking-wider"
            >
              Restart
            </button>
          </div>
        </div>

        {/* Chaser warning */}
        {hasChaser && (
          <div className="text-center mt-0.5">
            <span className="text-red-400/90 text-[10px] sm:text-xs tracking-wider uppercase animate-pulse font-bold">
              Trail breached — reach the wall!
            </span>
          </div>
        )}
      </div>

      {/* ── Canvas Area (fills all remaining space) ───────────── */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center">
        <div className="relative w-full h-full flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="block touch-none"
            tabIndex={0}
          />

          {/* Win Overlay */}
          {phase === 'won' && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-20 animate-fadeIn">
              <div className="relative">
                <div className="absolute inset-0 blur-2xl bg-cyan-500/20 rounded-full" />
                <div className="relative text-3xl sm:text-5xl font-bold tracking-wider bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-400 bg-clip-text text-transparent mb-3">
                  GRID CAPTURED
                </div>
              </div>
              <div className="h-px w-24 sm:w-32 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent mb-3 sm:mb-4" />
              <p className="text-cyan-300/70 text-xs sm:text-base mb-1 tracking-wide">
                {revealPct.toFixed(1)}% territory secured
              </p>
              <p className="text-cyan-700/50 text-[10px] sm:text-sm mb-5 sm:mb-6 tracking-wide">
                {lives} {lives === 1 ? 'life' : 'lives'} remaining
              </p>
              <button
                onClick={restart}
                className="group relative px-6 sm:px-8 py-2 sm:py-3 rounded-lg text-cyan-300 uppercase tracking-[0.2em] text-[10px] sm:text-sm font-bold transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-cyan-500/15 border border-cyan-500/40 rounded-lg group-hover:bg-cyan-500/25 group-hover:border-cyan-400/60 transition-all" />
                <div className="absolute inset-0 shadow-[0_0_20px_rgba(0,255,204,0.15)] group-hover:shadow-[0_0_30px_rgba(0,255,204,0.25)] transition-all rounded-lg" />
                <span className="relative">Play Again</span>
              </button>
            </div>
          )}

          {/* Game Over Overlay */}
          {phase === 'lost' && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-20 animate-fadeIn">
              <div className="relative">
                <div className="absolute inset-0 blur-2xl bg-red-500/15 rounded-full" />
                <div className="relative text-3xl sm:text-5xl font-bold tracking-wider bg-gradient-to-r from-red-400 via-orange-300 to-red-500 bg-clip-text text-transparent mb-3">
                  OVERLOADED
                </div>
              </div>
              <div className="h-px w-24 sm:w-32 bg-gradient-to-r from-transparent via-red-500/30 to-transparent mb-3 sm:mb-4" />
              <p className="text-red-300/70 text-xs sm:text-base mb-1 tracking-wide">
                Grid breach at {revealPct.toFixed(1)}%
              </p>
              <p className="text-red-700/50 text-[10px] sm:text-sm mb-5 sm:mb-6 tracking-wide">
                Target was {WIN_PERCENTAGE}%
              </p>
              <button
                onClick={restart}
                className="group relative px-6 sm:px-8 py-2 sm:py-3 rounded-lg text-red-300 uppercase tracking-[0.2em] text-[10px] sm:text-sm font-bold transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-red-500/15 border border-red-500/40 rounded-lg group-hover:bg-red-500/25 group-hover:border-red-400/60 transition-all" />
                <div className="absolute inset-0 shadow-[0_0_20px_rgba(255,80,80,0.15)] group-hover:shadow-[0_0_30px_rgba(255,80,80,0.25)] transition-all rounded-lg" />
                <span className="relative">Try Again</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom: compact desktop hint only ────────────────── */}
      {!isTouchDevice && (
        <div className="shrink-0 px-3 sm:px-5 pb-1.5 sm:pb-2 pt-0.5">
          <div className="flex items-center justify-center gap-4 text-cyan-800/40 text-[10px] sm:text-xs tracking-wide">
            <span>
              <kbd className="px-1 py-0.5 bg-cyan-950/20 border border-cyan-900/20 rounded text-[9px] text-cyan-600/50 font-mono">
                Arrows
              </kbd>
              {' / '}
              <kbd className="px-1 py-0.5 bg-cyan-950/20 border border-cyan-900/20 rounded text-[9px] text-cyan-600/50 font-mono">
                WASD
              </kbd>
              {' to move'}
            </span>
            <span className="hidden sm:inline">Trail inward from border to capture</span>
          </div>
        </div>
      )}
    </div>
  );
}
