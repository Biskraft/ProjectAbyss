import type { Container, Graphics } from 'pixi.js';
import type { Game } from '../../Game';
import { GameAction } from '@core/InputManager';
import type { HUD } from '@ui/HUD';
import type { PauseMenu } from '@ui/PauseMenu';
import type { DeathScreen } from '@ui/DeathScreen';
import type { TutorialHint } from '@ui/TutorialHint';
import type { InventoryUI } from '@ui/InventoryUI';
import type { WorldMapOverlay } from '@ui/WorldMapOverlay';
import type { ToastManager } from '@ui/Toast';

interface WorldUiControllerDeps {
  hud: HUD;
  pauseMenu: PauseMenu;
  deathScreen: DeathScreen;
  tutorialHint: TutorialHint;
  inventoryUI: InventoryUI;
  worldMap: WorldMapOverlay;
  toast: ToastManager;
  minimap: Container | null;
  fadeOverlay: Graphics | null;
}

interface EnterOptions {
  showMinimap: boolean;
  goldBelowMinimap: boolean;
  playerHp: number;
  playerMaxHp: number;
  highlightItemKey: boolean;
}

interface PauseDeathOptions {
  dt: number;
  canOpenPause: boolean;
  onPauseOpened: () => void;
  onPauseClosed: () => void;
}

interface WorldMapToggleOptions {
  canToggle: boolean;
  onBeforeOpen: () => void;
}

interface WorldMapUpdateOptions {
  dt: number;
  playerWorldX: number;
  playerWorldY: number;
}

interface InventoryToggleOptions {
  canToggle: boolean;
  onToggled: () => void;
}

type InventoryInputResult = 'none' | 'confirmed_equipment_change';

export class WorldUiController {
  constructor(
    private readonly game: Game,
    private readonly deps: WorldUiControllerDeps,
  ) {}

  enter(options: EnterOptions): void {
    const { hud, minimap, fadeOverlay, worldMap, inventoryUI } = this.deps;

    if (!hud.container.parent) this.game.uiContainer.addChild(hud.container);
    hud.container.visible = true;
    hud.setGoldBelowMinimap(options.goldBelowMinimap);
    hud.resetLowHpEffects();
    hud.updateHP(options.playerHp, options.playerMaxHp);
    hud.setItemKeyHighlight(options.highlightItemKey);

    if (minimap) {
      if (!minimap.parent) this.game.uiContainer.addChild(minimap);
      minimap.visible = options.showMinimap;
    }

    if (fadeOverlay && !fadeOverlay.parent) {
      this.game.legacyUIContainer.addChild(fadeOverlay);
    }
    if (!worldMap.container.parent) {
      this.game.legacyUIContainer.addChild(worldMap.container);
    }
    if (!inventoryUI.container.parent) {
      this.game.legacyUIContainer.addChild(inventoryUI.container);
    }
  }

  detachForItemWorld(): void {
    const { hud, minimap, fadeOverlay, worldMap, inventoryUI } = this.deps;

    if (hud.container.parent) {
      hud.container.parent.removeChild(hud.container);
    }
    if (minimap?.parent) {
      minimap.parent.removeChild(minimap);
    }
    if (fadeOverlay?.parent) {
      fadeOverlay.parent.removeChild(fadeOverlay);
    }
    if (worldMap.visible) worldMap.close();
    if (worldMap.container.parent) {
      worldMap.container.parent.removeChild(worldMap.container);
    }
    if (inventoryUI.visible) inventoryUI.close();
    if (inventoryUI.container.parent) {
      inventoryUI.container.parent.removeChild(inventoryUI.container);
    }
  }

  updatePersistent(dt: number): void {
    this.deps.toast.update(dt);
    this.deps.tutorialHint.update(dt);
  }

  handleWorldMapToggle(options: WorldMapToggleOptions): boolean {
    const input = this.game.input;
    const { worldMap, hud, minimap } = this.deps;

    if (!options.canToggle || !input.isJustPressed(GameAction.MAP)) return false;

    input.consumeJustPressed(GameAction.MAP);
    if (worldMap.visible) {
      worldMap.close();
      hud.container.visible = true;
      if (minimap) minimap.visible = true;
      return true;
    }

    options.onBeforeOpen();
    worldMap.toggle();
    hud.container.visible = false;
    if (minimap) minimap.visible = false;
    return true;
  }

