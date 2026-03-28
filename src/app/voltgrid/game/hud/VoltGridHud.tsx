import type { RefObject } from 'react';
import { TARGET_REVEAL_PERCENT } from '../../constants';
import type { FrameSnapshot } from '../types/interfaces';

interface VoltGridHudProps {
  snapshot: FrameSnapshot;
  muted: boolean;
  onRestart: () => void;
  onToggleMuted: () => void;
  hudRef: RefObject<HTMLElement | null>;
}

export const VoltGridHud = ({ snapshot, muted, onRestart, onToggleMuted, hudRef }: VoltGridHudProps) => (
  <header ref={hudRef} className="voltgrid-hud z-20">
    <div className="flex items-center gap-2">
      <h1 className="text-[10px] font-semibold tracking-[0.28em] text-cyan-200">VOLTGRID</h1>
      <span className="text-[10px] text-cyan-100/85">{snapshot.revealPct.toFixed(1)}%</span>
      <span className="hidden text-[9px] text-cyan-300/70 sm:inline">Goal {TARGET_REVEAL_PERCENT}%</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-cyan-100/90">Lives {snapshot.lives}</span>
      <button className="voltgrid-btn" onClick={onRestart}>Restart</button>
      <button className="voltgrid-btn" onClick={onToggleMuted}>{muted ? 'Unmute' : 'Mute'}</button>
    </div>
  </header>
);
