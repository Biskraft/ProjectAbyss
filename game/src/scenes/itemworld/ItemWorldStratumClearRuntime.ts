import { GameAction } from '@core/InputManager';
import type { ItemInstance } from '@items/ItemInstance';
import { consumePressedActionSnapshot } from '@scenes/shared/InputPressHelpers';
import type { Game } from '../../Game';
import type { ItemWorldUiController } from './ItemWorldUiController';

interface ItemWorldStratumClearRuntimeDeps {
  game: Game;
  getUiController: () => ItemWorldUiController;
  getItem: () => ItemInstance;
  getBeforeAtk: () => number;
  getAfterAtk: () => number;
  getBeforeInnocents: () => number;
  getAfterInnocents: () => number;
  onHoldStarted: () => void;
  onContinue: () => void;
  onExit: () => void;
}

export class ItemWorldStratumClearRuntime {
  constructor(private readonly deps: ItemWorldStratumClearRuntimeDeps) {}

  showOverlay(isFinal: boolean, hasNextStratum: boolean): void {
    this.deps.getUiController().showStratumClearOverlay({
      item: this.deps.getItem(),
      beforeAtk: this.deps.getBeforeAtk(),
      afterAtk: this.deps.getAfterAtk(),
      beforeInnocents: this.deps.getBeforeInnocents(),
      afterInnocents: this.deps.getAfterInnocents(),
      isFinal,
      hasNextStratum,
    });
    this.deps.onHoldStarted();
  }

  updateHold(dtMs: number): void {
    const input = this.deps.game.input;
    const attackPressed = input.isJustPressed(GameAction.ATTACK);
    const menuPressed = input.isJustPressed(GameAction.MENU);
    const uiController = this.deps.getUiController();

    uiController.updateStratumClearOverlay(dtMs, attackPressed, menuPressed);

    const choice = uiController.getStratumClearChoice();
    if (choice === 'continue') {
      consumePressedActionSnapshot(input, GameAction.ATTACK, attackPressed);
      uiController.destroyStratumClearOverlay();
      this.deps.onContinue();
    } else if (choice === 'exit') {
      consumePressedActionSnapshot(input, GameAction.MENU, menuPressed);
      consumePressedActionSnapshot(input, GameAction.ATTACK, attackPressed);
      uiController.destroyStratumClearOverlay();
      this.deps.onExit();
    }
  }
}
