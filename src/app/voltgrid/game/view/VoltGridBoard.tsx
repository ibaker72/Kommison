'use client';

import type { PointerHandlers } from '../types/view';

interface VoltGridBoardProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  pointerHandlers: PointerHandlers;
  onPrimingInput: () => Promise<void>;
}

export const VoltGridBoard = ({ canvasRef, pointerHandlers, onPrimingInput }: VoltGridBoardProps) => (
  <main className="voltgrid-board-surface">
    <canvas
      ref={canvasRef}
      className="voltgrid-board-canvas"
      onPointerDown={async (event) => {
        await onPrimingInput();
        pointerHandlers.onPointerDown(event);
      }}
      onPointerMove={pointerHandlers.onPointerMove}
      onPointerUp={pointerHandlers.onPointerUp}
      onPointerCancel={pointerHandlers.onPointerCancel}
      onContextMenu={(event) => event.preventDefault()}
    />
  </main>
);
