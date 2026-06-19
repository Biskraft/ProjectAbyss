import { GameAction, actionKey } from '@core/InputManager';
import { t } from '@i18n';
import type { TutorialHint } from '@ui/TutorialHint';
import type { UISkin } from '@ui/UISkin';
import type { Game } from '../../Game';
import type { ItemWorldUiController } from './ItemWorldUiController';

interface ItemWorldOnboardingRuntimeDeps {
  game: Game;
  getUiController: () => ItemWorldUiController;
  getHudSkin: () => UISkin | null;
  getTutorialHint: () => TutorialHint;
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
  private jumpTutorialHintHandled = false;

  constructor(private readonly deps: ItemWorldOnboardingRuntimeDeps) {}

  start(): void {
    this.deps.getUiController().startOnboarding({
      hudSkin: this.deps.getHudSkin(),
      messages: getOnboardingMessages(),
    });
  }

  updateBlockingInput(): boolean {
    if (this.deps.getUiController().isOnboardingDone()) return false;
    if (this.deps.game.input.isJustPressed(GameAction.ATTACK)) {
      this.deps.getUiController().advanceOnboarding({
        hudSkin: this.deps.getHudSkin(),
        messages: getOnboardingMessages(),
      });
    }
    return true;
  }

  updateJumpTutorialHint(): void {
    if (this.jumpTutorialHintHandled) return;

    const tutorialHint = this.deps.getTutorialHint();
    if (tutorialHint.isShowing('hint_jump') && this.deps.game.input.isJustPressed(GameAction.JUMP)) {
      tutorialHint.dismissAfter('hint_jump', 1000);
      this.jumpTutorialHintHandled = true;
    }
  }
}
