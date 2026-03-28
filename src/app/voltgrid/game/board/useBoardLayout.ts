'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import { VOLTGRID_CONFIG } from '../config/constants';
import type { BoardLayout, VoltGridViewport } from '../types/interfaces';

const defaultViewport: VoltGridViewport = {
  width: VOLTGRID_CONFIG.world.width,
  height: VOLTGRID_CONFIG.world.height,
  hudHeight: VOLTGRID_CONFIG.hud.compactHeightPx,
  safeAreaTop: 0,
  safeAreaBottom: 0,
};

const readSafeAreaInset = (name: string): number => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const useBoardLayout = (
  shellRef: RefObject<HTMLDivElement | null>,
  hudRef: RefObject<HTMLElement | null>,
): { viewport: VoltGridViewport; board: BoardLayout } => {
  const [viewport, setViewport] = useState<VoltGridViewport>(defaultViewport);

  useEffect(() => {
    const shellEl = shellRef.current;
    const hudEl = hudRef.current;

    if (!shellEl) {
      return;
    }

    const refresh = (): void => {
      const vv = window.visualViewport;
      const shellRect = shellEl.getBoundingClientRect();
      const hudRect = hudEl?.getBoundingClientRect();

      setViewport({
        width: Math.max(1, vv?.width ?? shellRect.width),
        height: Math.max(1, vv?.height ?? shellRect.height),
        hudHeight: Math.max(VOLTGRID_CONFIG.hud.compactHeightPx, hudRect?.height ?? VOLTGRID_CONFIG.hud.compactHeightPx),
        safeAreaTop: readSafeAreaInset('--voltgrid-safe-top'),
        safeAreaBottom: readSafeAreaInset('--voltgrid-safe-bottom'),
      });
    };

    refresh();

    const observer = new ResizeObserver(refresh);
    observer.observe(shellEl);
    if (hudEl) observer.observe(hudEl);

    window.addEventListener('resize', refresh);
    window.visualViewport?.addEventListener('resize', refresh);
    window.screen.orientation?.addEventListener('change', refresh);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', refresh);
      window.visualViewport?.removeEventListener('resize', refresh);
      window.screen.orientation?.removeEventListener('change', refresh);
    };
  }, [hudRef, shellRef]);

  const board = useMemo<BoardLayout>(() => {
    const playableHeight = Math.max(1, viewport.height - viewport.hudHeight - viewport.safeAreaBottom);
    const dpr = typeof window === 'undefined' ? 1 : Math.min(3, window.devicePixelRatio || 1);
    return {
      x: 0,
      y: viewport.hudHeight,
      width: viewport.width,
      height: playableHeight,
      pixelWidth: Math.floor(viewport.width * dpr),
      pixelHeight: Math.floor(playableHeight * dpr),
      dpr,
    };
  }, [viewport]);

  return { viewport, board };
};
