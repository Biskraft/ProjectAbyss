import { Container } from 'pixi.js';
import { GameAction, actionKey } from '@core/InputManager';
import type { ProximityInteraction, ProximityRouter } from '@core/ProximityRouter';
import { EXP_PER_LEVEL, type ItemInstance } from '@items/ItemInstance';
import { KeyPrompt } from '@ui/KeyPrompt';
import { createItemWorldLeaveConfirmPanel } from '@ui/ItemWorldLeaveConfirmPanel';
import type { UISkin } from '@ui/UISkin';
import { t } from '@i18n';
import {
  destroyNullableDisplayObject,
  hideDisplayObject,
} from '@scenes/shared/DisplayObjectLifecycleHelpers';
import {
  consumeAnyJustPressedAction,
  consumeJustPressedAction,
} from '@scenes/shared/InputPressHelpers';
import { getDistanceSquared } from '@scenes/shared/DistanceHelpers';
import { projectWorldToUi } from '@scenes/shared/WorldPromptProjection';
import { TransitionTokens } from '@effects/TransitionDirector';
import type { Game } from '../../Game';

interface WorldFrozenReturnRuntimeDeps {
  game: Game;
  proximity: ProximityRouter;
  getPlayerContainer: () => Container | null;
  getSnapshot: () => Container | null;
  getUiSkin: () => UISkin | null;
  getItem: () => ItemInstance | null;
  restoreUi: () => void;
  deactivateAtmosphere: () => void;
  cancelDeploymentState: () => void;
  armDistancePx: number;
}

const NEAR_DISTANCE_PX = 64;
const CONFIRM_CANCEL_ACTIONS = [
  GameAction.JUMP,
  GameAction.DASH,
  GameAction.MENU,
  GameAction.CANCEL,
] as const;

export class WorldFrozenReturnRuntime {
  private promptContainer: Container | null = null;
  private confirmPanel: Container | null = null;
  private confirmOpen = false;
  private interactionArmed = false;
  private transitionActive = false;
  private proximityHandler: ProximityInteraction | null = null;

  constructor(private readonly deps: WorldFrozenReturnRuntimeDeps) {}

  get isConfirmOpen(): boolean {
    return this.confirmOpen;
  }

  get isTransitionActive(): boolean {
    return this.transitionActive;
  }

  attachSnapshotInteraction(): void {
    this.interactionArmed = false;
    if (!this.proximityHandler) {
      const handler: ProximityInteraction = {
        label: 'frozen-return',
        priority: 25,
        canInteract: () => this.canInteract(),
        onInteract: () => this.showConfirm(),
      };
      this.proximityHandler = handler;
      this.deps.proximity.register(handler);
    }

    if (!this.promptContainer) {
      const prompt = KeyPrompt.createPrompt(actionKey(GameAction.ATTACK), t('prompt.return'), this.deps.game.uiScale);
      prompt.visible = false;
      this.deps.game.uiContainer.addChild(prompt);
      this.promptContainer = prompt;
    }
  }

  updatePrompt(): void {
    const prompt = this.promptContainer;
    if (!prompt) return;

    const snapshot = this.deps.getSnapshot();
    const playerContainer = this.deps.getPlayerContainer();
    if (!snapshot || !playerContainer || this.confirmOpen || this.transitionActive) {
      prompt.visible = false;
      return;
    }

    const distSq = getDistanceSquared(playerContainer.x, playerContainer.y, snapshot.x, snapshot.y);
    const armDistanceSq = this.deps.armDistancePx * this.deps.armDistancePx;
    if (!this.interactionArmed && distSq >= armDistanceSq) {
      this.interactionArmed = true;
    }

    const nearDistanceSq = NEAR_DISTANCE_PX * NEAR_DISTANCE_PX;
    const near = this.interactionArmed && distSq <= nearDistanceSq;
    prompt.visible = near;
    if (!near) return;

    const cam = this.deps.game.camera;
    const promptWorldY = snapshot.y - 48;
    const p = projectWorldToUi({
      camera: cam,
      uiScale: this.deps.game.uiScale,
      worldX: snapshot.x,
      worldY: promptWorldY,
    });
    prompt.x = Math.round(p.x - prompt.width / 2);
    prompt.y = Math.round(p.y);
  }

  updateConfirmInput(): boolean {
    if (!this.confirmOpen) return false;

    const input = this.deps.game.input;
    if (consumeJustPressedAction(input, GameAction.ATTACK)) {
      this.hideConfirm();
      this.beginReturnToWorld();
      return true;
    }

    if (consumeAnyJustPressedAction(input, CONFIRM_CANCEL_ACTIONS)) {
      this.hideConfirm();
      return true;
    }

    return true;
  }

  clearInteraction(): void {
    this.interactionArmed = false;
    if (this.proximityHandler) {
      this.deps.proximity.unregister(this.proximityHandler);
      this.proximityHandler = null;
    }
    this.promptContainer = destroyNullableDisplayObject(this.promptContainer, { children: true });
    this.hideConfirm();
  }

  destroy(): void {
    this.clearInteraction();
    this.transitionActive = false;
  }

  private canInteract(): boolean {
    if (!this.interactionArmed || this.confirmOpen || this.transitionActive) return false;
    const snapshot = this.deps.getSnapshot();
    const playerContainer = this.deps.getPlayerContainer();
    if (!snapshot || !playerContainer) return false;
    return getDistanceSquared(playerContainer.x, playerContainer.y, snapshot.x, snapshot.y)
      <= NEAR_DISTANCE_PX * NEAR_DISTANCE_PX;
  }

  private showConfirm(): void {
    if (this.confirmOpen || this.transitionActive) return;
    this.deps.restoreUi();
    this.confirmOpen = true;

    const item = this.deps.getItem();
    const panel = createItemWorldLeaveConfirmPanel({
      hudSkin: this.deps.getUiSkin()?.isLoaded ? this.deps.getUiSkin() : null,
      itemName: item?.def.name ?? '-',
      itemLevel: item?.level ?? 1,
      itemExp: item?.exp ?? 0,
      expPerLevel: EXP_PER_LEVEL,
      roomsCleared: 0,
      totalRooms: 0,
      earnedExp: 0,
      earnedGold: 0,
    });
    this.confirmPanel = panel;
    this.deps.game.legacyUIContainer.addChild(panel);

    hideDisplayObject(this.promptContainer);
  }

  private hideConfirm(): void {
    this.confirmOpen = false;
    this.confirmPanel = destroyNullableDisplayObject(this.confirmPanel, { children: true });
  }

  private beginReturnToWorld(): void {
    if (this.transitionActive) return;
    this.transitionActive = true;
    this.deps.restoreUi();
    this.hideConfirm();
    this.clearInteraction();
    const started = this.deps.game.transitionDirector.startCoverSwapReveal({
      cover: 'white',
      durationOutMs: TransitionTokens.SCENE_SWAP,
      durationInMs: TransitionTokens.SCENE_SWAP,
      onSwap: () => {
        this.deps.deactivateAtmosphere();
        this.deps.cancelDeploymentState();
      },
      onComplete: () => {
        this.transitionActive = false;
      },
    });
    if (!started) this.transitionActive = false;
  }
}
