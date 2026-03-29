export const ARENA_WIDTH = 960;
export const ARENA_HEIGHT = 540;
export const BORDER_THICKNESS = 8;
export const BORDER_LINE = BORDER_THICKNESS / 2;
export const BORDER_REATTACH_EPSILON = 0.75;
export const DETACH_PUSH_DISTANCE = 2.5;

export const GRID_CELL_SIZE = 6;
export const GRID_COLS = Math.floor(ARENA_WIDTH / GRID_CELL_SIZE);
export const GRID_ROWS = Math.floor(ARENA_HEIGHT / GRID_CELL_SIZE);

export const PLAYER_RADIUS = 12;
export const PLAYER_BORDER_SPEED = 245;
export const PLAYER_TRAIL_SPEED = 210;
export const PLAYER_HIT_RADIUS = 10;

export const ORB_RADIUS = 11;
export const ORB_SPEED = 190;
export const SPARK_RADIUS = 6;

export const INITIAL_LIVES = 3;
export const TARGET_REVEAL_PERCENT = 75;
export const RESPAWN_INVULN_MS = 1200;

export const TRAIL_POINT_SPACING = 4;
export const TRAIL_HIT_WIDTH = 4;

export const SHAKE_MS = 220;

export const PALETTE = {
  pageBg: '#050510',
  arenaBg: '#08173b',
  border: '#60f8ff',
  borderGlow: 'rgba(96,248,255,0.84)',
  grid: 'rgba(119, 222, 255, 0.12)',
  trail: '#6be9ff',
  trailGlow: 'rgba(107,233,255,0.82)',
  capturedFill: 'rgba(0, 255, 255, 0.1)',
  capturedStripe: 'rgba(178, 255, 246, 0.09)',
  orb: '#ff58ff',
  orbGlow: 'rgba(255,88,255,0.86)',
  spark: '#ff3155',
  sparkGlow: 'rgba(255,49,85,0.9)',
};
