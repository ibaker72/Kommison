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
export const PLAYER_BORDER_SPEED = 240;
export const PLAYER_TRAIL_SPEED = 200;
export const PLAYER_HIT_RADIUS = 10;

export const ORB_RADIUS = 11;
export const ORB_SPEED = 180;

export const CHASER_RADIUS = 7;
export const CHASER_SPEED = 260;

export const INITIAL_LIVES = 3;
export const TARGET_REVEAL_PERCENT = 72;
export const RESPAWN_INVULN_MS = 1200;

export const TRAIL_POINT_SPACING = 4;
export const TRAIL_HIT_WIDTH = 4;

export const SHAKE_MS = 220;

export const PALETTE = {
  pageBg: '#03040d',
  arenaBg: '#0b0f23',
  border: '#51ffe2',
  borderGlow: 'rgba(81,255,226,0.7)',
  grid: 'rgba(81,255,226,0.1)',
  trail: '#ff4dff',
  trailGlow: 'rgba(255,77,255,0.7)',
  infectedTrail: '#ff5d66',
  capturedFill: 'rgba(64, 255, 225, 0.16)',
  orb: '#ffcf52',
  orbGlow: 'rgba(255,207,82,0.7)',
  chaser: '#ff4d6d',
  chaserGlow: 'rgba(255,77,109,0.8)',
};
