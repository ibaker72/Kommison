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
  trail: Vec2[];
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
  | 'trail-zapped'
  | 'capture'
  | 'win'
  | 'game-over';

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
