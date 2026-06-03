import { GameAction, actionKey } from '@core/InputManager';
import { t } from '@i18n';
import type { UISkin } from '@ui/UISkin';
import type { Game } from '../../Game';
import type { ItemWorldUiController } from './ItemWorldUiController';

interface ItemWorldOnboardingRuntimeDeps {
  game: Game;
  getUiController: () => ItemWorldUiController;
  getHudSkin: () => UISkin | null;
}

function getOnboardingMessages(): string[] {
  return [
    t('ui.iw.onboarding_entered'),
    t('ui.iw.onboarding_descend'),
    t('ui.iw.onboarding_controls', {
      menu: actionKey(GameAction.MENU),
      jump: actionKey(GameAction.JUMP),
    }),
  ];
}

export class ItemWorldOnboardingRuntime {
  constructor(private readonly deps: ItemWorldOnboardingRuntimeDeps) {}

  start(): void {
    this.deps.getUiController().startOnboarding({
      hudSkin: this.deps.getHudSkin(),
      messages: getOnboardingMessages(),
    });
  }

  isDone(): boolean {
    return this.deps.getUiController().isOnboardingDone();
  }

  updateBlockingInput(): boolean {
    if (this.isDone()) return false;
    if (this.deps.game.input.isJustPressed(GameAction.ATTACK)) {
      this.deps.getUiController().advanceOnboarding({
        hudSkin: this.deps.getHudSkin(),
        messages: getOnboardingMessages(),
      });
    }
    return true;
  }
}
