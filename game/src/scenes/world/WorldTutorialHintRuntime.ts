import { GameAction } from '@core/InputManager';
import type { Player } from '@entities/Player';
import { t } from '@i18n';
import type { TutorialHint } from '@ui/TutorialHint';
import type { Game } from '../../Game';

const HINT_LINGER_MS = 1000;
const TILE_SIZE = 16;
// 점프 힌트는 아이템계 다이브 직전 — 세이브 포인트 우측 클라이밍 구간(col ≥ 36)에서
// 플랫폼 위로 올라섰을 때(feet row ≤ 20) 표시한다.
const JUMP_HINT_MIN_COL = 36;
const JUMP_HINT_MAX_FEET_ROW = 20;

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
      // 아이템계 다이브 직전 — 세이브 포인트 우측 클라이밍 구간(col ≥ 36)에서
      // 플랫폼 위로 올라섰을 때 점프 힌트 표시.
      const isInSpawnRoom = currentLevelId === spawnLevelId;
      const playerCol = Math.floor((player.x + player.width / 2) / TILE_SIZE);
      const playerFeetRow = Math.floor((player.y + player.height) / TILE_SIZE);
      const climbedAtDiveApproach =
        isInSpawnRoom && playerCol >= JUMP_HINT_MIN_COL && playerFeetRow <= JUMP_HINT_MAX_FEET_ROW;
      if (climbedAtDiveApproach) {
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

  }

  handleDropThroughEvent(): void {
    this.deps.tutorialHint.dismissAfter('hint_drop_through', HINT_LINGER_MS);
    this.dropThroughHintHandled = true;
  }
}
