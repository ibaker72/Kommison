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

  const [revealPct, setRevealPct] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [phase, setPhase] = useState<GameState['phase']>('playing');
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [hasChaser, setHasChaser] = useState(false);

  // ─── Detect Touch ──────────────────────────────────────────
  // Only show touch controls on actual touch-primary devices (phones/tablets).
  // Laptops with touchscreens still get keyboard controls.

  useEffect(() => {
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const isSmallScreen = window.innerWidth <= 1024;
    // Only default to touch mode if primary pointer is coarse AND screen is small
    if (isCoarsePointer && isSmallScreen) {
      setIsTouchDevice(true);
    }
    // Fallback: if user actually touches, enable touch controls
    window.addEventListener('touchstart', () => {
      if (window.matchMedia('(pointer: coarse)').matches) {
        setIsTouchDevice(true);
      }
    }, { once: true });
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

  // ─── Touch D-Pad ───────────────────────────────────────────

  const setTouchDir = useCallback((dir: 'up' | 'down' | 'left' | 'right' | 'none') => {
    const input = inputRef.current;
    input.up = dir === 'up';
    input.down = dir === 'down';
    input.left = dir === 'left';
    input.right = dir === 'right';
  }, []);

  const handleDpadTouch = useCallback((dir: 'up' | 'down' | 'left' | 'right') => (e: React.TouchEvent) => {
    e.preventDefault();
    setTouchDir(dir);
  }, [setTouchDir]);

  const handleDpadRelease = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setTouchDir('none');
  }, [setTouchDir]);

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

  // ─── Game Loop ──────────────────────────────────────────────

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const loop = (time: number) => {
      stateRef.current = updateGame(stateRef.current, inputRef.current);

      const s = stateRef.current;
      setRevealPct(s.revealPercentage);
      setLives(s.player.lives);
      setPhase(s.phase);
      setHasChaser(s.trailChaser !== null && s.trailChaser.active);

      const canvas = canvasRef.current;
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
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [handleKeyDown, handleKeyUp, resizeCanvas]);

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="h-dvh bg-[#050510] text-white flex flex-col overflow-hidden select-none">

      {/* ── Top HUD ─────────────────────────────────────────── */}
      <div className="shrink-0 px-3 sm:px-6 pt-1 pb-0.5 sm:pt-2 sm:pb-1">
        {/* Title row */}
        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-[0.2em] bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-500 bg-clip-text text-transparent leading-tight">
              VOLTGRID
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-600/50 text-[9px] sm:text-[10px] uppercase tracking-wider">Lives</span>
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
            </div>
            <button
              onClick={restart}
              className="text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-0.5 border border-cyan-800/30 rounded text-cyan-600/60 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors uppercase tracking-wider"
            >
              Restart
            </button>
          </div>
        </div>

        {/* Stats + progress */}
        <div className="flex items-center gap-3 mb-1">
          <span className="text-cyan-300 font-bold text-sm sm:text-base tabular-nums font-mono">
            {revealPct.toFixed(1)}%
          </span>
          <div className="flex-1 h-1 sm:h-1.5 bg-cyan-950/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-200 shadow-[0_0_8px_rgba(0,255,204,0.4)]"
              style={{ width: `${Math.min(100, (revealPct / WIN_PERCENTAGE) * 100)}%` }}
            />
          </div>
          <span className="text-cyan-700/50 text-[10px] sm:text-xs font-mono">{WIN_PERCENTAGE}%</span>
        </div>

        {/* Chaser warning */}
        {hasChaser && (
          <div className="text-center">
            <span className="text-red-400/90 text-[10px] sm:text-xs tracking-wider uppercase animate-pulse font-bold">
              Trail breached — reach the wall!
            </span>
          </div>
        )}
      </div>

      {/* ── Canvas Area (fills remaining space) ─────────────── */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center px-1">
        <div className="relative w-full h-full flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="block rounded-sm"
            tabIndex={0}
          />

          {/* Win Overlay */}
          {phase === 'won' && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-20 animate-fadeIn rounded-sm">
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
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-20 animate-fadeIn rounded-sm">
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

      {/* ── Bottom: Instructions (desktop) / D-pad (touch) ── */}
      <div className="shrink-0 px-3 sm:px-6 pb-1 sm:pb-2 pt-0.5 sm:pt-1">
        {isTouchDevice ? (
          /* Touch D-Pad */
          <div className="flex justify-center">
            <div className="relative w-[140px] h-[140px] sm:w-[160px] sm:h-[160px]">
              {/* Up */}
              <button
                className="dpad-btn absolute top-0 left-1/2 -translate-x-1/2 w-[44px] h-[44px] sm:w-[50px] sm:h-[50px]"
                onTouchStart={handleDpadTouch('up')}
                onTouchEnd={handleDpadRelease}
                onTouchCancel={handleDpadRelease}
              >
                <DpadArrow direction="up" />
              </button>
              {/* Down */}
              <button
                className="dpad-btn absolute bottom-0 left-1/2 -translate-x-1/2 w-[44px] h-[44px] sm:w-[50px] sm:h-[50px]"
                onTouchStart={handleDpadTouch('down')}
                onTouchEnd={handleDpadRelease}
                onTouchCancel={handleDpadRelease}
              >
                <DpadArrow direction="down" />
              </button>
              {/* Left */}
              <button
                className="dpad-btn absolute left-0 top-1/2 -translate-y-1/2 w-[44px] h-[44px] sm:w-[50px] sm:h-[50px]"
                onTouchStart={handleDpadTouch('left')}
                onTouchEnd={handleDpadRelease}
                onTouchCancel={handleDpadRelease}
              >
                <DpadArrow direction="left" />
              </button>
              {/* Right */}
              <button
                className="dpad-btn absolute right-0 top-1/2 -translate-y-1/2 w-[44px] h-[44px] sm:w-[50px] sm:h-[50px]"
                onTouchStart={handleDpadTouch('right')}
                onTouchEnd={handleDpadRelease}
                onTouchCancel={handleDpadRelease}
              >
                <DpadArrow direction="right" />
              </button>
              {/* Center dot */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-900/30 border border-cyan-800/20" />
            </div>
          </div>
        ) : (
          /* Desktop Instructions */
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-0.5 text-cyan-800/40 text-[10px] sm:text-xs tracking-wide">
            <span>
              <kbd className="px-1 py-0.5 bg-cyan-950/20 border border-cyan-900/20 rounded text-[9px] text-cyan-600/50 font-mono">
                Arrows
              </kbd>
              {' / '}
              <kbd className="px-1 py-0.5 bg-cyan-950/20 border border-cyan-900/20 rounded text-[9px] text-cyan-600/50 font-mono">
                WASD
              </kbd>
            </span>
            <span>Trail inward from border</span>
            <span>Reach the wall to capture</span>
            <span className="text-red-700/40">Orb on trail sends a chaser</span>
            <span className="text-red-700/40">Direct orb hit = instant death</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── D-Pad Arrow SVG ──────────────────────────────────────────────

function DpadArrow({ direction }: { direction: 'up' | 'down' | 'left' | 'right' }) {
  const rotation = {
    up: '0',
    right: '90',
    down: '180',
    left: '270',
  }[direction];

  return (
    <svg
      viewBox="0 0 24 24"
      className="w-full h-full"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <polygon
        points="12,4 20,16 4,16"
        fill="rgba(0, 255, 204, 0.25)"
        stroke="rgba(0, 255, 204, 0.5)"
        strokeWidth="1"
      />
    </svg>
  );
}
