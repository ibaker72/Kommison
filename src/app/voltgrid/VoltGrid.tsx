'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { InputState, GameState } from './types';
import { ARENA_WIDTH, ARENA_HEIGHT, WIN_PERCENTAGE } from './constants';
import { createInitialState, updateGame } from './gameLoop';
import { render } from './render';

// ─── VoltGrid Game Component ──────────────────────────────────────

export default function VoltGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const inputRef = useRef<InputState>({ up: false, down: false, left: false, right: false });
  const animFrameRef = useRef<number>(0);

  const [revealPct, setRevealPct] = useState(0);
  const [lives, setLives] = useState(stateRef.current.player.lives);
  const [phase, setPhase] = useState(stateRef.current.phase);

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
    stateRef.current = createInitialState();
    inputRef.current = { up: false, down: false, left: false, right: false };
    setRevealPct(0);
    setLives(stateRef.current.player.lives);
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

    canvas.width = w * window.devicePixelRatio;
    canvas.height = h * window.devicePixelRatio;
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
      // Update state
      stateRef.current = updateGame(stateRef.current, inputRef.current);

      // Sync React state (throttled via RAF)
      const s = stateRef.current;
      setRevealPct(s.revealPercentage);
      setLives(s.player.lives);
      setPhase(s.phase);

      // Render
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
    <div className="min-h-screen bg-[#050510] text-white flex flex-col items-center justify-center px-4 py-6 selection:bg-cyan-500/30">
      {/* Header */}
      <div className="w-full max-w-[700px] mb-4">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-widest text-center bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-500 bg-clip-text text-transparent drop-shadow-lg">
          VOLTGRID
        </h1>
        <p className="text-center text-cyan-500/60 text-xs tracking-[0.3em] mt-1 uppercase">
          Territory Capture
        </p>
      </div>

      {/* HUD */}
      <div className="w-full max-w-[700px] flex items-center justify-between mb-3 px-1 font-mono text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-cyan-500/70 text-xs uppercase tracking-wider">Reveal</span>
            <span className="text-cyan-300 font-bold text-lg tabular-nums min-w-[4ch] text-right">
              {revealPct.toFixed(1)}%
            </span>
          </div>
          <div className="h-4 w-px bg-cyan-800/40" />
          <div className="flex items-center gap-2">
            <span className="text-cyan-500/70 text-xs uppercase tracking-wider">Target</span>
            <span className="text-cyan-600 text-sm">{WIN_PERCENTAGE}%</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-cyan-500/70 text-xs uppercase tracking-wider">Lives</span>
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    i < lives
                      ? 'bg-cyan-400 shadow-[0_0_6px_rgba(0,255,204,0.6)]'
                      : 'bg-cyan-900/40'
                  }`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={restart}
            className="text-xs px-3 py-1 border border-cyan-800/50 rounded text-cyan-500/80 hover:text-cyan-300 hover:border-cyan-600/60 transition-colors uppercase tracking-wider"
          >
            Restart
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-[700px] mb-3">
        <div className="h-1.5 bg-cyan-950/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(0,255,204,0.4)]"
            style={{ width: `${Math.min(100, (revealPct / WIN_PERCENTAGE) * 100)}%` }}
          />
        </div>
      </div>

      {/* Canvas Container */}
      <div className="relative w-full max-w-[700px] aspect-[600/480] rounded-lg overflow-hidden border border-cyan-900/30 shadow-[0_0_30px_rgba(0,255,204,0.08)]">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          tabIndex={0}
        />

        {/* Win Overlay */}
        {phase === 'won' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fadeIn">
            <div className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent mb-2">
              GRID CAPTURED
            </div>
            <p className="text-cyan-400/80 text-lg mb-1">
              {revealPct.toFixed(1)}% territory secured
            </p>
            <p className="text-cyan-600/60 text-sm mb-6">
              Lives remaining: {lives}
            </p>
            <button
              onClick={restart}
              className="px-8 py-3 bg-cyan-500/20 border border-cyan-500/50 rounded-lg text-cyan-300 hover:bg-cyan-500/30 hover:border-cyan-400/60 transition-all uppercase tracking-widest text-sm font-bold shadow-[0_0_20px_rgba(0,255,204,0.2)]"
            >
              Play Again
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {phase === 'lost' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fadeIn">
            <div className="text-5xl font-bold bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent mb-2">
              OVERLOADED
            </div>
            <p className="text-red-400/80 text-lg mb-1">
              Grid breach at {revealPct.toFixed(1)}%
            </p>
            <p className="text-red-600/60 text-sm mb-6">
              Target was {WIN_PERCENTAGE}%
            </p>
            <button
              onClick={restart}
              className="px-8 py-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 hover:bg-red-500/30 hover:border-red-400/60 transition-all uppercase tracking-widest text-sm font-bold shadow-[0_0_20px_rgba(255,80,80,0.2)]"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="w-full max-w-[700px] mt-4 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-cyan-700/60 text-xs tracking-wide">
          <span>
            <kbd className="px-1.5 py-0.5 bg-cyan-900/20 border border-cyan-800/30 rounded text-[10px] text-cyan-500/80 font-mono">
              WASD
            </kbd>
            {' / '}
            <kbd className="px-1.5 py-0.5 bg-cyan-900/20 border border-cyan-800/30 rounded text-[10px] text-cyan-500/80 font-mono">
              Arrows
            </kbd>
            {' '}Move
          </span>
          <span>Move inward to create trail</span>
          <span>Return to border to capture</span>
          <span>Avoid the orb!</span>
        </div>
      </div>
    </div>
  );
}
