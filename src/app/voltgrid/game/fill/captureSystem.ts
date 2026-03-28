import type { GameState } from '../types/interfaces';

/**
 * Phase 1 foundation: capture logic remains delegated to legacy loop.
 * Phase 4 will move robust region partitioning here.
 */
export const getCaptureGrid = (state: GameState) => state.captured;
