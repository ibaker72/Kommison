import {
  type Vec2, type Phase, type Direction, type Orb, type Fuse, type Spark, type Particle, type GameSnapshot,
  VOID, BORDER, CAPTURED, TRAIL,
} from './types';

// ─── Tuning Constants ────────────────────────────────────────────
const GRID = 80;
const BASE_TARGET_PCT = 75;
const MAX_TARGET_PCT = 90;
const TARGET_PCT_PER_LEVEL = 2;
const PLAYER_SPEED = 180;    // cells/sec
const ORB_BASE_SPEED = 100;  // cells/sec
const SPARK_BASE_SPEED = 90; // cells/sec along border
const FUSE_SPEED = 280;      // cells/sec along trail
const FUSE_TIME = 2000;      // ms before fuse kills
const INITIAL_LIVES = 3;
const CAPTURE_BONUS = 100;
const CONTAIN_BONUS = 5000;
const LEVEL_BONUS = 2000;

const DIR_MAP: Record<Direction, [number, number]> = {
  up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0], none: [0, 0],
};

// ─── Sound Engine ────────────────────────────────────────────────
class SoundEngine {
  private ctx: AudioContext | null = null;

  init(): void {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); }
    catch { /* silent */ }
  }

  play(type: string): void {
    if (!this.ctx) return;
    try { this.dispatch(type); } catch { /* silent */ }
  }

  private dispatch(type: string): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    switch (type) {
      case 'capture': this.tone(ctx, now, 'sawtooth', 330, 880, 0.12, 0.3, 2000); break;
      case 'contain':
        this.tone(ctx, now, 'sawtooth', 440, 1760, 0.18, 0.5, 3000);
        this.tone(ctx, now + 0.1, 'square', 880, 1760, 0.1, 0.4, 4000);
        break;
      case 'fuse': this.tone(ctx, now, 'square', 150, 600, 0.14, 0.2, 1500); break;
      case 'death': this.tone(ctx, now, 'sawtooth', 440, 40, 0.18, 0.8, 1000); break;
      case 'levelup':
        [440, 554, 659, 880].forEach((f, i) => this.tone(ctx, now + i * 0.12, 'triangle', f, f, 0.12, 0.2, 5000));
        break;
      case 'gameover': this.tone(ctx, now, 'sawtooth', 300, 30, 0.14, 1.5, 500); break;
    }
  }

  private tone(ctx: AudioContext, start: number, type: OscillatorType, freqStart: number, freqEnd: number, vol: number, dur: number, filterFreq: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), start + dur * 0.8);
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    filter.frequency.setValueAtTime(filterFreq, start);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }
}

// ─── Camera (Screen Shake) ───────────────────────────────────────
export class Camera {
  shakeX = 0;
  shakeY = 0;
  private trauma = 0;

  addTrauma(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt: number): void {
    if (this.trauma > 0) {
      const shake = this.trauma * this.trauma;
      this.shakeX = (Math.random() * 2 - 1) * shake * 10;
      this.shakeY = (Math.random() * 2 - 1) * shake * 10;
      this.trauma = Math.max(0, this.trauma - dt * 2.5);
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }
}

// ─── Engine ──────────────────────────────────────────────────────
export class VoltGridEngine {
  grid: Uint8Array;
  readonly gridSize = GRID;
  player: Vec2;
  playerDir: Direction = 'none';
  drawing = false;
  trail: Vec2[] = [];
  orbs: Orb[] = [];
  sparks: Spark[] = [];
  /** Pre-computed border perimeter path (clockwise) for spark patrol */
  borderPath: Vec2[] = [];
  fuse: Fuse | null = null;
  fuseTimer = 0;
  score = 0;
  highScore = 0;
  lives = INITIAL_LIVES;
  level = 1;
  targetPct = BASE_TARGET_PCT;
  capturedPct = 0;
  phase: Phase = 'menu';
  particles: Particle[] = [];
  camera = new Camera();
  sound = new SoundEngine();

  flashTimer = 0;
  flashColor = '';
  captureAnimCells: Vec2[] = [];
  captureAnimTimer = 0;
  deadTimer = 0;
  levelUpTimer = 0;

  private moveAccum = 0;
  private orbAccum = 0;
  private sparkAccum = 0;

  constructor() {
    this.grid = new Uint8Array(GRID * GRID);
    this.player = { x: 2, y: 2 };
    this.initBorder();
    try {
      const saved = localStorage.getItem('voltgrid_hs');
      if (saved) this.highScore = parseInt(saved, 10) || 0;
    } catch { /* noop */ }
  }

