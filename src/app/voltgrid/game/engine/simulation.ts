import { stepGame } from '../../gameLoop';
import type { GameState, InputState, SimulationResult } from '../types/interfaces';

export const stepSimulation = (state: GameState, input: InputState, dtMs: number): SimulationResult =>
  stepGame(state, input, dtMs);
