import type { GameState } from '../types/interfaces';

/**
 * Phase 1 foundation: player simulation remains delegated to legacy loop.
 * Phase 2 will move deterministic movement rules here.
 */
export const getPlayerSnapshot = (state: GameState) => state.player;
