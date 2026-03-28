import type { GameEvent, GamePhase, GameState, InputState } from '../../types';

export interface VoltGridViewport {
  width: number;
  height: number;
  hudHeight: number;
  safeAreaTop: number;
  safeAreaBottom: number;
}

export interface BoardLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
  dpr: number;
}

export interface FrameSnapshot {
  phase: GamePhase;
  lives: number;
  revealPct: number;
  statusText: string;
}

export interface SimulationResult {
  state: GameState;
  events: GameEvent[];
  clearPointerInput?: boolean;
}

export type { GameEvent, GamePhase, GameState, InputState };
