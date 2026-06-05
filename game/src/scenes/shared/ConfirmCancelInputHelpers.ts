import { GameAction } from '@core/InputManager';

interface PressedActionInput {
  isJustPressed(action: GameAction): boolean;
}

export type ConfirmCancelInputResult = 'confirm' | 'cancel' | 'none';

export interface ConfirmCancelInputOptions {
  input: PressedActionInput;
  onConfirm: () => void;
  onCancel: () => void;
  cancelActions?: readonly GameAction[];
}

export function updateConfirmCancelInput(
  options: ConfirmCancelInputOptions,
): ConfirmCancelInputResult {
  const { input, onConfirm, onCancel, cancelActions = [GameAction.MENU] } = options;

  if (input.isJustPressed(GameAction.ATTACK)) {
    onConfirm();
    return 'confirm';
  }

  if (cancelActions.some((action) => input.isJustPressed(action))) {
    onCancel();
    return 'cancel';
  }

  return 'none';
}
