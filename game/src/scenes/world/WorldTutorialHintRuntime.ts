import { GameAction } from '@core/InputManager';
import type { Player } from '@entities/Player';
import { t } from '@i18n';
import type { TutorialHint } from '@ui/TutorialHint';
import type { Game } from '../../Game';

const HINT_LINGER_MS = 1000;
const JUMP_HINT_AFTER_MOVE_MS = 1000;

type TutorialHintId = 'hint_jump' | 'hint_attack';

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
  private jumpHintHandled = false;
  private attackHintHandled = false;
  private jumpHintMoveDelayMs: number | null = null;

  constructor(private readonly deps: WorldTutorialHintRuntimeDeps) {}

  update(dt: number): void {
    const player = this.deps.getPlayer();
    const input = this.deps.game.input;
    const currentLevelId = this.deps.getCurrentLevelId();
    const spawnLevelId = this.deps.getPlayerSpawnLevelId();

    if (!this.dropThroughHintHandled && player.isOnOneWayPlatform()) {
      this.deps.tutorialHint.tryShow('hint_drop_through', {
        actions: [GameAction.LOOK_DOWN, GameAction.JUMP],
        text: t('tutorial.drop_through'),
        persistent: true,
      });
    }

    if (!this.jumpHintHandled) {
      const isInSpawnRoom = currentLevelId === spawnLevelId;
      const movedHorizontally =
        input.isDown(GameAction.MOVE_LEFT) || input.isDown(GameAction.MOVE_RIGHT);
      if (isInSpawnRoom && movedHorizontally && this.jumpHintMoveDelayMs === null) {
        this.jumpHintMoveDelayMs = JUMP_HINT_AFTER_MOVE_MS;
      }
      if (this.jumpHintMoveDelayMs !== null) {
        this.jumpHintMoveDelayMs = Math.max(0, this.jumpHintMoveDelayMs - dt);
      }
      if (isInSpawnRoom && this.jumpHintMoveDelayMs === 0) {
        this.deps.tutorialHint.tryShow('hint_jump', {
          actions: [GameAction.JUMP],
          text: t('tutorial.jump'),
          persistent: true,
        });
      }
      this.dismissHandledHintWhenPressed('hint_jump', GameAction.JUMP, input);
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
    input: Pick<Game['input'], 'isJustPressed' | 'isDown'>,
  ): void {
    if (!this.deps.tutorialHint.isShowing(id) || !input.isJustPressed(action)) return;

    this.deps.tutorialHint.dismissAfter(id, HINT_LINGER_MS);
    if (id === 'hint_jump') {
      this.jumpHintHandled = true;
      this.jumpHintMoveDelayMs = null;
    } else {
      this.attackHintHandled = true;
    }
  }
}
