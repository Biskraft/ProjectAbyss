import { GameAction } from '@core/InputManager';
import { t } from '@i18n';
import type { Game } from '../../Game';

interface ItemWorldUnavailableInputRuntimeDeps {
  game: Game;
  showToast: (message: string, color: number) => void;
}

export class ItemWorldUnavailableInputRuntime {
  constructor(private readonly deps: ItemWorldUnavailableInputRuntimeDeps) {}

  update(): void {
    const input = this.deps.game.input;
    if (input.isJustPressed(GameAction.MAP)) {
      input.consumeJustPressed(GameAction.MAP);
      this.deps.showToast(t('toast.currently_unavailable'), 0xaaaaaa);
    }
    if (input.isJustPressed(GameAction.INVENTORY)) {
      input.consumeJustPressed(GameAction.INVENTORY);
      this.deps.showToast(t('toast.currently_unavailable'), 0xaaaaaa);
    }
  }
}
