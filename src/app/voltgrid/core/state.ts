import { HIGH_SCORE_KEY, RUN_SNAPSHOT_KEY } from './levels';
import type { EngineState, GameSnapshot } from './types';

const BASE_COLS = 84;
const BASE_ROWS = 132;

const key = (x: number, y: number, cols: number): number => y * cols + x;

const getStoredHighScore = (): number => {
  if (typeof window === 'undefined') return 0;
  const raw = Number(window.localStorage.getItem(HIGH_SCORE_KEY) ?? '0');
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.floor(raw);
};

const buildSafeGrid = (cols: number, rows: number): { safe: Uint8Array; baselineSafeCells: number } => {
  const safe = new Uint8Array(cols * rows);
  let baselineSafeCells = 0;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (x <= 1 || y <= 1 || x >= cols - 2 || y >= rows - 2) {
        safe[key(x, y, cols)] = 1;
        baselineSafeCells += 1;
      }
    }
  }

  return { safe, baselineSafeCells };
};

export const createInitialRunState = (options?: {
  stageIndex?: number;
  score?: number;
  highScore?: number;
  lives?: number;
}): EngineState => {
  const cols = BASE_COLS;
  const rows = BASE_ROWS;
  const trail = new Uint8Array(cols * rows);
  const { safe, baselineSafeCells } = buildSafeGrid(cols, rows);

  const stageIndex = Math.max(0, Math.floor(options?.stageIndex ?? 0));
  const score = Math.max(0, Math.floor(options?.score ?? 0));
  const highScore = Math.max(score, Math.floor(options?.highScore ?? getStoredHighScore()));
  const lives = Math.max(1, Math.floor(options?.lives ?? 3));

  return {
    cols,
    rows,
    cellSize: 1,
    safe,
    trail,
    playerCell: { x: 2, y: Math.floor(rows / 2) },
    moveDir: 'up',
    queuedDir: 'up',
    drawing: false,
    qixPos: { x: cols * 0.5, y: rows * 0.5 },
    qixVel: { x: 13, y: 11 },
    qixRibbon: [],
    hunters: [],
    boundary: [],
    particles: [],
    score,
    highScore,
    lives,
    stageIndex,
    combo: 0,
    comboTimer: 0,
    capturedPct: 0,
    phase: 'ready',
    pulse: 0,
    shake: 0,
    floatTexts: [],
    stageTimer: 0,
    baselineSafeCells,
    isRunInitialized: false,
    isRoundActive: false,
    collisionsEnabled: false,
    gameOverReason: null,
  };
};

export const createInitialUiState = (): GameSnapshot => ({
  score: 0,
  highScore: 0,
  lives: 3,
  stage: 1,
  capturedPct: 0,
  targetPct: 70,
  combo: 0,
  phase: 'ready',
  pulse: 0,
  shake: 0,
  floatTexts: [],
  touchVector: null,
});

export const createInitialPersistentSnapshot = (): { highScore: number } => ({ highScore: 0 });

const hasFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export const validatePersistentRunSnapshot = (candidate: unknown): { valid: boolean; reason: string } => {
  if (!candidate || typeof candidate !== 'object') return { valid: false, reason: 'snapshot missing/object invalid' };

  const parsed = candidate as Partial<Pick<GameSnapshot, 'phase' | 'lives' | 'capturedPct' | 'score'>>;
  if (parsed.phase === 'gameOver') return { valid: false, reason: 'snapshot already gameOver' };
  if (!hasFiniteNumber(parsed.lives) || parsed.lives <= 0) return { valid: false, reason: 'lives invalid' };
  if (!hasFiniteNumber(parsed.capturedPct) || parsed.capturedPct < 0 || parsed.capturedPct > 100) {
    return { valid: false, reason: 'capture percent invalid' };
  }
  if (!hasFiniteNumber(parsed.score) || parsed.score < 0) return { valid: false, reason: 'score invalid' };

  return { valid: true, reason: 'resume-eligible snapshot' };
};

export const inspectAndSanitizePersistence = (): {
  highScore: number;
  source: 'fresh' | 'restored';
  validation: string;
} => {
  if (typeof window === 'undefined') {
    return { highScore: 0, source: 'fresh', validation: 'window unavailable' };
  }

  const highScore = getStoredHighScore();
  const rawRun = window.localStorage.getItem(RUN_SNAPSHOT_KEY);
  if (!rawRun) {
    return { highScore, source: highScore > 0 ? 'restored' : 'fresh', validation: 'no persisted live run found' };
  }

  try {
    const parsed = JSON.parse(rawRun) as unknown;
    const validation = validatePersistentRunSnapshot(parsed);
    // Live run resume is not enabled yet; we intentionally never hydrate runtime state from storage.
    window.localStorage.removeItem(RUN_SNAPSHOT_KEY);

    return {
      highScore,
      source: highScore > 0 ? 'restored' : 'fresh',
      validation: validation.valid
        ? `persisted run ignored (resume disabled): ${validation.reason}`
        : `persisted run discarded: ${validation.reason}`,
    };
  } catch {
    window.localStorage.removeItem(RUN_SNAPSHOT_KEY);
    return { highScore, source: highScore > 0 ? 'restored' : 'fresh', validation: 'persisted run JSON invalid; discarded' };
  }
};
