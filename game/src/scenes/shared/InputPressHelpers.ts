import { GameAction } from '@core/InputManager';

interface ConsumablePressedActionInput {
  isJustPressed(action: GameAction): boolean;
  consumeJustPressed(action: GameAction): void;
}

export function consumeJustPressedAction(
  input: ConsumablePressedActionInput,
  action: GameAction,
): boolean {
  if (!input.isJustPressed(action)) return false;

  input.consumeJustPressed(action);
  return true;
}

export function isAnyJustPressedAction(
  input: Pick<ConsumablePressedActionInput, 'isJustPressed'>,
  actions: readonly GameAction[],
): boolean {
  return actions.some((action) => input.isJustPressed(action));
}

export function consumePressedActionSnapshot(
  input: Pick<ConsumablePressedActionInput, 'consumeJustPressed'>,
  action: GameAction,
  pressed: boolean,
): boolean {
  if (!pressed) return false;

  input.consumeJustPressed(action);
  return true;
}

export function consumeAnyJustPressedAction(
  input: ConsumablePressedActionInput,
  actions: readonly GameAction[],
): boolean {
  if (!actions.some((action) => input.isJustPressed(action))) return false;

  for (const action of actions) {
    input.consumeJustPressed(action);
  }
  return true;
}
