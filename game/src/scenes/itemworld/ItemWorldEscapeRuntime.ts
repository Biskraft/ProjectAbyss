import { GameAction } from '@core/InputManager';
import {
  EXP_PER_LEVEL,
  getDisplayName,
  type ItemInstance,
} from '@items/ItemInstance';
import type { UISkin } from '@ui/UISkin';
import type { Game } from '../../Game';
import type { ItemWorldUiController } from './ItemWorldUiController';

interface ItemWorldEscapeRuntimeDeps {
  game: Game;
  getUiController: () => ItemWorldUiController;
  getHudSkin: () => UISkin | null;
  getItem: () => ItemInstance;
  getRoomsCleared: () => number;
  getTotalRooms: () => number;
  getEarnedExp: () => number;
  getEarnedGold: () => number;
  getTransitionState: () => string;
  onExitConfirmed: () => void;
}

export class ItemWorldEscapeRuntime {
  constructor(private readonly deps: ItemWorldEscapeRuntimeDeps) {}

  show(): void {
    const item = this.deps.getItem();
    this.deps.getUiController().showEscapeConfirm({
      hudSkin: this.deps.getHudSkin(),
      itemName: getDisplayName(item),
      itemLevel: item.level,
      itemExp: item.exp,
      expPerLevel: EXP_PER_LEVEL,
      roomsCleared: this.deps.getRoomsCleared(),
      totalRooms: this.deps.getTotalRooms(),
      earnedExp: this.deps.getEarnedExp(),
      earnedGold: this.deps.getEarnedGold(),
      prompts: {
        exitPrompt: null,
      },
    });
  }

  hide(): void {
    this.deps.getUiController().hideEscapeConfirm();
  }

  isVisible(): boolean {
    return this.deps.getUiController().isEscapeConfirmVisible();
  }

  updateInput(): boolean {
    const uiController = this.deps.getUiController();
    const input = this.deps.game.input;

    if (this.deps.getTransitionState() !== 'post_clear_hold'
      && !uiController.isBossChoiceVisible()
      && input.isJustPressed(GameAction.MENU)
    ) {
      if (uiController.isEscapeConfirmVisible()) {
        this.hide();
        return true;
      }

      if (!input.isJustPressed(GameAction.CANCEL)) {
        this.show();
      }
      return true;
    }

    if (!uiController.isEscapeConfirmVisible()) return false;

    if (input.isJustPressed(GameAction.ATTACK)) {
      this.hide();
      this.deps.onExitConfirmed();
      return true;
    }

    if (input.isJustPressed(GameAction.DASH)
      || input.isJustPressed(GameAction.JUMP)
    ) {
      this.hide();
    }
    return true;
  }
}
