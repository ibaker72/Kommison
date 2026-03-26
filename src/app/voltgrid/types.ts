export type GamePhase = 'start' | 'playing' | 'won' | 'lost' | 'paused';

export interface Vec2 {
  x: number;
  y: number;
}

export type ArenaEdge = 'top' | 'right' | 'bottom' | 'left';
export type PlayerMotionState = 'border-attached' | 'trail-active' | 'respawning' | 'capture-resolve';

export interface Player {
  pos: Vec2;
  vel: Vec2;
  onBorder: boolean;
  attachedEdge: ArenaEdge;
  motionState: PlayerMotionState;
  trail: Vec2[];
  trailHeading: Vec2;
  lives: number;
  invulnMs: number;
  heading: number;
}

export interface Orb {
  pos: Vec2;
  vel: Vec2;
  radius: number;
}

export interface TrailChaser {
  distanceAlong: number;
  pathLength: number;
  pos: Vec2;
  active: boolean;
}

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  lifeMs: number;
  maxLifeMs: number;
  size: number;
  color: string;
}

export interface GameState {
  phase: GamePhase;
  player: Player;
  orb: Orb;
  chaser: TrailChaser | null;
  captured: Uint8Array;
  capturedCount: number;
  revealPct: number;
  shakeMs: number;
  particles: Particle[];
  statusText: string;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  pointerActive: boolean;
}

export type GameEvent =
  | 'death-hit'
  | 'trail-infected'
  | 'safe-reconnect'
  | 'capture'
  | 'win'
  | 'game-over';

export interface StepResult {
  state: GameState;
  events: GameEvent[];
}

export interface TrailCollision {
  segmentIndex: number;
  point: Vec2;
  normal: Vec2;
}
