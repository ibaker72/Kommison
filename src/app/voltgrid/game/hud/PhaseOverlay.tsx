import type { FrameSnapshot } from '../types/interfaces';

interface PhaseOverlayProps {
  snapshot: FrameSnapshot;
  onStart: () => void;
  onRestartRun: () => void;
  onNextLevel: () => void;
  onResume: () => void;
}

export const PhaseOverlay = ({ snapshot, onStart, onRestartRun, onNextLevel, onResume }: PhaseOverlayProps) => {
  if (snapshot.flowPhase === 'playing' && snapshot.phase !== 'paused') return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/56 backdrop-blur-[2px] px-4 text-center">
      <div className="w-full max-w-md rounded-2xl border border-cyan-300/25 bg-slate-950/84 p-6 md:p-8 shadow-[0_0_40px_rgba(81,255,226,0.25)]">
        <h2 className="mb-3 text-2xl font-bold tracking-wide text-cyan-200 md:text-3xl">
          {snapshot.flowPhase === 'intro' && 'VoltGrid'}
          {snapshot.flowPhase === 'level-cleared' && 'Level Cleared'}
          {snapshot.flowPhase === 'campaign-won' && 'Campaign Complete'}
          {snapshot.flowPhase === 'game-over' && 'System Overload'}
          {snapshot.phase === 'paused' && 'Paused'}
        </h2>

        <p className="mb-3 text-sm text-cyan-100/70">{snapshot.statusText}</p>
        <p className="mb-5 text-xs text-cyan-300/60">
          Level {snapshot.levelIndex + 1}/{snapshot.levelCount} • Target {snapshot.targetPct}%
        </p>

        {snapshot.flowPhase === 'intro' && (
          <button className="rounded-lg border border-cyan-300/50 px-6 py-2 hover:bg-cyan-500/20" onClick={onStart}>
            Start Run
          </button>
        )}

        {snapshot.flowPhase === 'level-cleared' && (
          <div className="flex items-center justify-center gap-3">
            <button className="rounded-lg border border-cyan-300/50 px-6 py-2 hover:bg-cyan-500/20" onClick={onNextLevel}>
              Next Level
            </button>
            <button className="rounded-lg border border-cyan-300/50 px-6 py-2 hover:bg-cyan-500/20" onClick={onRestartRun}>
              Restart Run
            </button>
          </div>
        )}

        {snapshot.flowPhase === 'campaign-won' && (
          <button className="rounded-lg border border-cyan-300/50 px-6 py-2 hover:bg-cyan-500/20" onClick={onRestartRun}>
            Play Again
          </button>
        )}

        {snapshot.flowPhase === 'game-over' && (
          <button className="rounded-lg border border-cyan-300/50 px-6 py-2 hover:bg-cyan-500/20" onClick={onRestartRun}>
            Restart Run
          </button>
        )}

        {snapshot.phase === 'paused' && (
          <button className="mt-3 rounded-lg border border-cyan-300/50 px-6 py-2 hover:bg-cyan-500/20" onClick={onResume}>
            Resume
          </button>
        )}
      </div>
    </div>
  );
};
