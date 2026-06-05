import { GameAction } from '@core/InputManager';

interface PressedActionInput {
  isJustPressed(action: GameAction): boolean;
}

export interface DirectionalInputHandlers {
  up: () => void;
  down: () => void;
  left: () => void;
  right: () => void;
}

export function updateVerticalFirstDirectionalInput(
  input: PressedActionInput,
  handlers: DirectionalInputHandlers,
): boolean {
  if (input.isJustPressed(GameAction.LOOK_UP)) {
    handlers.up();
    return true;
  }

  if (input.isJustPressed(GameAction.LOOK_DOWN)) {
    handlers.down();
    return true;
  }

  if (input.isJustPressed(GameAction.MOVE_LEFT)) {
    handlers.left();
    return true;
  }

  if (input.isJustPressed(GameAction.MOVE_RIGHT)) {
    handlers.right();
    return true;
  }

  return false;
}
