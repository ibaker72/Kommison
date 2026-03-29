export interface LevelDefinition {
  id: string;
  label: string;
  targetRevealPercent: number;
  orbCount: number;
  orbSpeed: number;
  sparkCount: number;
  sparkSpeed: number;
  lives: number;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/**
 * Infinite level scaler.
 *
 * - Level 1: 1 orb, 0 sparks, 75%
 * - Level 2: 2 orbs, 1 spark, 78%
 * - Level 3+: ramps orb/spark pressure and target % up to a hard cap of 90%
 */
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
    lives: 3,
  };
};
