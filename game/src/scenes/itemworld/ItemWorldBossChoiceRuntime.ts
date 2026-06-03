import { GameAction } from '@core/InputManager';
import type { UISkin } from '@ui/UISkin';
import type { Game } from '../../Game';
import type { ItemWorldUiController } from './ItemWorldUiController';

interface ItemWorldBossChoiceRuntimeDeps {
  game: Game;
  getUiController: () => ItemWorldUiController;
  getHudSkin: () => UISkin | null;
  onContinue: () => void;
  onExit: () => void;
}

export class ItemWorldBossChoiceRuntime {
  constructor(private readonly deps: ItemWorldBossChoiceRuntimeDeps) {}

  show(nextStratumIndex: number): void {
    this.deps.getUiController().showBossChoice({
      hudSkin: this.deps.getHudSkin(),
      nextStratumIndex,
    });
  }

  hide(): void {
    this.deps.getUiController().hideBossChoice();
  }

  isVisible(): boolean {
    return this.deps.getUiController().isBossChoiceVisible();
  }

  updateInput(): boolean {
    if (!this.isVisible()) return false;

    const input = this.deps.game.input;
    if (input.isJustPressed(GameAction.ATTACK)) {
      this.hide();
      this.deps.onContinue();
      return true;
    }
    if (input.isJustPressed(GameAction.MENU)) {
      this.hide();
      this.deps.onExit();
      return true;
    }
    return true;
  }
}
