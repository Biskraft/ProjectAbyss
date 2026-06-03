import { GameAction } from '@core/InputManager';
import type { Player } from '@entities/Player';
import type { Game } from '../../Game';

interface ItemWorldCameraRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getMapSizePx: () => { width: number; height: number };
}

const LOOK_HOLD_THRESHOLD_MS = 400;

export class ItemWorldCameraRuntime {
  private lookHoldTimerMs = 0;

  constructor(private readonly deps: ItemWorldCameraRuntimeDeps) {}

  update(dtMs: number): void {
    const player = this.deps.getPlayer();
    const { width: mapW, height: mapH } = this.deps.getMapSizePx();

    if (player.x < 0) player.x = 0;
    if (player.y < 0) player.y = 0;
    if (player.x > mapW - player.width) player.x = mapW - player.width;
    if (player.y > mapH - player.height) player.y = mapH - player.height;

    const camera = this.deps.game.camera;
    camera.target = {
      x: player.x + player.width / 2,
      y: player.y + player.height / 2,
    };

    const playerIdle = player.fsm.currentState === 'idle'
      && Math.abs(player.vx) < 1
      && player.hp > 0;
    const lookUp = this.deps.game.input.isDown(GameAction.LOOK_UP);
    const lookDown = this.deps.game.input.isDown(GameAction.LOOK_DOWN);
    const wantLook = playerIdle && (lookUp || lookDown);

    if (wantLook) {
      this.lookHoldTimerMs += dtMs;
    } else {
      this.lookHoldTimerMs = 0;
    }

    camera.lookDirection = (wantLook && this.lookHoldTimerMs >= LOOK_HOLD_THRESHOLD_MS)
      ? (lookUp ? -1 : 1)
      : 0;
    camera.update(dtMs);
  }

  resetLookHold(): void {
    this.lookHoldTimerMs = 0;
    this.deps.game.camera.lookDirection = 0;
  }
}
