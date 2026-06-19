import { GameAction } from '@core/InputManager';
import type { Player } from '@entities/Player';
import { t } from '@i18n';
import type { TutorialHint } from '@ui/TutorialHint';
import type { Game } from '../../Game';

const HINT_LINGER_MS = 1000;
const START_ROOM_LEVEL_ID = 'Start_Room_01';
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
  private jumpHintDelayMs: number | null = null;
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

    if (!this.jumpHintHandled) {
      this.updateJumpHint(dt, input);
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

  private updateJumpHint(dt: number, input: Game['input']): void {
    if (this.deps.getCurrentLevelId() !== START_ROOM_LEVEL_ID) {
      this.jumpHintDelayMs = null;
      return;
    }

    const hasMoveInput = input.isDown(GameAction.MOVE_LEFT) || input.isDown(GameAction.MOVE_RIGHT);
    if (hasMoveInput && this.jumpHintDelayMs === null) {
      this.jumpHintDelayMs = JUMP_HINT_AFTER_MOVE_MS;
    }

    if (this.jumpHintDelayMs !== null) {
      this.jumpHintDelayMs = Math.max(0, this.jumpHintDelayMs - dt);
    }

    if (this.jumpHintDelayMs === 0) {
      this.deps.tutorialHint.tryShow('hint_jump', {
        actions: [GameAction.JUMP],
        text: t('tutorial.jump'),
        persistent: true,
      });
    }

    if (this.deps.tutorialHint.isShowing('hint_jump') && input.isJustPressed(GameAction.JUMP)) {
      this.deps.tutorialHint.dismissAfter('hint_jump', HINT_LINGER_MS);
      this.jumpHintHandled = true;
      this.jumpHintDelayMs = null;
    }
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
