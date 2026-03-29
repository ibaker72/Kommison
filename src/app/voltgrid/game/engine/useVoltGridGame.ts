'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VoltGridAudio } from '../../audio';
import { useBoardLayout } from '../board/useBoardLayout';
import { stepSimulation } from './simulation';
import { useInputController } from '../input/useInputController';
import { renderFrame } from '../rendering/renderer';
import { createStore, frameSnapshotFromState, reduceStore } from '../state';
import type { FrameSnapshot } from '../types/interfaces';

export const useVoltGridGame = () => {
  const shellRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLElement>(null);
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
  const [fullscreen, setFullscreen] = useState(false);

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
    storeRef.current = reduceStore(storeRef.current, { type: 'start-run' });
    reset();
    syncSnapshot();
  }, [reset, syncSnapshot]);

  const restart = useCallback(async () => {
    boot();
    await start();
  }, [boot, start]);

  const toggleMuted = useCallback(() => {
    void audioRef.current.ensureReady().then(() => {
      const next = !muted;
      setMuted(next);
      audioRef.current.setMuted(next);
    });
  }, [muted]);

  const resume = useCallback(() => {
    storeRef.current = reduceStore(storeRef.current, {
      type: 'replace-core',
      next: { ...storeRef.current.state.core, phase: 'playing' },
    });
    syncSnapshot();
  }, [syncSnapshot]);

  const nextLevel = useCallback(() => {
    storeRef.current = reduceStore(storeRef.current, { type: 'next-level' });
    reset();
    syncSnapshot();
  }, [reset, syncSnapshot]);

  const toggleFullscreen = useCallback(() => {
    const target = shellRef.current;
    if (!target) return;

    if (!document.fullscreenElement) {
      void target.requestFullscreen?.();
    } else {
      void document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    document.body.classList.add('voltgrid-body-lock');
    return () => {
      document.body.classList.remove('voltgrid-body-lock');
    };
  }, []);

  useEffect(() => {
    const onFsChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
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
        if (storeRef.current.state.flowPhase === 'intro') void start();
        return;
      }

      if (event.key === 'p' || event.key === 'P') {
        const phase = storeRef.current.state.core.phase;
        if (phase === 'playing') {
          storeRef.current = reduceStore(storeRef.current, {
            type: 'replace-core',
            next: { ...storeRef.current.state.core, phase: 'paused' },
          });
        } else if (phase === 'paused') {
          storeRef.current = reduceStore(storeRef.current, {
            type: 'replace-core',
            next: { ...storeRef.current.state.core, phase: 'playing' },
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

      if (storeRef.current.state.flowPhase !== 'playing' && storeRef.current.state.core.phase !== 'paused') {
        renderFrame(canvasCtx, storeRef.current.state.core, canvasEl.width, canvasEl.height, now);
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      const result = stepSimulation(storeRef.current.state.core, inputRef.current, dtMs);
      storeRef.current = reduceStore(storeRef.current, { type: 'replace-core', next: result.state });

      if (result.clearPointerInput) {
        reset();
      }

      result.events.forEach((event) => audioRef.current.play(event));
      syncSnapshot();
      renderFrame(canvasCtx, storeRef.current.state.core, canvasEl.width, canvasEl.height, now);

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

  return {
    shellRef,
    hudRef,
    canvasRef,
    board,
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
  };
};
