import { getStageConfig, HIGH_SCORE_KEY } from './levels';
import type { Direction, EngineCallbacks, EngineState, GameSnapshot, Vec2 } from './types';

const BASE_COLS = 84;
const BASE_ROWS = 132;
const STEP = 1 / 60;

function key(x: number, y: number, cols: number): number {
  return y * cols + x;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function dirVector(direction: Direction): Vec2 {
  switch (direction) {
    case 'up':
      return { x: 0, y: -1 };
    case 'down':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
      return { x: 1, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

function isOpposite(a: Direction, b: Direction): boolean {
  return (a === 'up' && b === 'down') || (a === 'down' && b === 'up') || (a === 'left' && b === 'right') || (a === 'right' && b === 'left');
}

export class VoltGridEngine {
  private readonly callbacks: EngineCallbacks;
  private accumulator = 0;
  private raf = 0;
  private lastTime = 0;
  private state: EngineState;
  private touchVector: Vec2 | null = null;

  constructor(callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
    this.state = this.buildInitialState();
  }

  start(): void {
    this.stop();
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    this.emitSnapshot();
  }

  stop(): void {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  getState(): EngineState {
    return this.state;
  }

  setTouchVector(vector: Vec2 | null): void {
    this.touchVector = vector;
    if (!vector) return;
    const absX = Math.abs(vector.x);
    const absY = Math.abs(vector.y);
    if (absX < 0.2 && absY < 0.2) return;
    const nextDirection: Direction = absX > absY ? (vector.x > 0 ? 'right' : 'left') : vector.y > 0 ? 'down' : 'up';
    this.setDirection(nextDirection);
  }

  setDirection(direction: Direction): void {
    if (!direction || this.state.phase !== 'playing') return;
    if (!isOpposite(this.state.moveDir, direction)) {
      this.state.queuedDir = direction;
    }
  }

  togglePause(): void {
    if (this.state.phase === 'playing') {
      this.state.phase = 'paused';
    } else if (this.state.phase === 'paused') {
      this.state.phase = 'playing';
    }
    this.emitSnapshot();
  }

  startRun(): void {
    if (this.state.phase === 'ready' || this.state.phase === 'gameOver') {
      this.state = this.buildInitialState();
      this.state.phase = 'playing';
      this.emitSnapshot();
    }
  }

  advanceStage(): void {
    if (this.state.phase !== 'stageClear') return;
    const current = this.state;
    this.state = this.buildInitialState(current.stageIndex + 1, current.score, current.highScore, current.lives);
    this.state.phase = 'playing';
    this.emitSnapshot();
  }

  restart(): void {
    this.state = this.buildInitialState();
    this.state.phase = 'playing';
    this.emitSnapshot();
  }

  private readonly loop = (time: number): void => {
    const dt = Math.min(0.05, Math.max(0, (time - this.lastTime) / 1000));
    this.lastTime = time;
    this.accumulator += dt;

    while (this.accumulator >= STEP) {
      this.update(STEP);
      this.accumulator -= STEP;
    }

    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    const s = this.state;

    if (s.phase === 'paused' || s.phase === 'ready' || s.phase === 'gameOver') {
      this.updateFx(dt);
      this.emitSnapshot();
      return;
    }

    if (s.phase === 'stageClear') {
      s.stageTimer += dt;
      s.pulse = Math.max(0, s.pulse - dt * 0.75);
      this.updateFx(dt);
      this.emitSnapshot();
      return;
    }

    const stage = getStageConfig(s.stageIndex);

    s.comboTimer -= dt;
    if (s.comboTimer <= 0) {
      s.combo = 0;
      s.comboTimer = 0;
    }

    this.stepPlayer(dt);
    this.stepQix(dt, stage.qixSpeed, stage.qixTurnRate);
    this.stepHunters(dt, stage.hunterSpeed);

    if (this.hitByQixTrail() || this.hitByHunter()) {
      this.loseLife();
      this.emitSnapshot();
      return;
    }

    s.pulse = Math.max(0, s.pulse - dt * 2);
    s.shake = Math.max(0, s.shake - dt * 3);

    this.updateFx(dt);
    this.emitSnapshot();
  }

  private updateFx(dt: number): void {
    const s = this.state;
    s.floatTexts = s.floatTexts
      .map((f) => ({ ...f, y: f.y - dt * 9, ttl: f.ttl - dt }))
      .filter((f) => f.ttl > 0);
    s.particles = s.particles
      .map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, vy: p.vy + dt * 3, life: p.life - dt }))
      .filter((p) => p.life > 0);
  }

  private buildInitialState(stageIndex = 0, score = 0, highScore = 0, lives = 3): EngineState {
    const cols = BASE_COLS;
    const rows = BASE_ROWS;
    const safe = new Uint8Array(cols * rows);
    const trail = new Uint8Array(cols * rows);

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (x <= 1 || y <= 1 || x >= cols - 2 || y >= rows - 2) {
          safe[key(x, y, cols)] = 1;
        }
      }
    }

    const qx = cols * 0.5;
    const qy = rows * 0.5;
    const storedHigh = highScore || (typeof window !== 'undefined' ? Number(window.localStorage.getItem(HIGH_SCORE_KEY) ?? '0') || 0 : 0);

    const state: EngineState = {
      cols,
      rows,
      cellSize: 1,
      safe,
      trail,
      playerCell: { x: 2, y: Math.floor(rows / 2) },
      moveDir: 'up',
      queuedDir: 'up',
      drawing: false,
      qixPos: { x: qx, y: qy },
      qixVel: { x: 13, y: 11 },
      qixRibbon: [],
      hunters: [],
      boundary: [],
      particles: [],
      score,
      highScore: storedHigh,
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
    };

    this.rebuildBoundary(state);
    this.spawnHunters(state);
    this.recomputeCaptured(state);
    return state;
  }

  private stepPlayer(dt: number): void {
    const s = this.state;
    const direction = s.queuedDir || s.moveDir;
    const vector = dirVector(direction);
    if (vector.x === 0 && vector.y === 0) return;

    const speedCells = s.drawing ? 20 : 22;
    const steps = Math.max(1, Math.round(speedCells * dt));

    for (let i = 0; i < steps; i += 1) {
      const nx = s.playerCell.x + vector.x;
      const ny = s.playerCell.y + vector.y;

      if (nx < 0 || ny < 0 || nx >= s.cols || ny >= s.rows) return;

      const nKey = key(nx, ny, s.cols);
      const currentlySafe = s.safe[key(s.playerCell.x, s.playerCell.y, s.cols)] === 1;
      const nextSafe = s.safe[nKey] === 1;

      if (currentlySafe && !nextSafe) {
        s.drawing = true;
      }

      if (s.drawing && s.trail[nKey] === 1) {
        this.loseLife();
        return;
      }

      s.playerCell = { x: nx, y: ny };
      s.moveDir = direction;

      if (s.drawing) {
        s.trail[nKey] = 1;
      }

      if (s.drawing && nextSafe) {
        this.resolveCapture();
        return;
      }
    }
  }

  private stepQix(dt: number, speed: number, turnRate: number): void {
    const s = this.state;
    const jitter = (Math.random() - 0.5) * turnRate;
    s.qixVel.x += jitter;
    s.qixVel.y += (Math.random() - 0.5) * turnRate;

    const len = Math.hypot(s.qixVel.x, s.qixVel.y) || 1;
    s.qixVel.x = (s.qixVel.x / len) * speed;
    s.qixVel.y = (s.qixVel.y / len) * speed;

    let nextX = s.qixPos.x + s.qixVel.x * dt;
    let nextY = s.qixPos.y + s.qixVel.y * dt;

    if (this.isBlocked(Math.round(nextX), Math.round(s.qixPos.y))) {
      s.qixVel.x *= -1;
      nextX = s.qixPos.x + s.qixVel.x * dt;
    }
    if (this.isBlocked(Math.round(s.qixPos.x), Math.round(nextY))) {
      s.qixVel.y *= -1;
      nextY = s.qixPos.y + s.qixVel.y * dt;
    }

    s.qixPos.x = clamp(nextX, 2, s.cols - 3);
    s.qixPos.y = clamp(nextY, 2, s.rows - 3);

    s.qixRibbon.unshift({ x: s.qixPos.x, y: s.qixPos.y });
    if (s.qixRibbon.length > 12) s.qixRibbon.length = 12;
  }

  private stepHunters(dt: number, speedBase: number): void {
    const s = this.state;
    if (s.boundary.length < 2) return;
    for (const hunter of s.hunters) {
      hunter.t += (dt * (speedBase + hunter.speed) * hunter.polarity) / s.boundary.length;
      if (hunter.t < 0) hunter.t += 1;
      if (hunter.t >= 1) hunter.t -= 1;
    }
  }

  private hitByHunter(): boolean {
    const s = this.state;
    if (!s.boundary.length) return false;
    for (const hunter of s.hunters) {
      const idx = Math.floor(hunter.t * (s.boundary.length - 1));
      const point = s.boundary[idx];
      if (!point) continue;
      const dx = point.x - s.playerCell.x;
      const dy = point.y - s.playerCell.y;
      if (dx * dx + dy * dy <= 1.2) return true;
    }
    return false;
  }

  private hitByQixTrail(): boolean {
    const s = this.state;
    const cx = Math.round(s.qixPos.x);
    const cy = Math.round(s.qixPos.y);
    if (s.trail[key(cx, cy, s.cols)] === 1) return true;

    const px = s.playerCell.x;
    const py = s.playerCell.y;
    const d = Math.hypot(px - s.qixPos.x, py - s.qixPos.y);
    return d < 0.8;
  }

  private resolveCapture(): void {
    const s = this.state;
    const cols = s.cols;
    const rows = s.rows;

    for (let i = 0; i < s.trail.length; i += 1) {
      if (s.trail[i] === 1) s.safe[i] = 1;
    }

    const visited = new Uint8Array(cols * rows);
    const queueX = new Int16Array(cols * rows);
    const queueY = new Int16Array(cols * rows);
    let head = 0;
    let tail = 0;

    const seedX = Math.round(s.qixPos.x);
    const seedY = Math.round(s.qixPos.y);
    queueX[tail] = seedX;
    queueY[tail] = seedY;
    tail += 1;

    while (head < tail) {
      const x = queueX[head];
      const y = queueY[head];
      head += 1;
      if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
      const idx = key(x, y, cols);
      if (visited[idx] || s.safe[idx] === 1) continue;
      visited[idx] = 1;
      queueX[tail] = x + 1;
      queueY[tail] = y;
      tail += 1;
      queueX[tail] = x - 1;
      queueY[tail] = y;
      tail += 1;
      queueX[tail] = x;
      queueY[tail] = y + 1;
      tail += 1;
      queueX[tail] = x;
      queueY[tail] = y - 1;
      tail += 1;
    }

    let gained = 0;
    for (let y = 1; y < rows - 1; y += 1) {
      for (let x = 1; x < cols - 1; x += 1) {
        const idx = key(x, y, cols);
        if (s.safe[idx] === 0 && visited[idx] === 0) {
          s.safe[idx] = 1;
          gained += 1;
        }
      }
    }

    s.trail.fill(0);
    s.drawing = false;
    this.rebuildBoundary(s);
    this.recomputeCaptured(s);

    if (gained > 0) {
      const stage = getStageConfig(s.stageIndex);
      const riskBonus = Math.round(gained * (1 + s.combo * 0.2));
      s.score += riskBonus;
      s.highScore = Math.max(s.highScore, s.score);
      s.combo += 1;
      s.comboTimer = stage.comboWindow;
      s.pulse = 1;
      s.shake = 1;
      s.floatTexts.push({ x: s.playerCell.x, y: s.playerCell.y, value: `+${riskBonus}`, ttl: 1, color: '#58f2ff' });
      this.spawnBurst(s.playerCell.x, s.playerCell.y, '#8effff', 24);
      this.callbacks.onCapture();
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(HIGH_SCORE_KEY, String(s.highScore));
      }
    }

    if (s.capturedPct >= getStageConfig(s.stageIndex).target) {
      s.phase = 'stageClear';
      s.stageTimer = 0;
      this.callbacks.onStageClear();
    }
  }

  private loseLife(): void {
    const s = this.state;
    s.trail.fill(0);
    s.drawing = false;
    s.combo = 0;
    s.comboTimer = 0;
    s.lives -= 1;
    s.playerCell = { x: 2, y: Math.floor(s.rows / 2) };
    s.moveDir = 'up';
    s.queuedDir = 'up';
    s.shake = 1.2;
    s.floatTexts.push({ x: s.playerCell.x + 1, y: s.playerCell.y - 2, value: 'SYSTEM BREACH', ttl: 1.2, color: '#ff5faa' });
    this.spawnBurst(s.playerCell.x, s.playerCell.y, '#ff5faa', 32);
    this.callbacks.onDeath();
    if (s.lives <= 0) {
      s.phase = 'gameOver';
    }
  }

  private spawnBurst(x: number, y: number, color: string, count: number): void {
    const s = this.state;
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
      const speed = 8 + Math.random() * 12;
      s.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.5,
        color,
        size: 0.8 + Math.random() * 1.5,
      });
    }
  }

  private rebuildBoundary(state: EngineState): void {
    const points: Vec2[] = [];
    for (let y = 1; y < state.rows - 1; y += 1) {
      for (let x = 1; x < state.cols - 1; x += 1) {
        const idx = key(x, y, state.cols);
        if (state.safe[idx] !== 1) continue;
        const hasOpenNeighbor =
          state.safe[key(x + 1, y, state.cols)] === 0 ||
          state.safe[key(x - 1, y, state.cols)] === 0 ||
          state.safe[key(x, y + 1, state.cols)] === 0 ||
          state.safe[key(x, y - 1, state.cols)] === 0;
        if (hasOpenNeighbor) points.push({ x, y });
      }
    }
    points.sort((a, b) => Math.atan2(a.y - state.rows / 2, a.x - state.cols / 2) - Math.atan2(b.y - state.rows / 2, b.x - state.cols / 2));
    state.boundary = points;
    this.spawnHunters(state);
  }

  private spawnHunters(state: EngineState): void {
    const config = getStageConfig(state.stageIndex);
    if (state.boundary.length < 2) {
      state.hunters = [];
      return;
    }
    state.hunters = Array.from({ length: config.hunterCount }, (_, index) => ({
      t: (index / config.hunterCount) % 1,
      speed: Math.random() * 4,
      polarity: index % 2 === 0 ? 1 : -1,
    }));
  }

  private recomputeCaptured(state: EngineState): void {
    const total = state.cols * state.rows;
    let safeCount = 0;
    for (let i = 0; i < total; i += 1) {
      safeCount += state.safe[i];
    }
    state.capturedPct = Math.round((safeCount / total) * 1000) / 10;
  }

  private isBlocked(x: number, y: number): boolean {
    const s = this.state;
    if (x < 0 || y < 0 || x >= s.cols || y >= s.rows) return true;
    return s.safe[key(x, y, s.cols)] === 1;
  }

  private emitSnapshot(): void {
    const s = this.state;
    const stage = getStageConfig(s.stageIndex);
    const snapshot: GameSnapshot = {
      score: s.score,
      highScore: s.highScore,
      lives: s.lives,
      stage: stage.stage,
      capturedPct: s.capturedPct,
      targetPct: stage.target,
      combo: s.combo,
      phase: s.phase,
      pulse: s.pulse,
      shake: s.shake,
      floatTexts: s.floatTexts,
      touchVector: this.touchVector,
    };
    this.callbacks.onSnapshot(snapshot);
  }
}
