export interface LevelDefinition {
  id: string;
  label: string;
  targetRevealPercent: number;
  orbCount: number;
  orbSpeed: number;
  sparkCount: number;
  sparkSpeed: number;
  playerSpeed: number;
  lives: number;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const getLevelDefinition = (levelIndex: number): LevelDefinition => {
  const level = levelIndex + 1;

  if (level === 1) {
    return {
      id: 'lvl-01',
      label: 'Containment Breach',
      targetRevealPercent: 75,
      orbCount: 1,
      orbSpeed: 190,
      sparkCount: 0,
      sparkSpeed: 230,
      playerSpeed: 34,
      lives: 3,
    };
  }

  if (level === 2) {
    return {
      id: 'lvl-02',
      label: 'Voltage Surge',
      targetRevealPercent: 78,
      orbCount: 2,
      orbSpeed: 220,
      sparkCount: 1,
      sparkSpeed: 260,
      playerSpeed: 38,
      lives: 3,
    };
  }

  const step = level - 3;
  const orbCount = 2 + Math.floor((step + 1) / 2);
  const sparkCount = clamp(1 + Math.floor(step / 2), 1, 6);

  return {
    id: `lvl-${String(level).padStart(2, '0')}`,
    label: 'Neon Overclock',
    targetRevealPercent: clamp(80 + step, 80, 90),
    orbCount: clamp(orbCount, 2, 8),
    orbSpeed: clamp(235 + step * 14, 235, 420),
    sparkCount,
    sparkSpeed: clamp(280 + step * 12, 280, 420),
    playerSpeed: clamp(42 + step * 2.5, 42, 72),
    lives: 3,
  };
};
