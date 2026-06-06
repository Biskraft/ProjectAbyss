import { GameAction } from '@core/InputManager';
import type { Player } from '@entities/Player';
import { t } from '@i18n';
import type { TutorialHint } from '@ui/TutorialHint';
import type { Game } from '../../Game';

const HINT_LINGER_MS = 1000;

type TutorialHintId = 'hint_attack';

interface WorldTutorialHintRuntimeDeps {
  game: Game;
  tutorialHint: TutorialHint;
  getPlayer: () => Player;
  getCurrentLevelId: () => string | null;
  getPlayerSpawnLevelId: () => string;
  hasEnemyNearby: () => boolean;
}

export class WorldTutorialHintRuntime {
  private dropThroughHintHandled = false;
  private attackHintHandled = false;

  constructor(private readonly deps: WorldTutorialHintRuntimeDeps) {}

  update(dt: number): void {
    const player = this.deps.getPlayer();
    const input = this.deps.game.input;

    if (!this.dropThroughHintHandled && player.isOnOneWayPlatform()) {
      this.deps.tutorialHint.tryShow('hint_drop_through', {
        actions: [GameAction.LOOK_DOWN, GameAction.JUMP],
        text: t('tutorial.drop_through'),
        persistent: true,
      });
    }

    if (!this.attackHintHandled) {
      if (this.deps.hasEnemyNearby()) {
        this.deps.tutorialHint.tryShow('hint_attack', {
          actions: [GameAction.ATTACK],
          text: t('tutorial.attack'),
          persistent: true,
        });
      }
      this.dismissHandledHintWhenPressed('hint_attack', GameAction.ATTACK, input);
    }
  }

  handleDropThroughEvent(): void {
    this.deps.tutorialHint.dismissAfter('hint_drop_through', HINT_LINGER_MS);
    this.dropThroughHintHandled = true;
  }

  private dismissHandledHintWhenPressed(
    id: TutorialHintId,
    action: GameAction,
    input: Pick<Game['input'], 'isJustPressed'>,
  ): void {
    if (!this.deps.tutorialHint.isShowing(id) || !input.isJustPressed(action)) return;

    this.deps.tutorialHint.dismissAfter(id, HINT_LINGER_MS);
    this.attackHintHandled = true;
  }
}
