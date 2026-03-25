// ─── Game Constants ───────────────────────────────────────────────
export const ARENA_WIDTH = 600;
export const ARENA_HEIGHT = 480;
export const BORDER_WIDTH = 4;

export const PLAYER_SIZE = 18;
export const PLAYER_SPEED_BORDER = 4;
export const PLAYER_SPEED_TRAIL = 3;
export const PLAYER_COLOR = '#00ffcc';
export const PLAYER_GLOW_COLOR = 'rgba(0, 255, 204, 0.8)';
export const PLAYER_HIT_RADIUS = 6;

export const TRAIL_COLOR = '#ff00ff';
export const TRAIL_GLOW_COLOR = 'rgba(255, 0, 255, 0.6)';
export const TRAIL_INFECTED_COLOR = '#ff3333';
export const TRAIL_INFECTED_GLOW = 'rgba(255, 50, 50, 0.7)';
export const TRAIL_WIDTH = 3;

export const ORB_RADIUS = 7;
export const ORB_BASE_SPEED = 2.2;
export const ORB_COLOR = '#ffcc00';
export const ORB_GLOW_COLOR = 'rgba(255, 204, 0, 0.8)';

export const CHASER_SPEED = 4.5;
export const CHASER_RADIUS = 5;
export const CHASER_COLOR = '#ff4444';
export const CHASER_GLOW = 'rgba(255, 68, 68, 0.9)';

export const INITIAL_LIVES = 3;
export const WIN_PERCENTAGE = 70;

export const INVULN_FRAMES = 30;

export const GRID_SPACING = 30;
export const GRID_COLOR = 'rgba(0, 255, 204, 0.04)';

export const BG_COLOR = '#0a0a1a';
export const ARENA_BG_COLOR = '#0d0d24';
export const ARENA_BORDER_COLOR = '#00ffcc';
export const ARENA_BORDER_GLOW = 'rgba(0, 255, 204, 0.5)';

export const CAPTURED_FILL = 'rgba(0, 255, 204, 0.15)';
export const CAPTURED_BORDER = 'rgba(0, 255, 204, 0.3)';

export const BORDER_TOLERANCE = 3;

export const DIRECTIONS = {
  UP: { dx: 0, dy: -1 },
  DOWN: { dx: 0, dy: 1 },
  LEFT: { dx: -1, dy: 0 },
  RIGHT: { dx: 1, dy: 0 },
  NONE: { dx: 0, dy: 0 },
} as const;