  updateWorldMap(options: WorldMapUpdateOptions): void {
    const { worldMap } = this.deps;

    if (!worldMap.visible) return;
    worldMap.setPlayerPosition(options.playerWorldX, options.playerWorldY);
    worldMap.update(options.dt);
  }

  handleInventoryToggle(options: InventoryToggleOptions): boolean {
    const input = this.game.input;
    const { inventoryUI } = this.deps;

    if (!options.canToggle || !input.isJustPressed(GameAction.INVENTORY)) return false;

    input.consumeJustPressed(GameAction.INVENTORY);
    inventoryUI.toggle();
    options.onToggled();
    return true;
  }

  handleInventoryInput(): InventoryInputResult {
    const input = this.game.input;
    const { inventoryUI } = this.deps;

    if (input.isJustPressed(GameAction.MOVE_LEFT)) inventoryUI.navigate('left');
    if (input.isJustPressed(GameAction.MOVE_RIGHT)) inventoryUI.navigate('right');
    if (input.isJustPressed(GameAction.LOOK_UP)) inventoryUI.navigate('up');
    if (input.isJustPressed(GameAction.LOOK_DOWN)) inventoryUI.navigate('down');

    if (input.isJustPressed(GameAction.ATTACK)) {
      const wasAnvilMode = inventoryUI.isAnvilMode();
      inventoryUI.confirmSelected();
      if (!wasAnvilMode) return 'confirmed_equipment_change';
    }

    if (input.isJustPressed(GameAction.JUMP)) {
      inventoryUI.toggleCompare();
    }

    if (input.isJustPressed(GameAction.MENU)) {
      if (inventoryUI.isAnvilMode()) {
        inventoryUI.cancelAnvil();
      } else {
        inventoryUI.close();
      }
    }

    return 'none';
  }

  handlePauseAndDeath(options: PauseDeathOptions): 'pause' | 'death' | 'none' {
    const input = this.game.input;
    const { pauseMenu, deathScreen } = this.deps;

    if (pauseMenu.visible) {
      if (input.isJustPressed(GameAction.MENU)) {
        pauseMenu.cancel();
        options.onPauseClosed();
      } else if (input.isJustPressed(GameAction.LOOK_UP)) {
        pauseMenu.navigate('up');
      } else if (input.isJustPressed(GameAction.LOOK_DOWN)) {
        pauseMenu.navigate('down');
      } else if (input.isJustPressed(GameAction.MOVE_LEFT)) {
        pauseMenu.navigate('left');
      } else if (input.isJustPressed(GameAction.MOVE_RIGHT)) {
        pauseMenu.navigate('right');
      } else if (input.isJustPressed(GameAction.ATTACK)) {
        pauseMenu.confirm();
      }
      return 'pause';
    }

    if (!deathScreen.visible && input.isJustPressed(GameAction.MENU) && options.canOpenPause) {
      options.onPauseOpened();
      pauseMenu.open();
      return 'pause';
    }

    if (deathScreen.visible) {
      deathScreen.update(options.dt);
      if (input.isJustPressed(GameAction.ATTACK)) deathScreen.confirm();
      return 'death';
    }

    return 'none';
  }

  destroy(): void {
    const { hud, pauseMenu, deathScreen, tutorialHint, inventoryUI, worldMap, fadeOverlay, minimap } = this.deps;

    tutorialHint.destroy();
    if (hud.container.parent) hud.container.parent.removeChild(hud.container);
    if (minimap?.parent) minimap.parent.removeChild(minimap);
    if (worldMap.visible) worldMap.close();
    if (worldMap.container.parent) worldMap.container.parent.removeChild(worldMap.container);
    if (inventoryUI.visible) inventoryUI.close();
    if (inventoryUI.container.parent) inventoryUI.container.parent.removeChild(inventoryUI.container);
    if (fadeOverlay?.parent) fadeOverlay.parent.removeChild(fadeOverlay);
    if (pauseMenu.container.parent) pauseMenu.container.parent.removeChild(pauseMenu.container);
    if (deathScreen.container.parent) deathScreen.container.parent.removeChild(deathScreen.container);
  }
}
