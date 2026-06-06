import { BitmapText } from 'pixi.js';
import { GameAction } from '@core/InputManager';
import { t } from '@i18n';
import { PIXEL_FONT } from '@ui/fonts';
import { GAME_HEIGHT, GAME_WIDTH, type Game } from '../../Game';
import type { LdtkLevel } from '@level/LdtkLoader';
import type { Player } from '@entities/Player';
import type { ToastManager } from '@ui/Toast';
import type { WorldMapRuntime } from './WorldMapRuntime';
import { placePlayerAt } from '@scenes/shared/PlayerPlacementHelpers';
import { destroyDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';
import { consumeJustPressedAction } from '@scenes/shared/InputPressHelpers';

interface WorldDebugWarpRuntimeDeps {
  game: Game;
  toast: ToastManager;
  worldMapRuntime: WorldMapRuntime;
  getCurrentLevel: () => LdtkLevel | null;
  getPlayer: () => Player;
  isInItemTunnel: () => boolean;
  isGameOverActive: () => boolean;
  reviveFromGameOver: () => void;
  loadLevel: (roomId: string) => void;
  setHudVisible: (visible: boolean) => void;
  setMinimapVisible: (visible: boolean) => void;
}

export class WorldDebugWarpRuntime {
  private readonly debugEnabled =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
  private active = false;
  private hintText: BitmapText | null = null;
  private clickHandler: ((event: PointerEvent) => void) | null = null;

  constructor(private readonly deps: WorldDebugWarpRuntimeDeps) {}

  update(): void {
    if (!this.debugEnabled) return;
    const input = this.deps.game.input;
    const worldMap = this.deps.worldMapRuntime.overlay;

    if (input.shiftDown && !this.deps.isInItemTunnel() && consumeJustPressedAction(input, GameAction.MAP)) {
      if (this.active) this.deactivate();
      this.openDebugWorldMap();
    }

    if (input.isRawKeyJustPressed('Backquote')) {
      if (worldMap.visible) worldMap.close();
      this.toggle();
    }

    if (this.active && !worldMap.visible && consumeJustPressedAction(input, GameAction.MENU)) {
      this.deactivate();
    }
  }

  destroy(): void {
    this.deactivate();
  }

  private openDebugWorldMap(): void {
    this.deps.worldMapRuntime.openDebug((roomId, localX, localY) => {
      this.deps.worldMapRuntime.overlay.close();
      if (this.deps.isGameOverActive()) this.deps.reviveFromGameOver();
      this.warpToRoom(roomId, Math.floor(localX), Math.floor(localY));
    });
    this.deps.setHudVisible(false);
    this.deps.setMinimapVisible(false);
  }

  private toggle(): void {
    if (this.active) this.deactivate();
    else this.activate();
  }

  private activate(): void {
    if (this.active) return;
    this.active = true;

    const game = this.deps.game;
    const uiScale = game.uiScale;
    this.hintText = new BitmapText({
      text: t('ui.debug.warp_mode_hint'),
      style: { fontFamily: PIXEL_FONT, fontSize: 8 * uiScale, fill: 0xffe060 },
    });
    this.hintText.x = Math.floor((game.app.canvas.width - this.hintText.width) / 2);
    this.hintText.y = 6 * uiScale;
    game.uiContainer.addChild(this.hintText);

    this.clickHandler = (event: PointerEvent) => this.warpToScreenClick(event);
    game.app.canvas.addEventListener('pointerdown', this.clickHandler);
    game.app.canvas.style.cursor = 'crosshair';
  }

  private deactivate(): void {
    if (!this.active && !this.hintText && !this.clickHandler) return;
    this.active = false;

    if (this.hintText) {
      destroyDisplayObject(this.hintText);
      this.hintText = null;
    }
    if (this.clickHandler) {
      this.deps.game.app.canvas.removeEventListener('pointerdown', this.clickHandler);
      this.clickHandler = null;
    }
    this.deps.game.app.canvas.style.cursor = '';
  }

  private warpToScreenClick(event: PointerEvent): void {
    const currentLevel = this.deps.getCurrentLevel();
    if (!currentLevel) return;
    const game = this.deps.game;
    const rect = game.app.canvas.getBoundingClientRect();
    const fractionX = (event.clientX - rect.left) / rect.width;
    const fractionY = (event.clientY - rect.top) / rect.height;
    const camera = game.camera;
    const renderWidth = GAME_WIDTH / camera.zoom;
    const renderHeight = GAME_HEIGHT / camera.zoom;
    const localX = camera.renderX - renderWidth / 2 + fractionX * renderWidth;
    const localY = camera.renderY - renderHeight / 2 + fractionY * renderHeight;
    this.warpPlayerToLocal(localX, localY);
    this.deps.toast.show(t('toast.warped'), 0xffe060);
  }

  private warpToRoom(roomId: string, localX: number, localY: number): void {
    if (this.deps.getCurrentLevel()?.identifier !== roomId) {
      this.deps.loadLevel(roomId);
    }
    this.warpPlayerToLocal(localX, localY);
    this.deps.setHudVisible(true);
    this.deps.setMinimapVisible(true);
    this.deps.toast.show(t('toast.warped_to', { room: roomId }), 0xffe060);
  }

  private warpPlayerToLocal(clickX: number, clickY: number): void {
    const currentLevel = this.deps.getCurrentLevel();
    if (!currentLevel) return;
    const player = this.deps.getPlayer();
    player.attackInputEnabled = true;
    const grid = currentLevel.collisionGrid;
    const tileSize = 16;
    const col = Math.floor(clickX / tileSize);
    const startRow = Math.floor(clickY / tileSize);
    const maxRow = grid.length - 1;

    let footY = clickY;
    if (col >= 0 && grid[0] && col < grid[0].length) {
      for (let row = Math.max(0, startRow); row <= maxRow; row++) {
        const cell = grid[row]?.[col] ?? 0;
        if (cell === 1) {
          footY = row * tileSize + 1;
          break;
        }
      }
    }

    placePlayerAt(player, clickX - player.width / 2, footY - player.height, {
      resetVelocity: true,
      savePreviousPosition: true,
    });

    for (let i = 0; i < 5; i++) {
      player.update(16.667);
    }

    this.deps.game.camera.snap(
      player.x + player.width / 2,
      player.y + player.height / 2,
    );
  }
}
