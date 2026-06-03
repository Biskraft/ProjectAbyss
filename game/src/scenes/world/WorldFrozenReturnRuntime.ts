import { Container, Graphics } from 'pixi.js';
import { GameAction, actionKey } from '@core/InputManager';
import type { ProximityInteraction, ProximityRouter } from '@core/ProximityRouter';
import { EXP_PER_LEVEL, type ItemInstance } from '@items/ItemInstance';
import { KeyPrompt } from '@ui/KeyPrompt';
import { createItemWorldLeaveConfirmPanel } from '@ui/ItemWorldLeaveConfirmPanel';
import type { UISkin } from '@ui/UISkin';
import { t } from '@i18n';
import type { Game } from '../../Game';
import { GAME_HEIGHT, GAME_WIDTH } from '../../Game';

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
const RETURN_FADE_IN_MS = 600;
const RETURN_FADE_OUT_MS = 600;
const RETURN_FADE_PEAK_ALPHA = 0.85;

export class WorldFrozenReturnRuntime {
  private promptContainer: Container | null = null;
  private confirmPanel: Container | null = null;
  private confirmOpen = false;
  private interactionArmed = false;
  private transitionActive = false;
  private proximityHandler: ProximityInteraction | null = null;
  private returnOverlay: Graphics | null = null;
  private returnTicker: ((ticker: { deltaMS: number }) => void) | null = null;

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

    const dx = playerContainer.x - snapshot.x;
    const dy = playerContainer.y - snapshot.y;
    const distSq = dx * dx + dy * dy;
    const armDistanceSq = this.deps.armDistancePx * this.deps.armDistancePx;
    if (!this.interactionArmed && distSq >= armDistanceSq) {
      this.interactionArmed = true;
    }

    const nearDistanceSq = NEAR_DISTANCE_PX * NEAR_DISTANCE_PX;
    const near = this.interactionArmed && distSq <= nearDistanceSq;
    prompt.visible = near;
    if (!near) return;

    const us = this.deps.game.uiScale;
    const cam = this.deps.game.camera;
    const promptWorldY = snapshot.y - 48;
    const sx = (snapshot.x - cam.renderX + GAME_WIDTH / 2) * us - prompt.width / 2;
    const sy = (promptWorldY - cam.renderY + GAME_HEIGHT / 2) * us;
    prompt.x = Math.round(sx);
    prompt.y = Math.round(sy);
  }

  updateConfirmInput(): boolean {
    if (!this.confirmOpen) return false;

    const input = this.deps.game.input;
    if (input.isJustPressed(GameAction.ATTACK)) {
      input.consumeJustPressed(GameAction.ATTACK);
      this.hideConfirm();
      this.beginReturnToWorld();
      return true;
    }

    if (
      input.isJustPressed(GameAction.JUMP) ||
      input.isJustPressed(GameAction.DASH) ||
      input.isJustPressed(GameAction.MENU) ||
      input.isJustPressed(GameAction.CANCEL)
    ) {
      input.consumeJustPressed(GameAction.JUMP);
      input.consumeJustPressed(GameAction.DASH);
      input.consumeJustPressed(GameAction.MENU);
      input.consumeJustPressed(GameAction.CANCEL);
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
    if (this.promptContainer) {
      this.promptContainer.parent?.removeChild(this.promptContainer);
      this.promptContainer.destroy({ children: true });
      this.promptContainer = null;
    }
    this.hideConfirm();
  }

  destroy(): void {
    this.clearInteraction();
    this.clearReturnOverlay();
    this.transitionActive = false;
  }

  private canInteract(): boolean {
    if (!this.interactionArmed || this.confirmOpen || this.transitionActive) return false;
    const snapshot = this.deps.getSnapshot();
    const playerContainer = this.deps.getPlayerContainer();
    if (!snapshot || !playerContainer) return false;
    const dx = playerContainer.x - snapshot.x;
    const dy = playerContainer.y - snapshot.y;
    return dx * dx + dy * dy <= NEAR_DISTANCE_PX * NEAR_DISTANCE_PX;
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

    if (this.promptContainer) this.promptContainer.visible = false;
  }

  private hideConfirm(): void {
    this.confirmOpen = false;
    if (!this.confirmPanel) return;
    this.confirmPanel.parent?.removeChild(this.confirmPanel);
    this.confirmPanel.destroy({ children: true });
    this.confirmPanel = null;
  }

  private beginReturnToWorld(): void {
    if (this.transitionActive) return;
    this.transitionActive = true;
    this.deps.restoreUi();
    this.hideConfirm();
    this.clearInteraction();

    const overlay = new Graphics();
    overlay.rect(0, 0, GAME_WIDTH * this.deps.game.uiScale, GAME_HEIGHT * this.deps.game.uiScale)
      .fill({ color: 0xffffff, alpha: 1 });
    overlay.alpha = 0;
    this.deps.game.uiContainer.addChild(overlay);
    this.returnOverlay = overlay;

    let elapsed = 0;
    let phase: 'in' | 'out' = 'in';

    const onTick = (ticker: { deltaMS: number }) => {
      elapsed += ticker.deltaMS;
      if (phase === 'in') {
        overlay.alpha = Math.min(RETURN_FADE_PEAK_ALPHA, (elapsed / RETURN_FADE_IN_MS) * RETURN_FADE_PEAK_ALPHA);
        if (elapsed >= RETURN_FADE_IN_MS) {
          phase = 'out';
          elapsed = 0;
          overlay.alpha = RETURN_FADE_PEAK_ALPHA;
          this.deps.deactivateAtmosphere();
          this.deps.cancelDeploymentState();
        }
        return;
      }

      overlay.alpha = RETURN_FADE_PEAK_ALPHA * (1 - elapsed / RETURN_FADE_OUT_MS);
      if (elapsed >= RETURN_FADE_OUT_MS) {
        this.clearReturnOverlay();
        this.transitionActive = false;
      }
    };

    this.returnTicker = onTick;
    this.deps.game.app.ticker.add(onTick);
  }

  private clearReturnOverlay(): void {
    if (this.returnTicker) {
      this.deps.game.app.ticker.remove(this.returnTicker);
      this.returnTicker = null;
    }
    if (this.returnOverlay) {
      this.returnOverlay.parent?.removeChild(this.returnOverlay);
      this.returnOverlay.destroy();
      this.returnOverlay = null;
    }
  }
}
