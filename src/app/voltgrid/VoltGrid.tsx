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

  // ─── Input Handling ──────────────────────────────────────────

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

  // ─── Restart ─────────────────────────────────────────────────

  const restart = useCallback(() => {
    resetBackgroundCache();
    stateRef.current = createInitialState();
    inputRef.current = { up: false, down: false, left: false, right: false };
    setRevealPct(0);
    setLives(INITIAL_LIVES);
    setPhase('playing');
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
    <div className="min-h-screen bg-[#050510] text-white flex flex-col items-center justify-center px-3 py-4 sm:px-4 sm:py-6 selection:bg-cyan-500/30">
      {/* Header */}
      <div className="w-full max-w-[700px] mb-3 sm:mb-4">
        <h1 className="text-2xl sm:text-4xl font-bold tracking-[0.25em] text-center bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-500 bg-clip-text text-transparent">
          VOLTGRID
        </h1>
        <p className="text-center text-cyan-600/50 text-[10px] sm:text-xs tracking-[0.4em] mt-0.5 uppercase">
          Territory Capture
        </p>
      </div>

      {/* HUD */}
      <div className="w-full max-w-[700px] flex items-center justify-between mb-2 sm:mb-3 px-1 font-mono text-sm">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-cyan-600/60 text-[10px] sm:text-xs uppercase tracking-wider">Reveal</span>
            <span className="text-cyan-300 font-bold text-base sm:text-lg tabular-nums min-w-[4ch] text-right">
              {revealPct.toFixed(1)}%
            </span>
          </div>
          <div className="h-3.5 w-px bg-cyan-800/30" />
          <div className="flex items-center gap-1">
            <span className="text-cyan-600/50 text-[10px] sm:text-xs uppercase tracking-wider">Goal</span>
            <span className="text-cyan-700/70 text-xs sm:text-sm">{WIN_PERCENTAGE}%</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-cyan-600/60 text-[10px] sm:text-xs uppercase tracking-wider">Lives</span>
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
            className="text-[10px] sm:text-xs px-2.5 sm:px-3 py-0.5 sm:py-1 border border-cyan-800/40 rounded text-cyan-600/70 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors uppercase tracking-wider"
          >
            Restart
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-[700px] mb-2 sm:mb-3">
        <div className="h-1 sm:h-1.5 bg-cyan-950/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-200 shadow-[0_0_8px_rgba(0,255,204,0.4)]"
            style={{ width: `${Math.min(100, (revealPct / WIN_PERCENTAGE) * 100)}%` }}
          />
        </div>
      </div>

      {/* Canvas Container */}
      <div className="relative w-full max-w-[700px] aspect-[600/480] rounded-lg overflow-hidden border border-cyan-900/20 shadow-[0_0_40px_rgba(0,255,204,0.06),inset_0_0_30px_rgba(0,0,0,0.3)]">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          tabIndex={0}
        />

        {/* Win Overlay */}
        {phase === 'won' && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fadeIn">
            <div className="relative">
              <div className="absolute inset-0 blur-2xl bg-cyan-500/20 rounded-full" />
              <div className="relative text-4xl sm:text-5xl font-bold tracking-wider bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-400 bg-clip-text text-transparent mb-3">
                GRID CAPTURED
              </div>
            </div>
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent mb-4" />
            <p className="text-cyan-300/70 text-sm sm:text-base mb-1 tracking-wide">
              {revealPct.toFixed(1)}% territory secured
            </p>
            <p className="text-cyan-700/50 text-xs sm:text-sm mb-6 tracking-wide">
              {lives} {lives === 1 ? 'life' : 'lives'} remaining
            </p>
            <button
              onClick={restart}
              className="group relative px-8 py-2.5 sm:py-3 rounded-lg text-cyan-300 uppercase tracking-[0.2em] text-xs sm:text-sm font-bold transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-cyan-500/15 border border-cyan-500/40 rounded-lg group-hover:bg-cyan-500/25 group-hover:border-cyan-400/60 transition-all" />
              <div className="absolute inset-0 shadow-[0_0_20px_rgba(0,255,204,0.15)] group-hover:shadow-[0_0_30px_rgba(0,255,204,0.25)] transition-all rounded-lg" />
              <span className="relative">Play Again</span>
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {phase === 'lost' && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fadeIn">
            <div className="relative">
              <div className="absolute inset-0 blur-2xl bg-red-500/15 rounded-full" />
              <div className="relative text-4xl sm:text-5xl font-bold tracking-wider bg-gradient-to-r from-red-400 via-orange-300 to-red-500 bg-clip-text text-transparent mb-3">
                OVERLOADED
              </div>
            </div>
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-red-500/30 to-transparent mb-4" />
            <p className="text-red-300/70 text-sm sm:text-base mb-1 tracking-wide">
              Grid breach at {revealPct.toFixed(1)}%
            </p>
            <p className="text-red-700/50 text-xs sm:text-sm mb-6 tracking-wide">
              Target was {WIN_PERCENTAGE}%
            </p>
            <button
              onClick={restart}
              className="group relative px-8 py-2.5 sm:py-3 rounded-lg text-red-300 uppercase tracking-[0.2em] text-xs sm:text-sm font-bold transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-red-500/15 border border-red-500/40 rounded-lg group-hover:bg-red-500/25 group-hover:border-red-400/60 transition-all" />
              <div className="absolute inset-0 shadow-[0_0_20px_rgba(255,80,80,0.15)] group-hover:shadow-[0_0_30px_rgba(255,80,80,0.25)] transition-all rounded-lg" />
              <span className="relative">Try Again</span>
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="w-full max-w-[700px] mt-3 sm:mt-4 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-1 text-cyan-800/50 text-[10px] sm:text-xs tracking-wide">
          <span>
            <kbd className="px-1 sm:px-1.5 py-0.5 bg-cyan-950/30 border border-cyan-900/30 rounded text-[9px] sm:text-[10px] text-cyan-600/60 font-mono">
              WASD
            </kbd>
            {' / '}
            <kbd className="px-1 sm:px-1.5 py-0.5 bg-cyan-950/30 border border-cyan-900/30 rounded text-[9px] sm:text-[10px] text-cyan-600/60 font-mono">
              Arrows
            </kbd>
            {' to move'}
          </span>
          <span className="hidden sm:inline">Trail inward from border</span>
          <span>Return to wall to capture</span>
          <span>Don&apos;t cross your trail</span>
        </div>
      </div>
    </div>
  );
}
