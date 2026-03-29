'use client';

import type { PointerHandlers } from '../types/view';

interface VoltGridBoardProps {
  boardHeight: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  pointerHandlers: PointerHandlers;
  onPrimingInput: () => Promise<void>;
}

export const VoltGridBoard = ({ boardHeight, canvasRef, pointerHandlers, onPrimingInput }: VoltGridBoardProps) => (
  <main className="relative min-h-0 flex-1 overflow-hidden" style={{ height: `${boardHeight}px` }}>
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
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
