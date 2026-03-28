import { renderGame } from '../../render';
import type { GameState } from '../types/interfaces';

export const renderFrame = (
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasWidth: number,
  canvasHeight: number,
  now: number,
): void => {
  renderGame(ctx, state, canvasWidth, canvasHeight, now);
};
