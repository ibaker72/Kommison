'use client';

import { PhaseOverlay, VoltGridHud } from './game/hud';
import { useVoltGridGame } from './game/engine/useVoltGridGame';
import { VoltGridBoard } from './game/view/VoltGridBoard';

export default function VoltGrid() {
  const {
    shellRef,
    hudRef,
    canvasRef,
    snapshot,
    muted,
    fullscreen,
    pointerHandlers,
    start,
    restart,
    toggleMuted,
    toggleFullscreen,
    nextLevel,
    resume,
  } = useVoltGridGame();

  return (
    <section ref={shellRef} className="voltgrid-shell text-cyan-100 select-none" style={{ touchAction: 'none', overscrollBehavior: 'none' }}>
      <VoltGridHud
        snapshot={snapshot}
        muted={muted}
        fullscreen={fullscreen}
        onRestart={() => void restart()}
        onToggleMuted={toggleMuted}
        onToggleFullscreen={toggleFullscreen}
        hudRef={hudRef}
      />

      <div className="voltgrid-playfield-shell">
        <VoltGridBoard
          canvasRef={canvasRef}
          pointerHandlers={pointerHandlers}
          onPrimingInput={async () => {
            if (snapshot.flowPhase === 'intro') await start();
          }}
        />

        <PhaseOverlay
          snapshot={snapshot}
          onStart={() => void start()}
          onRestartRun={() => void restart()}
          onNextLevel={nextLevel}
          onResume={resume}
        />

        <div className="voltgrid-status">{snapshot.statusText}</div>
      </div>
    </section>
  );
}
