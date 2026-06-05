import { GameAction } from '@core/InputManager';
import { consumeJustPressedAction } from '@scenes/shared/InputPressHelpers';

interface PressedActionInput {
  isJustPressed(action: GameAction): boolean;
}

type InventoryGridDirection = 'left' | 'right' | 'up' | 'down';

export interface InventoryUiInputTarget {
  cycleFilter(): void;
  navigate(dir: InventoryGridDirection): void;
}

export interface InventoryUiInputOptions<TAttackResult> {
  input: PressedActionInput;
  target: InventoryUiInputTarget;
  onAttack?: () => TAttackResult;
  onMenu?: () => void;
}

export interface InventoryUiInputResult<TAttackResult> {
  attacked: boolean;
  menuPressed: boolean;
  attackResult: TAttackResult | null;
}

export interface InventoryUiToggleOptions {
  input: PressedActionInput & {
    consumeJustPressed(action: GameAction): void;
  };
  canToggle: boolean;
  toggle: () => void;
  onToggled?: () => void;
}

export function handleInventoryUiToggle(options: InventoryUiToggleOptions): boolean {
  const { input, canToggle, toggle, onToggled } = options;

  if (!canToggle || !consumeJustPressedAction(input, GameAction.INVENTORY)) return false;

  toggle();
  onToggled?.();
  return true;
}

export function updateInventoryUiInput<TAttackResult = void>(
  options: InventoryUiInputOptions<TAttackResult>,
): InventoryUiInputResult<TAttackResult> {
  const { input, target, onAttack, onMenu } = options;
  let attacked = false;
  let menuPressed = false;
  let attackResult: TAttackResult | null = null;

  if (input.isJustPressed(GameAction.STATUS)) target.cycleFilter();
  if (input.isJustPressed(GameAction.MOVE_LEFT)) target.navigate('left');
  if (input.isJustPressed(GameAction.MOVE_RIGHT)) target.navigate('right');
  if (input.isJustPressed(GameAction.LOOK_UP)) target.navigate('up');
  if (input.isJustPressed(GameAction.LOOK_DOWN)) target.navigate('down');

  if (input.isJustPressed(GameAction.ATTACK)) {
    attacked = true;
    if (onAttack) attackResult = onAttack();
  }

  if (input.isJustPressed(GameAction.MENU)) {
    menuPressed = true;
    onMenu?.();
  }

  return { attacked, menuPressed, attackResult };
}
