import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  BORDER_THICKNESS,
  GRID_CELL_SIZE,
  TARGET_REVEAL_PERCENT,
} from '../../constants';

export const VOLTGRID_CONFIG = {
  world: {
    width: ARENA_WIDTH,
    height: ARENA_HEIGHT,
    borderThickness: BORDER_THICKNESS,
    cellSize: GRID_CELL_SIZE,
  },
  hud: {
    compactHeightPx: 40,
  },
  goals: {
    revealPercent: TARGET_REVEAL_PERCENT,
  },
} as const;

export const SAFE_AREA_FALLBACK_PX = 0;
