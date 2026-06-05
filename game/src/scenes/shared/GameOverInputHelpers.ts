import { GameAction } from '@core/InputManager';
import { isAnyJustPressedAction } from '@scenes/shared/InputPressHelpers';

interface PressedActionInput {
  isJustPressed(action: GameAction): boolean;
}

export function isGameOverRespawnPressed(input: PressedActionInput): boolean {
  return isAnyJustPressedAction(input, [GameAction.ATTACK, GameAction.JUMP]);
}
