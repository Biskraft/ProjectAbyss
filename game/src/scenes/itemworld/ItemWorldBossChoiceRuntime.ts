import type { UISkin } from '@ui/UISkin';
import { updateConfirmCancelInput } from '@scenes/shared/ConfirmCancelInputHelpers';
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

  updateInput(): boolean {
    const uiController = this.deps.getUiController();

    if (!uiController.isBossChoiceVisible()) return false;

    updateConfirmCancelInput({
      input: this.deps.game.input,
      onConfirm: () => {
        uiController.hideBossChoice();
        this.deps.onContinue();
      },
      onCancel: () => {
        uiController.hideBossChoice();
        this.deps.onExit();
      },
    });

    return true;
  }
}
