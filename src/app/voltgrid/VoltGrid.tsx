'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VoltGridAudio } from './audio';
import { useBoardLayout } from './game/board/useBoardLayout';
import { stepSimulation } from './game/engine/simulation';
import { VoltGridHud } from './game/hud/VoltGridHud';
import { PhaseOverlay } from './game/hud/PhaseOverlay';
import { useInputController } from './game/input/useInputController';
import { renderFrame } from './game/rendering/renderer';
import { createStore, frameSnapshotFromState, reduceStore } from './game/state/store';
import type { FrameSnapshot } from './game/types/interfaces';

export default function VoltGrid() {
  const shellRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const audioRef = useRef<VoltGridAudio>(new VoltGridAudio());
  const initialStore = useMemo(() => createStore(), []);
  const storeRef = useRef(initialStore);

  const { inputRef, onKeyDown, onKeyUp, pointerHandlers, reset } = useInputController();
  const { board } = useBoardLayout(shellRef, hudRef);

  const [snapshot, setSnapshot] = useState<FrameSnapshot>(() => frameSnapshotFromState(initialStore.state));
  const [muted, setMuted] = useState(false);

  const syncSnapshot = useCallback(() => {
    setSnapshot(frameSnapshotFromState(storeRef.current.state));
  }, []);

  const boot = useCallback(() => {
    storeRef.current = reduceStore(storeRef.current, { type: 'boot' });
    reset();
    syncSnapshot();
  }, [reset, syncSnapshot]);

  const start = useCallback(async () => {
    await audioRef.current.ensureReady();
    storeRef.current = reduceStore(storeRef.current, { type: 'start' });
    reset();
    syncSnapshot();
  }, [reset, syncSnapshot]);

  const restart = useCallback(async () => {
    boot();
    await start();
  }, [boot, start]);

  useEffect(() => {
    document.body.classList.add('voltgrid-body-lock');
    return () => {
      document.body.classList.remove('voltgrid-body-lock');
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = board.pixelWidth;
    canvas.height = board.pixelHeight;
  }, [board.pixelHeight, board.pixelWidth]);

  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent): void => {
      if (event.key === ' ') {
        if (storeRef.current.state.phase === 'start') void start();
        return;
      }

      if (event.key === 'p' || event.key === 'P') {
        const phase = storeRef.current.state.phase;
        if (phase === 'playing') {
          storeRef.current = reduceStore(storeRef.current, {
            type: 'replace',
            next: { ...storeRef.current.state, phase: 'paused' },
          });
        } else if (phase === 'paused') {
          storeRef.current = reduceStore(storeRef.current, {
            type: 'replace',
            next: { ...storeRef.current.state, phase: 'playing' },
          });
        }
        syncSnapshot();
        return;
      }

      onKeyDown(event);
    };

    const onWindowKeyUp = (event: KeyboardEvent): void => {
      onKeyUp(event);
    };

    const onBlur = (): void => {
      reset();
    };

    window.addEventListener('keydown', onWindowKeyDown, { passive: false });
    window.addEventListener('keyup', onWindowKeyUp);
    window.addEventListener('blur', onBlur);

    const tick = (now: number): void => {
      const canvasCtx = canvasRef.current?.getContext('2d');
      const canvasEl = canvasRef.current;
      if (!canvasCtx || !canvasEl) return;

      const dtMs = lastTimeRef.current ? now - lastTimeRef.current : 16;
      lastTimeRef.current = now;

      const result = stepSimulation(storeRef.current.state, inputRef.current, dtMs);
      storeRef.current = reduceStore(storeRef.current, { type: 'replace', next: result.state });

      if (result.clearPointerInput) {
        reset();
      }

      result.events.forEach((event) => audioRef.current.play(event));
      syncSnapshot();
      renderFrame(canvasCtx, storeRef.current.state, canvasEl.width, canvasEl.height, now);

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('keydown', onWindowKeyDown);
      window.removeEventListener('keyup', onWindowKeyUp);
      window.removeEventListener('blur', onBlur);
      cancelAnimationFrame(frameRef.current);
    };
  }, [inputRef, onKeyDown, onKeyUp, reset, start, syncSnapshot]);

  return (
    <div ref={shellRef} className="voltgrid-shell text-cyan-100 select-none" style={{ touchAction: 'none', overscrollBehavior: 'none' }}>
      <VoltGridHud
        snapshot={snapshot}
        muted={muted}
        onRestart={() => void restart()}
        onToggleMuted={() => {
          void audioRef.current.ensureReady().then(() => {
            const next = !muted;
            setMuted(next);
            audioRef.current.setMuted(next);
          });
        }}
        hudRef={hudRef}
      />

      <main ref={boardRef} className="relative min-h-0 flex-1 overflow-hidden" style={{ height: `${board.height}px` }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          onPointerDown={async (event) => {
            await audioRef.current.ensureReady();
            if (storeRef.current.state.phase === 'start') await start();
            pointerHandlers.onPointerDown(event);
          }}
          onPointerMove={pointerHandlers.onPointerMove}
          onPointerUp={pointerHandlers.onPointerUp}
          onPointerCancel={pointerHandlers.onPointerCancel}
          onContextMenu={(event) => event.preventDefault()}
        />

        <PhaseOverlay
          snapshot={snapshot}
          onStart={() => void start()}
          onRestart={() => void restart()}
          onResume={() => {
            storeRef.current = reduceStore(storeRef.current, {
              type: 'replace',
              next: { ...storeRef.current.state, phase: 'playing' },
            });
            syncSnapshot();
          }}
        />
      </main>

      <div className="voltgrid-status">{snapshot.statusText}</div>
    </div>
  );
}
