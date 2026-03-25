// ─── Type Definitions ─────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

export interface Direction {
  dx: number;
  dy: number;
}

export interface Player {
  x: number;
  y: number;
  direction: Direction;
  onBorder: boolean;
  trail: Point[];
  lives: number;
  invulnFrames: number;
}

export interface Orb {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
}

/** A spark chaser that travels along the player's active trail toward the player. */
export interface TrailChaser {
  /** Fractional index along the trail (0 = trail start, trail.length-1 = trail end). */
  trailPos: number;
  /** Current interpolated world position */
  x: number;
  y: number;
  active: boolean;
}

export interface CapturedRegion {
  points: Point[];
}

export type GamePhase = 'playing' | 'won' | 'lost';

export interface GameState {
  player: Player;
  orbs: Orb[];
  trailChaser: TrailChaser | null;
  capturedRegions: CapturedRegion[];
  revealPercentage: number;
  phase: GamePhase;
  arenaWidth: number;
  arenaHeight: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

// ─── Future Extension Types ───────────────────────────────────────

export interface SoundEffect {
  name: string;
  play: () => void;
}

export interface ParticleConfig {
  x: number;
  y: number;
  color: string;
  count: number;
  lifetime: number;
}

export interface LevelConfig {
  orbCount: number;
  orbSpeed: number;
  winPercentage: number;
  arenaWidth: number;
  arenaHeight: number;
}
