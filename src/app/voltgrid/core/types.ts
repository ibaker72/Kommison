export type Vec2 = { x: number; y: number };

export type Direction = 'up' | 'down' | 'left' | 'right' | null;

export type Phase = 'ready' | 'playing' | 'paused' | 'stageClear' | 'gameOver';

export type FloatText = {
  x: number;
  y: number;
  value: string;
  ttl: number;
  color: string;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
};

export type Hunter = {
  t: number;
  speed: number;
  polarity: 1 | -1;
};

export type StageConfig = {
  stage: number;
  target: number;
  qixSpeed: number;
  qixTurnRate: number;
  hunterCount: number;
  hunterSpeed: number;
  comboWindow: number;
};

export type GameSnapshot = {
  score: number;
  highScore: number;
  lives: number;
  stage: number;
  capturedPct: number;
  targetPct: number;
  combo: number;
  phase: Phase;
  pulse: number;
  shake: number;
  floatTexts: FloatText[];
  touchVector: Vec2 | null;
};

export type EngineState = {
  cols: number;
  rows: number;
  cellSize: number;
  safe: Uint8Array;
  trail: Uint8Array;
  playerCell: Vec2;
  moveDir: Direction;
  queuedDir: Direction;
  drawing: boolean;
  qixPos: Vec2;
  qixVel: Vec2;
  qixRibbon: Vec2[];
  hunters: Hunter[];
  boundary: Vec2[];
  particles: Particle[];
  score: number;
  highScore: number;
  lives: number;
  stageIndex: number;
  combo: number;
  comboTimer: number;
  capturedPct: number;
  phase: Phase;
  pulse: number;
  shake: number;
  floatTexts: FloatText[];
  stageTimer: number;
};

export type EngineCallbacks = {
  onSnapshot: (snapshot: GameSnapshot) => void;
  onCapture: () => void;
  onDeath: () => void;
  onStageClear: () => void;
};
