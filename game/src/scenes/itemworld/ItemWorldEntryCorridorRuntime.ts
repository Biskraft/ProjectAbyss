import { type Container, type Texture } from 'pixi.js';
import type { Game } from '../../Game';
import type { LdtkLevel } from '@level/LdtkLoader';
import type { Player } from '@entities/Player';
import {
  ENTRY_CORRIDOR_LEVEL_ID,
  ENTRY_CORRIDOR_LEVEL_PREFIX,
  buildEntryCorridorComposite,
  findEntryCorridorBottomExitY,
  findEntryCorridorLeftSpawn,
  selectEntryCorridorLevels,
} from './ItemWorldEntryCorridorLayout';
import { ItemWorldEntryCorridorState } from './ItemWorldEntryCorridorState';
import { ItemWorldEntryCorridorRevealRuntime } from './ItemWorldEntryCorridorRevealRuntime';
import { ItemWorldEntryCorridorVisibilityRuntime } from './ItemWorldEntryCorridorVisibilityRuntime';
import { ItemWorldEntryCorridorVisualRuntime } from './ItemWorldEntryCorridorVisualRuntime';
import { placePlayerAt } from '@scenes/shared/PlayerPlacementHelpers';

interface ItemWorldEntryCorridorRuntimeDeps {
  game: Game;
  tileSize: number;

  getSceneContainer: () => Container;
  getLdtkTemplates: () => readonly LdtkLevel[];
  getItemUid: () => number;
  getCurrentStratumIndex: () => number;
  getCurrentRoom: () => { col: number; row: number };
  getPlayer: () => Player;
  getPlayerStartForRoom: (stratumIndex: number, col: number, row: number) => { x: number; y: number };
  getCollisionGrid: () => number[][];
  getUnifiedGridPixelBounds: () => { widthPx: number; heightPx: number };
  setRoomData: (grid: number[][]) => void;

  isPlayerStandingOnTop: () => boolean;
  setPlayerGrounded: (grounded: boolean, source: 'container') => void;
  isPlayerGrounded: () => boolean;
  updatePlayer: (dt: number) => void;
  updateMovementVfx: (dt: number) => void;
  updateDmgNumbers: (dt: number) => void;
  updateScreenFlash: (dt: number) => void;
  isAabbClearInGrid: (grid: number[][], x: number, y: number, w: number, h: number) => boolean;

  clearEntryGateFreeze: () => void;
  setCameraForEntryBounds: (widthPx: number, heightPx: number) => void;
  setCameraForWorldBounds: (widthPx: number, heightPx: number) => void;
  setCameraTarget: (x: number, y: number) => void;
  snapCamera: (x: number, y: number) => void;
  updateCamera: (dt: number) => void;

  getHideTargets: () => Array<Container | null | undefined>;
  getColorRestoreTargets: () => Array<Container | null | undefined>;
  getPlayerContainer: () => Container;
  getParallaxContainer: () => Container;
  hideHud: () => void;
  getAtlases: () => Record<string, Texture>;
  getTemperament: () => string | null | undefined;

  startGameplayAfterEntry: () => void;
  beginEntryDialogueAfterTransition: () => void;
}

export { ENTRY_CORRIDOR_LEVEL_ID, ENTRY_CORRIDOR_LEVEL_PREFIX };

export class ItemWorldEntryCorridorRuntime {
  private readonly state = new ItemWorldEntryCorridorState();
  private readonly visibilityRuntime: ItemWorldEntryCorridorVisibilityRuntime;
  private readonly revealRuntime: ItemWorldEntryCorridorRevealRuntime;
  private readonly visualRuntime: ItemWorldEntryCorridorVisualRuntime;

  constructor(private readonly deps: ItemWorldEntryCorridorRuntimeDeps) {
    this.visibilityRuntime = new ItemWorldEntryCorridorVisibilityRuntime({
      game: this.deps.game,
      getHideTargets: this.deps.getHideTargets,
      getColorRestoreTargets: this.deps.getColorRestoreTargets,
      getPlayerContainer: this.deps.getPlayerContainer,
      getParallaxContainer: this.deps.getParallaxContainer,
      hideHud: this.deps.hideHud,
    });

    this.revealRuntime = new ItemWorldEntryCorridorRevealRuntime({
      tileSize: this.deps.tileSize,
      revealRadiusPx: this.deps.tileSize * 7,
      revealMs: 180,
    });

    this.visualRuntime = new ItemWorldEntryCorridorVisualRuntime({
      atlases: this.deps.getAtlases(),
      revealRuntime: this.revealRuntime,
      tileSize: this.deps.tileSize,
      getTemperament: this.deps.getTemperament,
    });
  }

  get isActive(): boolean {
    return this.state.active;
  }

