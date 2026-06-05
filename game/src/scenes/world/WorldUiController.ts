import type { Container, Graphics } from 'pixi.js';
import type { Game } from '../../Game';
import { GameAction } from '@core/InputManager';
import type { HUD } from '@ui/HUD';
import type { PauseMenu } from '@ui/PauseMenu';
import type { DeathScreen } from '@ui/DeathScreen';
import type { TutorialHint } from '@ui/TutorialHint';
import type { InventoryUI, InventoryAttackInputResult } from '@ui/InventoryUI';
import type { IdentityArchive } from '@ui/IdentityArchive';
import type { WorldMapOverlay } from '@ui/WorldMapOverlay';
import type { ToastManager } from '@ui/Toast';
import {
  attachDisplayObjectIfMissing,
  detachDisplayObject,
  detachNullableDisplayObject,
  hideDisplayObject,
  setDisplayObjectVisible,
} from '@scenes/shared/DisplayObjectLifecycleHelpers';
import { updateVerticalFirstDirectionalInput } from '@scenes/shared/DirectionalInputHelpers';
import {
  handleInventoryUiToggle,
  updateInventoryUiInput,
} from '@scenes/shared/InventoryUiInputHelpers';
import { consumeJustPressedAction } from '@scenes/shared/InputPressHelpers';

interface WorldUiControllerDeps {
  hud: HUD;
  pauseMenu: PauseMenu;
  deathScreen: DeathScreen;
  tutorialHint: TutorialHint;
  inventoryUI: InventoryUI;
  identityArchive: IdentityArchive | null;
  worldMap: WorldMapOverlay;
  toast: ToastManager;
  getMinimap: () => Container | null;
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
  onPauseOpened?: () => void;
  onPauseClosed?: () => void;
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

export class WorldUiController {
  constructor(
    private readonly game: Game,
    private readonly deps: WorldUiControllerDeps,
  ) {}

  enter(options: EnterOptions): void {
    const { hud, getMinimap, fadeOverlay, worldMap, inventoryUI } = this.deps;
    const minimap = getMinimap();

    attachDisplayObjectIfMissing(this.game.uiContainer, hud.container);
    hud.container.visible = true;
    hud.setGoldBelowMinimap(options.goldBelowMinimap);
    hud.resetLowHpEffects();
    hud.updateHP(options.playerHp, options.playerMaxHp);
    hud.setItemKeyHighlight(options.highlightItemKey);

    if (minimap) {
      attachDisplayObjectIfMissing(this.game.uiContainer, minimap);
      minimap.visible = options.showMinimap;
    }

    if (fadeOverlay && !fadeOverlay.parent) {
      // fadeOverlay 는 일반 화면 어둡게(트랜지션) — legacyUIContainer 유지 (UI 마이그레이션 대상 아님).
      attachDisplayObjectIfMissing(this.game.legacyUIContainer, fadeOverlay);
    }
    if (!worldMap.container.parent) {
      // uiContainer(native) 직속 — UI native 마이그레이션 1단계.
      attachDisplayObjectIfMissing(this.game.uiContainer, worldMap.container);
    }
    if (!inventoryUI.container.parent) {
      // uiContainer(native) 직속 — UI native 마이그레이션 1단계.
      attachDisplayObjectIfMissing(this.game.uiContainer, inventoryUI.container);
    }
  }

  detachForItemWorld(): void {
    const { hud, getMinimap, fadeOverlay, worldMap, inventoryUI } = this.deps;
    const minimap = getMinimap();

    detachDisplayObject(hud.container);
    detachNullableDisplayObject(minimap);
    detachNullableDisplayObject(fadeOverlay);
    if (worldMap.visible) worldMap.close();
    detachDisplayObject(worldMap.container);
    if (inventoryUI.visible) inventoryUI.close();
    detachDisplayObject(inventoryUI.container);
  }

  updatePersistent(dt: number): void {
    this.deps.toast.update(dt);
    this.deps.tutorialHint.update(dt);
  }

  handleWorldMapToggle(options: WorldMapToggleOptions): boolean {
    const input = this.game.input;
    const { worldMap, hud, getMinimap } = this.deps;
    const minimap = getMinimap();

    if (!options.canToggle || !consumeJustPressedAction(input, GameAction.MAP)) return false;

    if (worldMap.visible) {
      worldMap.close();
      setDisplayObjectVisible(hud.container, true);
      setDisplayObjectVisible(minimap, true);
      return true;
    }

    options.onBeforeOpen();
    worldMap.toggle();
    hideDisplayObject(hud.container);
    hideDisplayObject(minimap);
    return true;
  }

