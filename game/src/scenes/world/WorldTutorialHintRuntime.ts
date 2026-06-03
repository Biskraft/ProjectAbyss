import { GameAction } from '@core/InputManager';
import type { Player } from '@entities/Player';
import { t } from '@i18n';
import type { TutorialHint } from '@ui/TutorialHint';
import type { Game } from '../../Game';

const HINT_LINGER_MS = 1000;
const INITIAL_JUMP_HINT_DELAY_MS = 2000;
const DASH_ROOM_HINT_DELAY_MS = 1000;

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
  private hasMovedHorizontally = false;
  private jumpHintDelayMs = INITIAL_JUMP_HINT_DELAY_MS;
  private attackHintHandled = false;
  private dashHintHandled = false;
  private dashHintDelayMs = -1;

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
      if (
        isInSpawnRoom &&
        !this.hasMovedHorizontally &&
        (input.isDown(GameAction.MOVE_LEFT) || input.isDown(GameAction.MOVE_RIGHT))
      ) {
        this.hasMovedHorizontally = true;
      }
      if (this.hasMovedHorizontally && this.jumpHintDelayMs > 0) {
        this.jumpHintDelayMs -= dt;
      }
      if (isInSpawnRoom && this.hasMovedHorizontally && this.jumpHintDelayMs <= 0) {
        this.deps.tutorialHint.tryShow('hint_jump', {
          actions: [GameAction.JUMP],
          text: t('tutorial.jump'),
          persistent: true,
        });
      }
      if (this.deps.tutorialHint.isShowing('hint_jump') && input.isJustPressed(GameAction.JUMP)) {
        this.deps.tutorialHint.dismissAfter('hint_jump', HINT_LINGER_MS);
        this.jumpHintHandled = true;
      }
    }

    if (!this.attackHintHandled) {
      if (this.deps.hasEnemyNearby()) {
        this.deps.tutorialHint.tryShow('hint_attack', {
          actions: [GameAction.ATTACK],
          text: t('tutorial.attack'),
          persistent: true,
        });
      }
      if (this.deps.tutorialHint.isShowing('hint_attack') && input.isJustPressed(GameAction.ATTACK)) {
        this.deps.tutorialHint.dismissAfter('hint_attack', HINT_LINGER_MS);
        this.attackHintHandled = true;
      }
    }

    if (!this.dashHintHandled) {
      const inDashRoom = currentLevelId === 'Tutorial_Dash';
      if (inDashRoom) {
        if (this.dashHintDelayMs < 0) this.dashHintDelayMs = DASH_ROOM_HINT_DELAY_MS;
        else if (this.dashHintDelayMs > 0) this.dashHintDelayMs -= dt;
        if (this.dashHintDelayMs <= 0) {
          this.deps.tutorialHint.tryShow('hint_dash', {
            actions: [GameAction.DASH],
            text: t('tutorial.dash'),
            persistent: true,
          });
        }
      } else {
        this.dashHintDelayMs = -1;
      }
      if (this.deps.tutorialHint.isShowing('hint_dash') && input.isJustPressed(GameAction.DASH)) {
        this.deps.tutorialHint.dismissAfter('hint_dash', HINT_LINGER_MS);
        this.dashHintHandled = true;
      }
    }
  }

  handleDropThroughEvent(): void {
    this.deps.tutorialHint.dismissAfter('hint_drop_through', HINT_LINGER_MS);
    this.dropThroughHintHandled = true;
  }
}
