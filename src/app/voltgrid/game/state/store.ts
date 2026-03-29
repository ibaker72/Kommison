import { createInitialState, startGame, buildOrbs, buildSparks } from '../../gameLoop';
import { getLevelDefinition } from '../levels/definitions';
import type { CampaignState, FrameSnapshot, GameState } from '../types/interfaces';

const withLevel = (base: GameState, levelIndex: number): GameState => {
  const level = getLevelDefinition(levelIndex);
  return {
    ...base,
    statusText: `Level ${levelIndex + 1} • ${level.label}`,
    player: {
      ...base.player,
      lives: level.lives,
      speed: level.playerSpeed,
    },
    orbs: buildOrbs(level.orbCount, level.orbSpeed),
    sparks: buildSparks(level.sparkCount, level.sparkSpeed),
  };
};

const createLevelState = (levelIndex: number): CampaignState => {
  const base = startGame();
  const core = withLevel(base, levelIndex);
  return {
    core,
    flowPhase: 'playing',
    levelIndex,
  };
};

export interface VoltGridStore {
  state: CampaignState;
}

export type StoreAction =
  | { type: 'boot' }
  | { type: 'start-run' }
  | { type: 'replace-core'; next: GameState }
  | { type: 'next-level' }
  | { type: 'restart-level' };

export const createStore = (): VoltGridStore => ({
  state: {
    core: createInitialState(),
    flowPhase: 'intro',
    levelIndex: 0,
  },
});

export const reduceStore = (store: VoltGridStore, action: StoreAction): VoltGridStore => {
  if (action.type === 'boot') return createStore();
  if (action.type === 'start-run') return { state: createLevelState(0) };

  if (action.type === 'replace-core') {
    const level = getLevelDefinition(store.state.levelIndex);
    const nextCore = action.next;

    if (nextCore.player.lives <= 0 || nextCore.phase === 'lost') {
      return {
        state: {
          ...store.state,
          core: { ...nextCore, phase: 'lost', statusText: 'Game Over — reactor collapsed.' },
          flowPhase: 'game-over',
        },
      };
    }

    if (nextCore.revealPct >= level.targetRevealPercent) {
      return {
        state: {
          ...store.state,
          core: {
            ...nextCore,
            phase: 'won',
            statusText: `Level ${store.state.levelIndex + 1} complete. Sector stabilized.`,
          },
          flowPhase: 'level-cleared',
        },
      };
    }

    return { state: { ...store.state, core: nextCore, flowPhase: 'playing' } };
  }

  if (action.type === 'next-level') return { state: createLevelState(store.state.levelIndex + 1) };

  return { state: createLevelState(store.state.levelIndex) };
};

export const frameSnapshotFromState = (state: CampaignState): FrameSnapshot => {
  const level = getLevelDefinition(state.levelIndex);

  return {
    phase: state.core.phase,
    flowPhase: state.flowPhase,
    levelIndex: state.levelIndex,
    levelLabel: level.label,
    levelCount: null,
    lives: state.core.player.lives,
    revealPct: state.core.revealPct,
    targetPct: level.targetRevealPercent,
    statusText: state.core.statusText,
    score: state.core.score,
    orbCount: level.orbCount,
    sparkCount: level.sparkCount,
  };
};
