import type { StageConfig } from './types';

export const HIGH_SCORE_KEY = 'voltgrid:high-score-v2';
export const RUN_SNAPSHOT_KEY = 'voltgrid:run-snapshot-v1';

export function getStageConfig(stageIndex: number): StageConfig {
  const stage = stageIndex + 1;
  return {
    stage,
    target: Math.min(88, 70 + stageIndex * 2),
    qixSpeed: 13 + stageIndex * 1.7,
    qixTurnRate: 0.75 + stageIndex * 0.08,
    hunterCount: Math.min(5, 1 + Math.floor(stageIndex / 2)),
    hunterSpeed: 16 + stageIndex * 2,
    comboWindow: Math.max(2.5, 5 - stageIndex * 0.25),
  };
}
