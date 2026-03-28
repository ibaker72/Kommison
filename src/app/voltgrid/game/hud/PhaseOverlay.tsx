import type { FrameSnapshot } from '../types/interfaces';

interface PhaseOverlayProps {
  snapshot: FrameSnapshot;
  onStart: () => void;
  onRestart: () => void;
  onResume: () => void;
}

export const PhaseOverlay = ({ snapshot, onStart, onRestart, onResume }: PhaseOverlayProps) => {
  if (!['start', 'won', 'lost', 'paused'].includes(snapshot.phase)) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/56 backdrop-blur-[2px] px-4 text-center">
      <div className="w-full max-w-md rounded-2xl border border-cyan-300/25 bg-slate-950/84 p-6 md:p-8 shadow-[0_0_40px_rgba(81,255,226,0.25)]">
        <h2 className="mb-3 text-2xl font-bold tracking-wide text-cyan-200 md:text-3xl">
          {snapshot.phase === 'start' && 'VoltGrid'}
          {snapshot.phase === 'won' && 'Grid Secured'}
          {snapshot.phase === 'lost' && 'System Overload'}
          {snapshot.phase === 'paused' && 'Paused'}
        </h2>
        <p className="mb-5 text-sm text-cyan-100/70">{snapshot.statusText}</p>
        <div className="mb-5 text-xs text-cyan-300/60">Keyboard: Arrows / WASD • Touch: drag from touch-down point, release to stop.</div>
        {snapshot.phase === 'start' && <button className="rounded-lg border border-cyan-300/50 px-6 py-2 hover:bg-cyan-500/20" onClick={onStart}>Start Mission</button>}
        {(snapshot.phase === 'won' || snapshot.phase === 'lost') && (
          <button className="rounded-lg border border-cyan-300/50 px-6 py-2 hover:bg-cyan-500/20" onClick={onRestart}>Play Again</button>
        )}
        {snapshot.phase === 'paused' && (
          <button className="rounded-lg border border-cyan-300/50 px-6 py-2 hover:bg-cyan-500/20" onClick={onResume}>Resume</button>
        )}
      </div>
    </div>
  );
};
