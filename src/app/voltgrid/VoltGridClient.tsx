'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { VoltGridEngine } from './engine';
import { renderVoltGrid } from './renderer';
import type { Direction, GameSnapshot, Phase } from './types';

const TARGET_PCT = 75;

export default function VoltGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<VoltGridEngine | null>(null);
  const animRef = useRef(0);
  const lastTimeRef = useRef(0);
  const dirRef = useRef<Direction>('none');
  const touchRef = useRef<{ active: boolean; startX: number; startY: number; id: number | null }>({
    active: false, startX: 0, startY: 0, id: null,
  });

  const [snap, setSnap] = useState<GameSnapshot>({
    score: 0, highScore: 0, lives: 3, level: 1,
    capturedPct: 0, phase: 'menu', fuseActive: false,
    fuseTimer: 0, drawing: false,
  });

  const getEngine = useCallback(() => {
    if (!engineRef.current) engineRef.current = new VoltGridEngine();
    return engineRef.current;
  }, []);

  // ─── Game loop ─────────────────────────────────────────────
  useEffect(() => {
    const engine = getEngine();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const loop = (ts: number) => {
      const dt = Math.min((ts - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = ts;

      engine.update(dt);

      // Only trigger React re-render when snapshot values actually change
      const newSnap = engine.getSnapshot();
      setSnap(prev => {
        if (
          prev.score === newSnap.score &&
          prev.highScore === newSnap.highScore &&
          prev.lives === newSnap.lives &&
          prev.level === newSnap.level &&
          prev.capturedPct === newSnap.capturedPct &&
          prev.phase === newSnap.phase &&
          prev.fuseActive === newSnap.fuseActive &&
          Math.abs(prev.fuseTimer - newSnap.fuseTimer) < 50 &&
          prev.drawing === newSnap.drawing
        ) {
          return prev; // Same reference → no re-render
        }
        return newSnap;
      });

      renderVoltGrid(canvas, engine, ts);
      animRef.current = requestAnimationFrame(loop);
    };
    lastTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animRef.current);
  }, [getEngine]);

  // ─── Keyboard ──────────────────────────────────────────────
  useEffect(() => {
    const engine = getEngine();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (engine.phase === 'menu' || engine.phase === 'gameover') {
        if (e.key === 'Enter' || e.key === ' ') {
          engine.startGame();
          setSnap(engine.getSnapshot()); // Force immediate re-render
          return;
        }
      }
      if (engine.phase !== 'playing') return;

      let dir: Direction = 'none';
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': dir = 'up'; break;
        case 'ArrowDown': case 's': case 'S': dir = 'down'; break;
        case 'ArrowLeft': case 'a': case 'A': dir = 'left'; break;
        case 'ArrowRight': case 'd': case 'D': dir = 'right'; break;
        default: return;
      }
      engine.setDirection(dir);
      dirRef.current = dir;
      e.preventDefault();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const keyDirMap: Record<string, Direction> = {
        ArrowUp: 'up', w: 'up', W: 'up',
        ArrowDown: 'down', s: 'down', S: 'down',
        ArrowLeft: 'left', a: 'left', A: 'left',
        ArrowRight: 'right', d: 'right', D: 'right',
      };
      if (keyDirMap[e.key] && dirRef.current === keyDirMap[e.key]) {
        engine.setDirection('none');
        dirRef.current = 'none';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [getEngine]);

  // ─── Touch (dynamic joystick) ──────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const engine = getEngine();
    if (engine.phase === 'menu' || engine.phase === 'gameover') {
      engine.startGame();
      setSnap(engine.getSnapshot()); // Force immediate re-render
      return;
    }
    if (engine.phase !== 'playing') return;

    const touch = e.touches[0];
    touchRef.current = { active: true, startX: touch.clientX, startY: touch.clientY, id: touch.identifier };
    e.preventDefault();
  }, [getEngine]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const engine = getEngine();
    if (!touchRef.current.active) return;

    const touch = Array.from(e.touches).find(t => t.identifier === touchRef.current.id);
    if (!touch) return;

    const dx = touch.clientX - touchRef.current.startX;
    const dy = touch.clientY - touchRef.current.startY;
    const deadzone = 14;

    if (Math.abs(dx) < deadzone && Math.abs(dy) < deadzone) {
      engine.setDirection('none');
      return;
    }

    const dir: Direction = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down' : 'up');
    engine.setDirection(dir);
    dirRef.current = dir;
    e.preventDefault();
  }, [getEngine]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    touchRef.current.active = false;
    getEngine().setDirection('none');
    dirRef.current = 'none';
    e.preventDefault();
  }, [getEngine]);

  const startGame = useCallback(() => {
    const engine = getEngine();
    engine.startGame();
    setSnap(engine.getSnapshot()); // Force immediate re-render to dismiss overlay
  }, [getEngine]);

  const phaseIs = (...phases: Phase[]) => phases.includes(snap.phase);

  return (
    <div
      style={{
        width: '100vw', height: '100dvh',
        background: '#05050a',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Courier New', monospace",
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* ─── HUD ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: 'max(env(safe-area-inset-top, 6px), 6px) 12px 6px',
        background: 'linear-gradient(180deg, rgba(0,20,40,0.92) 0%, transparent 100%)',
        color: '#0ff', fontSize: 12, letterSpacing: 2, zIndex: 10,
        flexShrink: 0, flexWrap: 'wrap', gap: '4px 16px',
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ color: '#f0f', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase' }}>
            LVL {snap.level}
          </span>
          <span>
            SCORE <span style={{ color: '#fff', fontWeight: 'bold' }}>{snap.score.toLocaleString()}</span>
          </span>
          <span style={{ color: '#666', fontSize: 11 }}>
            HI {snap.highScore.toLocaleString()}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span>{snap.capturedPct}% / {TARGET_PCT}%</span>
          <span style={{ color: '#f44' }}>
            {'♥'.repeat(Math.max(0, snap.lives))}
            <span style={{ opacity: 0.2 }}>{'♥'.repeat(Math.max(0, 3 - snap.lives))}</span>
          </span>
          {snap.fuseActive && (
            <span style={{
              color: '#f80',
              animation: 'pulse 0.3s infinite',
              fontWeight: 'bold',
            }}>
              ⚡ {((2000 - snap.fuseTimer) / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>

      {/* ─── Game Canvas ─────────────────────────────────────── */}
      <div
        style={{
          flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center',
          position: 'relative', overflow: 'hidden',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }}
        />

        {/* ─── Menu Overlay ──────────────────────────────────── */}
        {snap.phase === 'menu' && (
          <Overlay>
            <Title>VOLTGRID</Title>
            <Subtitle>Claim the Void · Contain the Storm</Subtitle>
            <ActionButton onClick={startGame} color="#0ff">Start</ActionButton>
            <Instructions />
          </Overlay>
        )}

        {/* ─── Game Over Overlay ──────────────────────────────── */}
        {snap.phase === 'gameover' && (
          <Overlay>
            <div style={{ fontSize: 40, fontWeight: 'bold', color: '#f44', textShadow: '0 0 28px rgba(255,50,50,0.5)', marginBottom: 12, letterSpacing: 5 }}>
              GRID FAILURE
            </div>
            <div style={{ color: '#888', fontSize: 13, letterSpacing: 2, marginBottom: 6 }}>
              LEVEL {snap.level} · {snap.capturedPct}% CLAIMED
            </div>
            <div style={{ color: '#fff', fontSize: 26, letterSpacing: 4, marginBottom: 8 }}>
              {snap.score.toLocaleString()}
            </div>
            {snap.score >= snap.highScore && snap.score > 0 && (
              <div style={{ color: '#ff0', fontSize: 13, letterSpacing: 3, marginBottom: 16, animation: 'pulse 1s infinite' }}>
                ★ NEW HIGH SCORE ★
              </div>
            )}
            <ActionButton onClick={startGame} color="#f44">Retry</ActionButton>
          </Overlay>
        )}

        {/* ─── Level Up Overlay ───────────────────────────────── */}
        {snap.phase === 'levelup' && (
          <Overlay dim>
            <div style={{ fontSize: 44, fontWeight: 'bold', color: '#0f0', textShadow: '0 0 36px rgba(0,255,0,0.5)', animation: 'pulse 0.5s infinite', letterSpacing: 5 }}>
              SECTOR CLEARED
            </div>
            <div style={{ color: '#0ff', fontSize: 17, letterSpacing: 3, marginTop: 10 }}>
              ENTERING LEVEL {snap.level + 1}
            </div>
          </Overlay>
        )}

        {/* ─── Death Flash ────────────────────────────────────── */}
        {snap.phase === 'dead' && snap.lives > 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 15, pointerEvents: 'none',
          }}>
            <div style={{ fontSize: 28, color: '#f44', fontWeight: 'bold', letterSpacing: 4, textShadow: '0 0 18px #f00', opacity: 0.85 }}>
              DEREZZ
            </div>
          </div>
        )}
      </div>

      {/* ─── Status Bar ──────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        padding: '4px 12px max(env(safe-area-inset-bottom, 4px), 4px)',
        background: 'linear-gradient(0deg, rgba(0,20,40,0.92) 0%, transparent 100%)',
        color: '#444', fontSize: 10, letterSpacing: 2, zIndex: 10,
        flexShrink: 0, gap: 14,
      }}>
        <span>VOLTGRID</span>
        <span>·</span>
        <span style={{ color: snap.drawing ? '#f0f' : '#0ff' }}>
          {snap.phase === 'playing' ? (snap.drawing ? '▸ DRAWING' : '▸ SAFE') : snap.phase.toUpperCase()}
        </span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// ─── Shared UI Components ────────────────────────────────────────

function Overlay({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      background: dim ? 'rgba(5,5,10,0.7)' : 'rgba(5,5,10,0.92)',
      zIndex: 20,
    }}>
      {children}
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 'clamp(36px, 8vw, 56px)', fontWeight: 'bold', letterSpacing: 8,
      background: 'linear-gradient(135deg, #0ff, #f0f, #ff0)',
      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

function Subtitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      color: '#888', fontSize: 'clamp(11px, 2vw, 14px)', letterSpacing: 3,
      marginBottom: 32, textTransform: 'uppercase',
    }}>
      {children}
    </div>
  );
}

function ActionButton({ children, onClick, color }: { children: React.ReactNode; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: `2px solid ${color}`,
        color,
        padding: '12px 44px',
        fontSize: 17,
        fontFamily: "'Courier New', monospace",
        letterSpacing: 4,
        cursor: 'pointer',
        textTransform: 'uppercase',
        marginBottom: 20,
        borderRadius: 2,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        (e.target as HTMLButtonElement).style.background = color;
        (e.target as HTMLButtonElement).style.color = '#000';
        (e.target as HTMLButtonElement).style.boxShadow = `0 0 28px ${color}66`;
      }}
      onMouseLeave={e => {
        (e.target as HTMLButtonElement).style.background = 'transparent';
        (e.target as HTMLButtonElement).style.color = color;
        (e.target as HTMLButtonElement).style.boxShadow = 'none';
      }}
    >
      {children}
    </button>
  );
}

function Instructions() {
  return (
    <div style={{
      color: '#555', fontSize: 'clamp(10px, 1.6vw, 12px)', textAlign: 'center',
      lineHeight: 2, letterSpacing: 1, maxWidth: 380, padding: '0 16px',
    }}>
      <div style={{ color: '#0ff', marginBottom: 6 }}>⌨ WASD / ARROWS · 📱 TOUCH & DRAG</div>
      <div>Draw lines across the void to capture territory</div>
      <div>Enclose a <span style={{ color: '#f80' }}>Volt Orb</span> for 5,000pt containment kill</div>
      <div>If an orb hits your trail, outrun the <span style={{ color: '#f80' }}>Shock Ball</span> fuse!</div>
      <div>Claim <span style={{ color: '#0f0' }}>{TARGET_PCT}%</span> to advance</div>
    </div>
  );
}