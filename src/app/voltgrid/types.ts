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

export interface CapturedRegion {
  points: Point[];
}

export type GamePhase = 'playing' | 'won' | 'lost';

export interface GameState {
  player: Player;
  orbs: Orb[];
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