  updateWorldMap(options: WorldMapUpdateOptions): void {
    const { worldMap } = this.deps;

    if (!worldMap.visible) return;
    worldMap.setPlayerPosition(options.playerWorldX, options.playerWorldY);
    worldMap.update(options.dt);
  }

  handleInventoryToggle(options: InventoryToggleOptions): boolean {
    const { inventoryUI } = this.deps;

    return handleInventoryUiToggle({
      input: this.game.input,
      canToggle: options.canToggle,
      toggle: () => inventoryUI.toggle(),
      onToggled: options.onToggled,
    });
  }

  handleInventoryInput(): InventoryAttackInputResult {
    const input = this.game.input;
    const { inventoryUI, identityArchive } = this.deps;

    // === DEC-046 Identity Archive 진입 처리 (Z 키 = JUMP 액션 매핑) ===
    // 인벤토리가 열린 상태이고 archive가 닫힌 상태에서 Z 키 입력 시 진입.
    // archive가 열린 상태에서 키 처리는 별도 (handleIdentityArchiveInput).
    if (identityArchive && !identityArchive.visible && consumeJustPressedAction(input, GameAction.JUMP)) {
      const item = inventoryUI.getSelectedItem();
      if (item) identityArchive.showForItem(item);
      else identityArchive.show();
      return 'none';
    }

    // Identity Archive 활성 시 — 자체 키 처리로 위임 (인벤토리 키는 무시)
    if (identityArchive?.visible) {
      if (input.isJustPressed(GameAction.MENU) || input.isJustPressed(GameAction.JUMP)) {
        identityArchive.hide();
      } else {
        updateVerticalFirstDirectionalInput(input, {
          up: () => identityArchive.navigateCategory(-1),
          down: () => identityArchive.navigateCategory(1),
          left: () => identityArchive.navigateCharacter(-1),
          right: () => identityArchive.navigateCharacter(1),
        });
      }
      return 'none';
    }

    const inputResult = updateInventoryUiInput<InventoryAttackInputResult>({
      input,
      target: inventoryUI,
      onAttack: () => {
        consumeJustPressedAction(input, GameAction.ATTACK);
        return inventoryUI.handleAttackInput();
      },
      onMenu: () => {
        consumeJustPressedAction(input, GameAction.MENU);
        inventoryUI.handleMenuInput();
      },
    });

    if (inputResult.attackResult === 'confirmed_equipment_change') return inputResult.attackResult;

    return 'none';
  }

  handlePauseAndDeath(options: PauseDeathOptions): 'pause' | 'death' | 'none' {
    const input = this.game.input;
    const { pauseMenu, deathScreen } = this.deps;

    if (pauseMenu.visible) {
      if (input.isJustPressed(GameAction.MENU)) {
        pauseMenu.cancel();
        options.onPauseClosed?.();
      } else if (updateVerticalFirstDirectionalInput(input, {
        up: () => pauseMenu.navigate('up'),
        down: () => pauseMenu.navigate('down'),
        left: () => pauseMenu.navigate('left'),
        right: () => pauseMenu.navigate('right'),
      })) {
      } else if (input.isJustPressed(GameAction.ATTACK)) {
        pauseMenu.confirm();
      }
      pauseMenu.update(options.dt); // selection halo pulse
      return 'pause';
    }

    if (!deathScreen.visible && input.isJustPressed(GameAction.MENU)
        && !input.isJustPressed(GameAction.CANCEL) && options.canOpenPause) {
      // CANCEL 동시 발화 = pad B 입력. B 는 모달 close 전용으로 두고 pause
      // open 은 차단한다 (START / Escape 만 pause 토글).
      options.onPauseOpened?.();
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
    const { hud, pauseMenu, deathScreen, tutorialHint, inventoryUI, worldMap, fadeOverlay, getMinimap } = this.deps;
    const minimap = getMinimap();

    tutorialHint.destroy();
    detachDisplayObject(hud.container);
    detachNullableDisplayObject(minimap);
    if (worldMap.visible) worldMap.close();
    detachDisplayObject(worldMap.container);
    if (inventoryUI.visible) inventoryUI.close();
    detachDisplayObject(inventoryUI.container);
    detachNullableDisplayObject(fadeOverlay);
    detachDisplayObject(pauseMenu.container);
    detachDisplayObject(deathScreen.container);
  }
}
