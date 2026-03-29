export interface Vec2 {
  x: number;
  y: number;
}

export type Phase = 'menu' | 'playing' | 'dead' | 'levelup' | 'gameover';

export type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

export const VOID = 0;
export const BORDER = 1;
export const CAPTURED = 2;
export const TRAIL = 3;

export interface Orb {
  x: number;
  y: number;
  dx: number;
  dy: number;
  hue: number;
}

export interface Fuse {
  trailIndex: number;
  moveAccum: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface GameSnapshot {
  score: number;
  highScore: number;
  lives: number;
  level: number;
  capturedPct: number;
  phase: Phase;
  fuseActive: boolean;
  fuseTimer: number;
  drawing: boolean;
}
