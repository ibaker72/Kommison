import { createInitialState, startGame } from '../../gameLoop';
import type { FrameSnapshot, GameState } from '../types/interfaces';

export interface VoltGridStore {
  state: GameState;
}

export type StoreAction =
  | { type: 'boot' }
  | { type: 'start' }
  | { type: 'replace'; next: GameState };

export const createStore = (): VoltGridStore => ({
  state: createInitialState(),
});

export const reduceStore = (store: VoltGridStore, action: StoreAction): VoltGridStore => {
  if (action.type === 'boot') {
    return { state: createInitialState() };
  }

  if (action.type === 'start') {
    return { state: startGame() };
  }

  return { state: action.next };
};

export const frameSnapshotFromState = (state: GameState): FrameSnapshot => ({
  phase: state.phase,
  lives: state.player.lives,
  revealPct: state.revealPct,
  statusText: state.statusText,
});
