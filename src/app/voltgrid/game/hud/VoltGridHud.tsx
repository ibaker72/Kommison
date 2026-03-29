import type { RefObject } from 'react';
import type { FrameSnapshot } from '../types/interfaces';

interface VoltGridHudProps {
  snapshot: FrameSnapshot;
  muted: boolean;
  fullscreen: boolean;
  onRestart: () => void;
  onToggleMuted: () => void;
  onToggleFullscreen: () => void;
  hudRef: RefObject<HTMLElement | null>;
}

export const VoltGridHud = ({ snapshot, muted, fullscreen, onRestart, onToggleMuted, onToggleFullscreen, hudRef }: VoltGridHudProps) => (
  <header ref={hudRef} className="voltgrid-hud z-20">
    <div className="flex items-center gap-2 min-w-0">
      <h1 className="text-[10px] font-semibold tracking-[0.28em] text-cyan-200">VOLTGRID</h1>
      <span className="text-[10px] text-cyan-100/90">L{snapshot.levelIndex + 1}</span>
      <span className="text-[10px] text-cyan-100/85">{snapshot.revealPct.toFixed(1)}%</span>
      <span className="hidden text-[9px] text-cyan-300/70 sm:inline">Goal {snapshot.targetPct}%</span>
      <span className="hidden text-[9px] text-cyan-300/70 md:inline">Score {snapshot.score}</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-cyan-100/90">Lives {snapshot.lives}</span>
      <button className="voltgrid-btn" onClick={onRestart}>Restart</button>
      <button className="voltgrid-btn" onClick={onToggleMuted}>{muted ? 'Unmute' : 'Mute'}</button>
      <button className="voltgrid-btn" onClick={onToggleFullscreen}>{fullscreen ? 'Window' : 'Fullscreen'}</button>
    </div>
  </header>
);
