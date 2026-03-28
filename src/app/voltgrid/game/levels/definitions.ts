export interface LevelDefinition {
  id: string;
  label: string;
  targetRevealPercent: number;
  orbCount: number;
  orbSpeed: number;
  lives: number;
  modifiers?: {
    bounceVariance?: number;
  };
}

export const VOLTGRID_LEVELS: LevelDefinition[] = [
  {
    id: 'lvl-01',
    label: 'Containment Breach',
    targetRevealPercent: 72,
    orbCount: 1,
    orbSpeed: 180,
    lives: 3,
  },
  {
    id: 'lvl-02',
    label: 'Voltage Surge',
    targetRevealPercent: 74,
    orbCount: 1,
    orbSpeed: 225,
    lives: 3,
  },
  {
    id: 'lvl-03',
    label: 'Twin Core Panic',
    targetRevealPercent: 76,
    orbCount: 2,
    orbSpeed: 210,
    lives: 2,
  },
];