  activate(): boolean {
    const levels = selectEntryCorridorLevels(
      this.deps.getLdtkTemplates(),
      this.deps.getItemUid(),
      this.deps.getCurrentStratumIndex(),
    );

    if (levels.length === 0) {
      console.warn(`[ItemWorld] Missing LDtk entry corridor "${ENTRY_CORRIDOR_LEVEL_PREFIX}*"; starting directly in ItemStratum.`);
      return false;
    }

    const composite = buildEntryCorridorComposite(levels, this.deps.tileSize);
    const bottomExitY = findEntryCorridorBottomExitY(composite.grid, this.deps.tileSize);
    const corridorVisuals = this.visualRuntime.create(composite);
    const container = this.deps.getSceneContainer();
    container.addChildAt(corridorVisuals, Math.min(1, container.children.length));
    this.visibilityRuntime.suppressWorld();

    const player = this.deps.getPlayer();
    const spawn = findEntryCorridorLeftSpawn({
      grid: composite.grid,
      tileSize: this.deps.tileSize,
      playerWidth: player.width,
      playerHeight: player.height,
      isAabbClear: (x, y, w, h) => this.deps.isAabbClearInGrid(composite.grid, x, y, w, h),
    });

    this.deps.setRoomData(composite.grid);
    placePlayerAt(player, spawn.x, spawn.y, {
      resetVelocity: true,
      savePreviousPosition: true,
    });
    player.facingRight = true;

    this.deps.clearEntryGateFreeze();
    this.state.activate(bottomExitY);
    this.deps.setCameraForEntryBounds(composite.widthPx, composite.heightPx);
    const cameraTargetX = player.x + player.width / 2;
    const cameraTargetY = player.y + player.height / 2;
    this.deps.setCameraTarget(cameraTargetX, cameraTargetY);
    this.updateEntryCorridorTileReveal(0);
    return true;
  }

  update(dt: number): boolean {
    if (!this.state.active) return false;

    if (this.deps.isPlayerStandingOnTop()) {
      this.deps.setPlayerGrounded(true, 'container');
    }

    this.deps.updatePlayer(dt);
    this.updateEntryCorridorTileReveal(dt);
    this.deps.updateMovementVfx(dt);
    this.deps.updateDmgNumbers(dt);
    this.deps.updateScreenFlash(dt);

    const player = this.deps.getPlayer();
    const playerCenterX = player.x + player.width / 2;
    const bottomReached = this.deps.isPlayerGrounded()
      && this.state.bottomExitY > 0
      && player.y + player.height >= this.state.bottomExitY - 1;

    if (bottomReached) {
      this.complete();
      return true;
    }

    this.deps.setCameraTarget(playerCenterX, player.y + player.height / 2);
    this.deps.updateCamera(dt);
    return true;
  }

  requestDialogueAfterCompletion(): void {
    this.state.requestDialogueAfterCompletion();
  }

  updateColorRestore(dt: number): void {
    this.visibilityRuntime.updateColorRestore(dt);
  }

  updateSceneExit(): void {
    this.state.reset();
    this.visibilityRuntime.clearColorRestore();
    this.visibilityRuntime.restoreWorld(false);
    this.visualRuntime.destroy();
  }

  destroy(): void {
    this.visibilityRuntime.clearColorRestore();
    this.visibilityRuntime.restoreBackgroundFilter();
  }

  private complete(): void {
    this.state.complete();
    this.deps.setRoomData(this.deps.getCollisionGrid());
    this.visibilityRuntime.restoreWorld();
    this.visualRuntime.destroy();

    const player = this.deps.getPlayer();
    const spawn = this.deps.getPlayerStartForRoom(
      this.deps.getCurrentStratumIndex(),
      this.deps.getCurrentRoom().col,
      this.deps.getCurrentRoom().row,
    );
    placePlayerAt(player, spawn.x, spawn.y, {
      velocity: { vx: 0, vy: 60 },
      savePreviousPosition: true,
    });

    const { widthPx, heightPx } = this.deps.getUnifiedGridPixelBounds();
    this.deps.setCameraForWorldBounds(
      widthPx,
      heightPx,
    );
    this.deps.snapCamera(player.x + player.width / 2, player.y + player.height / 2);
    this.deps.setCameraTarget(player.x + player.width / 2, player.y + player.height / 2);
    this.deps.clearEntryGateFreeze();
    this.deps.startGameplayAfterEntry();

    if (this.state.consumeDialogueAfterCompletion()) {
      this.deps.beginEntryDialogueAfterTransition();
    }
  }

  private updateEntryCorridorTileReveal(dt: number): void {
    const player = this.deps.getPlayer();
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    this.revealRuntime.update(dt, px, py);
  }
}
