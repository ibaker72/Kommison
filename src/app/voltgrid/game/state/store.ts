import { ORB_RADIUS } from '../../constants';
import { createInitialState, startGame } from '../../gameLoop';
import type { Orb, Vec2 } from '../../types';
import { VOLTGRID_LEVELS, type LevelDefinition } from '../levels/definitions';
import type { CampaignState, FrameSnapshot, GameState } from '../types/interfaces';

const ORB_SPAWN_POINTS: Vec2[] = [
  { x: 240, y: 230 },
  { x: 720, y: 315 },
  { x: 690, y: 160 },
  { x: 330, y: 360 },
];

const normalize = (x: number, y: number): Vec2 => {
  const len = Math.hypot(x, y);
  if (len <= 0.0001) return { x: 1, y: 0 };
  return { x: x / len, y: y / len };
};

const createOrbSet = (count: number, speed: number): Orb[] => {
  const orbs: Orb[] = [];
  for (let i = 0; i < count; i++) {
    const spawn = ORB_SPAWN_POINTS[i % ORB_SPAWN_POINTS.length];
    const angle = ((Math.PI * 2) / Math.max(1, count)) * i + Math.PI * 0.18;
    const n = normalize(Math.cos(angle), Math.sin(angle));
    orbs.push({
      pos: { ...spawn },
      vel: { x: n.x * speed, y: n.y * speed },
      radius: ORB_RADIUS,
    });
  }
  return orbs;
};

const withLevel = (base: GameState, level: LevelDefinition): GameState => ({
  ...base,
  statusText: `Level ${level.id.replace('lvl-0', '')} • ${level.label}`,
  player: {
    ...base.player,
    lives: level.lives,
  },
  orbs: createOrbSet(level.orbCount, level.orbSpeed),
});

const createLevelState = (levelIndex: number): CampaignState => {
  const level = VOLTGRID_LEVELS[levelIndex];
  const base = startGame();
  const core = withLevel(base, level);
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
  if (action.type === 'boot') {
    return createStore();
  }

  if (action.type === 'start-run') {
    return {
      state: createLevelState(0),
    };
  }

  if (action.type === 'replace-core') {
    const level = VOLTGRID_LEVELS[store.state.levelIndex];
    const nextCore = action.next;

    if (nextCore.player.lives <= 0 || nextCore.phase === 'lost') {
      return {
        state: {
          ...store.state,
          core: { ...nextCore, phase: 'lost', statusText: 'Run failed. Reactor collapsed.' },
          flowPhase: 'game-over',
        },
      };
    }

    if (nextCore.revealPct >= level.targetRevealPercent) {
      const nextFlow = store.state.levelIndex >= VOLTGRID_LEVELS.length - 1 ? 'campaign-won' : 'level-cleared';
      return {
        state: {
          ...store.state,
          core: {
            ...nextCore,
            phase: 'won',
            statusText: nextFlow === 'campaign-won' ? 'All sectors secured.' : `${level.label} cleared.`,
          },
          flowPhase: nextFlow,
        },
      };
    }

    return {
      state: {
        ...store.state,
        core: nextCore,
        flowPhase: 'playing',
      },
    };
  }

  if (action.type === 'next-level') {
    const nextIndex = Math.min(VOLTGRID_LEVELS.length - 1, store.state.levelIndex + 1);
    return {
      state: createLevelState(nextIndex),
    };
  }

  const level = store.state.levelIndex;
  return {
    state: createLevelState(level),
  };
};

export const frameSnapshotFromState = (state: CampaignState): FrameSnapshot => {
  const level = VOLTGRID_LEVELS[state.levelIndex];

  return {
    phase: state.core.phase,
    flowPhase: state.flowPhase,
    levelIndex: state.levelIndex,
    levelLabel: level.label,
    levelCount: VOLTGRID_LEVELS.length,
    lives: state.core.player.lives,
    revealPct: state.core.revealPct,
    targetPct: level.targetRevealPercent,
    statusText: state.core.statusText,
  };
};
