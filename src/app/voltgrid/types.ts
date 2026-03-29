export type GamePhase = 'start' | 'playing' | 'won' | 'lost' | 'paused';

export interface Vec2 {
  x: number;
  y: number;
}

export const CELL_EMPTY = 0;
export const CELL_CLAIMED = 1;
export const CELL_DRAWING = 2;
export type CellState = typeof CELL_EMPTY | typeof CELL_CLAIMED | typeof CELL_DRAWING;

export interface Player {
  pos: Vec2;
  vel: Vec2;
  onBorder: boolean;
  attachedEdge: 'top' | 'right' | 'bottom' | 'left';
  motionState: 'border-attached' | 'trail-active' | 'respawning' | 'capture-resolve';
  trail: Vec2[];
  trailHeading: Vec2;
  lives: number;
  invulnMs: number;
  heading: number;
  moveBuffer: number;
  speed: number;
}

export interface Orb {
  pos: Vec2;
  vel: Vec2;
  radius: number;
  trail: Vec2[];
  speed: number;
}

export interface Spark {
  perimeterPos: number;
  speed: number;
  radius: number;
  direction: 1 | -1;
}

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  lifeMs: number;
  maxLifeMs: number;
  size: number;
  color: string;
}

export interface Shockwave {
  active: boolean;
  path: Vec2[];
  segmentIndex: number;
  progress: number;
  speed: number;
  pos: Vec2;
}

export interface GameState {
  phase: GamePhase;
  player: Player;
  orbs: Orb[];
  sparks: Spark[];
  captured: Uint8Array;
  capturedCount: number;
  revealPct: number;
  score: number;
  shakeMs: number;
  particles: Particle[];
  statusText: string;
  perimeter: number[];
  shockwave: Shockwave | null;
  cutClaimedCells: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  pointerActive: boolean;
}

export type GameEvent = 'death-hit' | 'trail-zapped' | 'capture' | 'win' | 'game-over';

export interface StepResult {
  state: GameState;
  events: GameEvent[];
  clearPointerInput?: boolean;
}

export interface TrailCollision {
  segmentIndex: number;
  point: Vec2;
  normal: Vec2;
}

export type ArenaEdge = 'top' | 'right' | 'bottom' | 'left';
