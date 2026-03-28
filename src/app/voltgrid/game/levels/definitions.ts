export interface LevelDefinition {
  id: string;
  label: string;
  targetRevealPercent: number;
  orbCount: number;
  orbSpeedMultiplier: number;
}

export const VOLTGRID_LEVELS: LevelDefinition[] = [
  {
    id: 'lvl-01',
    label: 'Containment Breach',
    targetRevealPercent: 72,
    orbCount: 1,
    orbSpeedMultiplier: 1,
  },
];
