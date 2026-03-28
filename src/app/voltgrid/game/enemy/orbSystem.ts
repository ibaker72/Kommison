import type { GameState } from '../types/interfaces';

/**
 * Phase 1 foundation: orb logic remains delegated to legacy loop.
 * Phase 3 will replace this with a multi-orb system.
 */
export const getOrbSnapshot = (state: GameState) => state.orb;
