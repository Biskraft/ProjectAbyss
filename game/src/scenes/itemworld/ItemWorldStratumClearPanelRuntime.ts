import { GameAction } from '@core/InputManager';
import type { UISkin } from '@ui/UISkin';
import type { Game } from '../../Game';
import type { ItemWorldUiController } from './ItemWorldUiController';

export interface ItemWorldStratumClearPanelSnapshot {
  beforeAtk: number;
  afterAtk: number;
  beforeLevel: number;
  afterLevel: number;
  beforeInnocents: number;
  afterInnocents: number;
}

interface ItemWorldStratumClearPanelRuntimeDeps {
  game: Game;
  getUiController: () => ItemWorldUiController;
  getHudSkin: () => UISkin | null;
}

export class ItemWorldStratumClearPanelRuntime {
  constructor(private readonly deps: ItemWorldStratumClearPanelRuntimeDeps) {}

  show(snapshot: ItemWorldStratumClearPanelSnapshot, isFinal: boolean): void {
    this.deps.getUiController().showStratumClearPanel({
      beforeAtk: snapshot.beforeAtk,
      afterAtk: snapshot.afterAtk,
      beforeLevel: snapshot.beforeLevel,
      afterLevel: snapshot.afterLevel,
      beforeInnocents: snapshot.beforeInnocents,
      afterInnocents: snapshot.afterInnocents,
    }, this.deps.getHudSkin(), isFinal);
  }

  updateInput(): void {
    const input = this.deps.game.input;
    const confirmPressed = input.isJustPressed(GameAction.ATTACK);
    const uiController = this.deps.getUiController();
    uiController.updateStratumClearPanel(confirmPressed);
    if (confirmPressed && !uiController.hasStratumClearPanel()) {
      input.consumeJustPressed(GameAction.ATTACK);
    }
  }

  forceClose(): void {
    this.deps.getUiController().updateStratumClearPanel(true);
  }
}
