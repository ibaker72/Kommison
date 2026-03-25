import type { GameEvent } from './types';

export class VoltGridAudio {
  private ctx: AudioContext | null = null;
  private muted = false;

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(next: boolean): void {
    this.muted = next;
  }

  ensureReady = async (): Promise<void> => {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  };

  play(event: GameEvent): void {
    if (this.muted || !this.ctx) return;

    switch (event) {
      case 'death-hit':
        this.tone(90, 0.2, 'sawtooth', 0.09, -180);
        break;
      case 'trail-infected':
        this.tone(260, 0.12, 'square', 0.05, -20);
        break;
      case 'safe-reconnect':
        this.tone(620, 0.08, 'triangle', 0.04, 60);
        break;
      case 'capture':
        this.chime([420, 620], 0.05);
        break;
      case 'win':
        this.chime([320, 490, 700], 0.07);
        break;
      case 'game-over':
        this.chime([180, 130, 90], 0.12);
        break;
    }
  }

  private chime(notes: number[], dur: number): void {
    notes.forEach((freq, i) => this.tone(freq, dur, 'sine', 0.05, 80 * i, i * dur * 0.75));
  }

  private tone(freq: number, dur: number, type: OscillatorType, volume: number, slide = 0, delay = 0): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.linearRampToValueAtTime(freq + slide, now + dur);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.03);
  }
}
