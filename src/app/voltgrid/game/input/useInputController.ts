'use client';

import { useCallback, useMemo, useRef } from 'react';
import type { InputState } from '../types/interfaces';

const KEY_SET = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D']);

const createInput = (): InputState => ({
  up: false,
  down: false,
  left: false,
  right: false,
  pointerActive: false,
});

export const useInputController = () => {
  const inputRef = useRef<InputState>(createInput());
  const pointerIdRef = useRef<number | null>(null);
  const pointerOriginRef = useRef<{ x: number; y: number } | null>(null);

  const reset = useCallback(() => {
    pointerIdRef.current = null;
    pointerOriginRef.current = null;
    inputRef.current = createInput();
  }, []);

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (KEY_SET.has(event.key)) event.preventDefault();

    if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') inputRef.current.up = true;
    if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') inputRef.current.down = true;
    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') inputRef.current.left = true;
    if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') inputRef.current.right = true;
  }, []);

  const onKeyUp = useCallback((event: KeyboardEvent) => {
    if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') inputRef.current.up = false;
    if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') inputRef.current.down = false;
    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') inputRef.current.left = false;
    if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') inputRef.current.right = false;
  }, []);

  const applyPointerDirection = useCallback((clientX: number, clientY: number) => {
    const origin = pointerOriginRef.current;
    if (!origin) return;

    const dx = clientX - origin.x;
    const dy = clientY - origin.y;
    const deadZone = 18;

    if (Math.hypot(dx, dy) < deadZone) {
      inputRef.current.up = false;
      inputRef.current.down = false;
      inputRef.current.left = false;
      inputRef.current.right = false;
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      inputRef.current.left = dx < 0;
      inputRef.current.right = dx > 0;
      inputRef.current.up = false;
      inputRef.current.down = false;
      return;
    }

    inputRef.current.up = dy < 0;
    inputRef.current.down = dy > 0;
    inputRef.current.left = false;
    inputRef.current.right = false;
  }, []);

  const pointerHandlers = useMemo(() => ({
    onPointerDown: (event: React.PointerEvent) => {
      event.preventDefault();
      pointerIdRef.current = event.pointerId;
      pointerOriginRef.current = { x: event.clientX, y: event.clientY };
      inputRef.current.pointerActive = true;
      applyPointerDirection(event.clientX, event.clientY);
    },
    onPointerMove: (event: React.PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) return;
      event.preventDefault();
      applyPointerDirection(event.clientX, event.clientY);
    },
    onPointerUp: (event: React.PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) return;
      event.preventDefault();
      reset();
    },
    onPointerCancel: () => {
      reset();
    },
  }), [applyPointerDirection, reset]);

  return {
    inputRef,
    onKeyDown,
    onKeyUp,
    reset,
    pointerHandlers,
  };
};