  private initBorder(): void {
    this.grid.fill(VOID);
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (x <= 1 || x >= GRID - 2 || y <= 1 || y >= GRID - 2) {
          this.grid[y * GRID + x] = BORDER;
        }
      }
    }
    this.buildBorderPath();
  }

  /** Build a clockwise perimeter path along the inner border edge (row/col = 1 and GRID-2). */
  private buildBorderPath(): void {
    const path: Vec2[] = [];
    const min = 1, max = GRID - 2;
    // Top edge: left to right
    for (let x = min; x <= max; x++) path.push({ x, y: min });
    // Right edge: top+1 to bottom
    for (let y = min + 1; y <= max; y++) path.push({ x: max, y });
    // Bottom edge: right-1 to left
    for (let x = max - 1; x >= min; x--) path.push({ x, y: max });
    // Left edge: bottom-1 to top+1
    for (let y = max - 1; y > min; y--) path.push({ x: min, y });
    this.borderPath = path;
  }

  private spawnSparks(count: number): void {
    const pathLen = this.borderPath.length;
    for (let i = 0; i < count; i++) {
      const startIdx = Math.floor(Math.random() * pathLen);
      this.sparks.push({
        pathIndex: startIdx,
        dir: Math.random() < 0.5 ? 1 : -1,
        moveAccum: 0,
      });
    }
  }

  startGame(): void {
    this.initBorder();
    this.player = { x: 2, y: 2 };
    this.playerDir = 'none';
    this.drawing = false;
    this.trail = [];
    this.orbs = [];
    this.sparks = [];
    this.fuse = null;
    this.fuseTimer = 0;
    this.score = 0;
    this.lives = INITIAL_LIVES;
    this.level = 1;
    this.targetPct = BASE_TARGET_PCT;
    this.capturedPct = 0;
    this.phase = 'playing';
    this.particles = [];
    this.moveAccum = 0;
    this.orbAccum = 0;
    this.sparkAccum = 0;
    this.flashTimer = 0;
    this.captureAnimCells = [];
    this.captureAnimTimer = 0;
    this.sound.init();
    this.spawnOrbs(1);
    this.spawnSparks(1);
  }

  nextLevel(): void {
    this.level++;
    this.targetPct = Math.min(MAX_TARGET_PCT, BASE_TARGET_PCT + (this.level - 1) * TARGET_PCT_PER_LEVEL);
    this.initBorder();
    this.player = { x: 2, y: 2 };
    this.playerDir = 'none';
    this.drawing = false;
    this.trail = [];
    this.orbs = [];
    this.sparks = [];
    this.fuse = null;
    this.fuseTimer = 0;
    this.capturedPct = 0;
    this.moveAccum = 0;
    this.orbAccum = 0;
    this.sparkAccum = 0;
    this.particles = [];
    this.captureAnimCells = [];
    this.captureAnimTimer = 0;
    this.spawnOrbs(Math.min(this.level, 5));
    this.spawnSparks(Math.min(1 + Math.floor(this.level / 2), 4));
    this.score += LEVEL_BONUS;
    this.phase = 'playing';
    this.sound.play('levelup');
  }

  setDirection(dir: Direction): void {
    if (this.phase === 'playing') this.playerDir = dir;
  }

  getSnapshot(): GameSnapshot {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.level,
      targetPct: this.targetPct,
      capturedPct: this.capturedPct,
      phase: this.phase,
      fuseActive: this.fuse !== null,
      fuseTimer: this.fuseTimer,
      drawing: this.drawing,
    };
  }

  update(dt: number): void {
    this.camera.update(dt);
    this.updateParticles(dt);

    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.captureAnimTimer > 0) this.captureAnimTimer -= dt;

    if (this.phase === 'dead') {
      this.deadTimer -= dt;
      if (this.deadTimer <= 0) {
        if (this.lives <= 0) {
          this.phase = 'gameover';
          this.sound.play('gameover');
          this.saveHighScore();
        } else {
          this.respawnPlayer();
        }
      }
      return;
    }

    if (this.phase === 'levelup') {
      this.levelUpTimer -= dt;
      if (this.levelUpTimer <= 0) this.nextLevel();
      return;
    }

    if (this.phase !== 'playing') return;

    // Player movement (grid-cell steps)
    this.moveAccum += dt;
    const moveInterval = 1 / PLAYER_SPEED;
    while (this.moveAccum >= moveInterval) {
      this.moveAccum -= moveInterval;
      this.stepPlayer();
    }

    // Orb movement
    const orbSpeed = ORB_BASE_SPEED + this.level * 12;
    this.orbAccum += dt;
    const orbInterval = 1 / orbSpeed;
    while (this.orbAccum >= orbInterval) {
      this.orbAccum -= orbInterval;
      this.stepOrbs();
    }

    // Spark movement along border
    const sparkSpeed = SPARK_BASE_SPEED + this.level * 10;
    this.sparkAccum += dt;
    const sparkInterval = 1 / sparkSpeed;
    while (this.sparkAccum >= sparkInterval) {
      this.sparkAccum -= sparkInterval;
      this.stepSparks();
    }

    // Fuse logic
    if (this.fuse) {
      this.fuseTimer += dt * 1000;
      this.fuse.moveAccum += dt * FUSE_SPEED;
      while (this.fuse.moveAccum >= 1 && this.fuse.trailIndex < this.trail.length - 1) {
        this.fuse.trailIndex++;
        this.fuse.moveAccum -= 1;
        const tp = this.trail[this.fuse.trailIndex];
        if (tp.x === this.player.x && tp.y === this.player.y) {
          this.killPlayer();
          return;
        }
      }
      if (this.fuseTimer >= FUSE_TIME) {
        this.killPlayer();
        return;
      }
    }
  }

  // ─── Movement ──────────────────────────────────────────────
  private stepPlayer(): void {
    const [dx, dy] = DIR_MAP[this.playerDir];
    if (dx === 0 && dy === 0) return;

    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) return;

    const nextCell = this.grid[ny * GRID + nx];

    // Can't walk into own trail
    if (nextCell === TRAIL) return;

    const currentSafe = this.isSafe(this.player.x, this.player.y);
    const nextSafe = nextCell === BORDER || nextCell === CAPTURED;

    if (currentSafe && nextSafe) {
      // Safe-to-safe
      this.player = { x: nx, y: ny };
      this.drawing = false;
      // Check if we walked into a spark
      if (this.checkSparkCollision()) return;
    } else if (currentSafe && !nextSafe) {
      // Enter void → start drawing
      this.drawing = true;
      this.trail = [{ x: this.player.x, y: this.player.y }];
      this.player = { x: nx, y: ny };
      this.grid[ny * GRID + nx] = TRAIL;
      this.trail.push({ x: nx, y: ny });
    } else if (!currentSafe && nextSafe) {
      // Return to safety → capture
      this.player = { x: nx, y: ny };
      this.trail.push({ x: nx, y: ny });
      this.completeCapture();
    } else {
      // Continue drawing in void
      this.player = { x: nx, y: ny };
      this.grid[ny * GRID + nx] = TRAIL;
      this.trail.push({ x: nx, y: ny });
    }
  }

  private checkSparkCollision(): boolean {
    for (const spark of this.sparks) {
      const pos = this.borderPath[spark.pathIndex];
      if (pos && pos.x === this.player.x && pos.y === this.player.y) {
        this.killPlayer();
        return true;
      }
    }
    return false;
  }

  private isSafe(x: number, y: number): boolean {
    if (x < 0 || x >= GRID || y < 0 || y >= GRID) return false;
    const cell = this.grid[y * GRID + x];
    return cell === BORDER || cell === CAPTURED;
  }

  // ─── Orbs ──────────────────────────────────────────────────
  private spawnOrbs(count: number): void {
    for (let i = 0; i < count; i++) {
      let ox: number, oy: number, attempts = 0;
      do {
        ox = 10 + Math.floor(Math.random() * (GRID - 20));
        oy = 10 + Math.floor(Math.random() * (GRID - 20));
        attempts++;
      } while (this.grid[oy * GRID + ox] !== VOID && attempts < 200);

      const dirs: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      const [ddx, ddy] = dirs[Math.floor(Math.random() * 4)];
      this.orbs.push({ x: ox, y: oy, dx: ddx, dy: ddy, hue: 30 + Math.random() * 30 });
    }
  }

  private stepOrbs(): void {
    for (const orb of this.orbs) {
      let nx = orb.x + orb.dx;
      let ny = orb.y + orb.dy;

      const hitX = nx < 2 || nx >= GRID - 2 || this.isSafe(nx, orb.y);
      const hitY = ny < 2 || ny >= GRID - 2 || this.isSafe(orb.x, ny);

      if (hitX) orb.dx = -orb.dx;
      if (hitY) orb.dy = -orb.dy;

      // Slight randomness to prevent loops
      if ((hitX || hitY) && Math.random() < 0.1) {
        if (Math.random() < 0.5) orb.dx = Math.random() < 0.5 ? 1 : -1;
        else orb.dy = Math.random() < 0.5 ? 1 : -1;
      }

      nx = orb.x + orb.dx;
      ny = orb.y + orb.dy;

      if (nx >= 2 && nx < GRID - 2 && ny >= 2 && ny < GRID - 2) {
        const destCell = this.grid[ny * GRID + nx];
        if (destCell === VOID || destCell === TRAIL) {
          if (destCell === TRAIL && !this.fuse) {
            this.startFuse(nx, ny);
          }
          orb.x = nx;
          orb.y = ny;
        }
      }

      // Particle trail
      if (Math.random() < 0.25) {
        this.particles.push(this.makeParticle(
          orb.x, orb.y, `hsl(${orb.hue}, 100%, 65%)`,
          (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 0.35
        ));
      }
    }
  }

  // ─── Sparks ─────────────────────────────────────────────────
  private stepSparks(): void {
    const pathLen = this.borderPath.length;
    if (pathLen === 0) return;

    for (const spark of this.sparks) {
      spark.pathIndex = ((spark.pathIndex + spark.dir) % pathLen + pathLen) % pathLen;
      const pos = this.borderPath[spark.pathIndex];

      // Check player collision
      if (pos.x === this.player.x && pos.y === this.player.y) {
        this.killPlayer();
        return;
      }

      // Particle trail
      if (Math.random() < 0.3) {
        this.particles.push(this.makeParticle(
          pos.x, pos.y, '#f0f',
          (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 0.25
        ));
      }
    }
  }

  getSparkPositions(): Vec2[] {
    return this.sparks.map(s => this.borderPath[s.pathIndex]);
  }

  // ─── Fuse (Shock Ball) ─────────────────────────────────────
  private startFuse(x: number, y: number): void {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < this.trail.length; i++) {
      const d = Math.abs(this.trail[i].x - x) + Math.abs(this.trail[i].y - y);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    }
    this.fuse = { trailIndex: nearestIdx, moveAccum: 0 };
    this.fuseTimer = 0;
    this.sound.play('fuse');
    this.camera.addTrauma(0.3);
  }

  getFusePosition(): Vec2 | null {
    if (!this.fuse || this.trail.length === 0) return null;
    const idx = Math.min(this.fuse.trailIndex, this.trail.length - 1);
    return this.trail[idx];
  }

  // ─── Capture ───────────────────────────────────────────────
  private completeCapture(): void {
    // 1) Build temp grid with trail as walls
    const tempGrid = new Uint8Array(this.grid);
    for (const t of this.trail) {
      tempGrid[t.y * GRID + t.x] = BORDER;
    }

    // 2) Find void regions via flood fill
    const visited = new Uint8Array(GRID * GRID);
    const regions: number[][] = [];

    for (let y = 2; y < GRID - 2; y++) {
      for (let x = 2; x < GRID - 2; x++) {
        const idx = y * GRID + x;
        if (tempGrid[idx] !== VOID || visited[idx]) continue;

        const region: number[] = [];
        const stack = [idx];
        while (stack.length > 0) {
          const ci = stack.pop()!;
          if (visited[ci] || tempGrid[ci] !== VOID) continue;
          visited[ci] = 1;
          region.push(ci);
          const cx = ci % GRID, cy = (ci / GRID) | 0;
          if (cx > 0) stack.push(ci - 1);
          if (cx < GRID - 1) stack.push(ci + 1);
          if (cy > 0) stack.push(ci - GRID);
          if (cy < GRID - 1) stack.push(ci + GRID);
        }
        regions.push(region);
      }
    }

    // 3) Determine which regions contain orbs
    const orbRegionSet = new Set<number>();
    for (const orb of this.orbs) {
      const oi = orb.y * GRID + orb.x;
      for (let r = 0; r < regions.length; r++) {
        if (regions[r].includes(oi)) { orbRegionSet.add(r); break; }
      }
    }

    // 4) Capture regions WITHOUT orbs
    const capturedCells: Vec2[] = [];
    for (let r = 0; r < regions.length; r++) {
      if (orbRegionSet.has(r)) continue;
      for (const ci of regions[r]) {
        this.grid[ci] = CAPTURED;
        capturedCells.push({ x: ci % GRID, y: (ci / GRID) | 0 });
      }
    }

    // 5) Mark trail as captured
    for (const t of this.trail) {
      this.grid[t.y * GRID + t.x] = CAPTURED;
      capturedCells.push(t);
    }

    // 6) Check containment kills
    const orbsToRemove: number[] = [];
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      if (this.grid[orb.y * GRID + orb.x] === CAPTURED) {
        orbsToRemove.push(i);
      }
    }
    for (const idx of orbsToRemove) {
      const orb = this.orbs[idx];
      this.score += CONTAIN_BONUS;
      this.sound.play('contain');
      this.camera.addTrauma(0.8);
      this.flashTimer = 0.3;
      this.flashColor = '#ff0';
      // Explosion particles
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 5 + Math.random() * 18;
        this.particles.push(this.makeParticle(
          orb.x, orb.y, `hsl(${orb.hue}, 100%, 65%)`,
          Math.cos(angle) * speed, Math.sin(angle) * speed, 0.5 + Math.random() * 0.6
        ));
      }
      this.orbs.splice(idx, 1);
    }

    // 7) Score
    this.score += capturedCells.length * 2 + CAPTURE_BONUS;
    this.captureAnimCells = capturedCells;
    this.captureAnimTimer = 0.4;

    if (orbsToRemove.length === 0) {
      this.sound.play('capture');
      this.camera.addTrauma(0.2);
    }

    // Capture particles
    const particleCount = Math.min(capturedCells.length / 3, 25);
    for (let i = 0; i < particleCount; i++) {
      const cell = capturedCells[Math.floor(Math.random() * capturedCells.length)];
      this.particles.push(this.makeParticle(
        cell.x, cell.y, '#0ff',
        (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, 0.5
      ));
    }

    // Reset trail state
    this.trail = [];
    this.fuse = null;
    this.fuseTimer = 0;
    this.drawing = false;

    // Recompute percentage
    this.updateCapturedPct();

    // Check level complete
    if (this.capturedPct >= this.targetPct) {
      this.phase = 'levelup';
      this.levelUpTimer = 2.0;
      this.flashTimer = 0.5;
      this.flashColor = '#0f0';
      this.camera.addTrauma(0.5);
    }

    // Respawn orbs if all destroyed
    if (this.orbs.length === 0 && this.capturedPct < this.targetPct) {
      this.spawnOrbs(Math.min(this.level, 5));
    }
  }

  private updateCapturedPct(): void {
    let total = 0, captured = 0;
    for (let y = 2; y < GRID - 2; y++) {
      for (let x = 2; x < GRID - 2; x++) {
        total++;
        if (this.grid[y * GRID + x] === CAPTURED) captured++;
      }
    }
    this.capturedPct = Math.round((captured / total) * 100);
  }

  // ─── Death / Respawn ───────────────────────────────────────
  private killPlayer(): void {
    this.lives--;
    this.phase = 'dead';
    this.deadTimer = 1.2;
    this.sound.play('death');
    this.camera.addTrauma(0.9);
    this.flashTimer = 0.3;
    this.flashColor = '#f00';

    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 14;
      this.particles.push(this.makeParticle(
        this.player.x, this.player.y, '#f0f',
        Math.cos(angle) * speed, Math.sin(angle) * speed, 0.4 + Math.random() * 0.5
      ));
    }

    // Clear trail from grid
    for (const t of this.trail) {
      if (this.grid[t.y * GRID + t.x] === TRAIL) this.grid[t.y * GRID + t.x] = VOID;
    }
    this.trail = [];
    this.fuse = null;
    this.fuseTimer = 0;
  }

  private respawnPlayer(): void {
    this.phase = 'playing';
    this.player = { x: 2, y: 2 };
    this.playerDir = 'none';
    this.drawing = false;
  }

  private saveHighScore(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try { localStorage.setItem('voltgrid_hs', String(this.highScore)); } catch { /* noop */ }
    }
  }

  // ─── Particles ─────────────────────────────────────────────
  private makeParticle(x: number, y: number, color: string, vx: number, vy: number, life: number): Particle {
    return { x, y, vx, vy, life, maxLife: life, size: 1.5 + Math.random() * 2.5, color };
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  // ─── Haptics bridge ────────────────────────────────────────
  async vibrate(style: 'light' | 'medium' | 'heavy'): Promise<void> {
    try {
      const cap = (globalThis as Record<string, unknown>).Capacitor as { Plugins?: { Haptics?: { impact: (a: { style: string }) => Promise<void> } } } | undefined;
      const mapped = style === 'light' ? 'LIGHT' : style === 'medium' ? 'MEDIUM' : 'HEAVY';
      if (cap?.Plugins?.Haptics?.impact) {
        await cap.Plugins.Haptics.impact({ style: mapped });
        return;
      }
      if (navigator.vibrate) navigator.vibrate(style === 'light' ? 10 : style === 'medium' ? 20 : 40);
    } catch { /* noop */ }
  }
}
