import { GameAction } from '@core/InputManager';
import { isAnyJustPressedAction } from '@scenes/shared/InputPressHelpers';

interface PressedActionInput {
  isJustPressed(action: GameAction): boolean;
}

export interface ItemSelectionInputOptions<TItem> {
  input: PressedActionInput;
  items: TItem[];
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  redraw: () => void;
  onConfirm: (item: TItem) => void;
  onEmptyConfirm: () => void;
  onCancel: () => void;
}

export function updateItemSelectionInput<TItem>(
  options: ItemSelectionInputOptions<TItem>,
): void {
  const {
    input,
    items,
    selectedIndex,
    setSelectedIndex,
    redraw,
    onConfirm,
    onEmptyConfirm,
    onCancel,
  } = options;

  if (input.isJustPressed(GameAction.LOOK_UP)) {
    setSelectedIndex(Math.max(0, selectedIndex - 1));
    redraw();
    return;
  }

  if (input.isJustPressed(GameAction.LOOK_DOWN)) {
    setSelectedIndex(Math.min(items.length - 1, selectedIndex + 1));
    redraw();
    return;
  }

  if (isAnyJustPressedAction(input, [GameAction.ATTACK, GameAction.JUMP])) {
    const item = items[selectedIndex];
    if (item) {
      onConfirm(item);
    } else {
      onEmptyConfirm();
    }
    return;
  }

  if (isAnyJustPressedAction(input, [GameAction.MENU, GameAction.DASH])) {
    onCancel();
  }
}
