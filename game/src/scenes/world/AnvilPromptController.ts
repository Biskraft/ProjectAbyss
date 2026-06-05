import { Container, Graphics } from 'pixi.js';
import { GameAction, actionKey } from '@core/InputManager';
import type { Anvil } from '@entities/Anvil';
import type { Game } from '../../Game';
import { KeyPrompt } from '@ui/KeyPrompt';
import { createUiText } from '@ui/factories';
import { PIXEL_FONT } from '@ui/fonts';
import { t } from '@i18n';
import {
  attachDisplayObjectIfMissing,
  destroyDisplayObject,
  destroyNullableDisplayObject,
  hideDisplayObject,
} from '@scenes/shared/DisplayObjectLifecycleHelpers';
import { projectWorldToUi } from '@scenes/shared/WorldPromptProjection';

export class AnvilPromptController {
  private actionPrompt: Container | null = null;
  private disabledPrompt: Container | null = null;
  private actionPromptKey = '';
  private suppressMs = 0;

  constructor(private readonly game: Game) {}

  get isSuppressed(): boolean {
    return this.suppressMs > 0;
  }

  suppress(durationMs: number): void {
    this.suppressMs = Math.max(this.suppressMs, durationMs);
  }

  updateSuppression(dtMs: number): void {
    if (this.suppressMs <= 0) return;
    this.suppressMs = Math.max(0, this.suppressMs - dtMs);
  }

  showAction(anvil: Anvil, promptKey: string): void {
    if (!this.actionPrompt || this.actionPromptKey !== promptKey) {
      this.actionPrompt = destroyNullableDisplayObject(this.actionPrompt, { children: true });
      this.actionPrompt = KeyPrompt.createPrompt(actionKey(GameAction.ATTACK), t(promptKey), this.game.uiScale);
      this.actionPromptKey = promptKey;
    }
    attachDisplayObjectIfMissing(this.game.uiContainer, this.actionPrompt);
    this.actionPrompt.visible = true;
    this.positionPrompt(this.actionPrompt, anvil, -56);
  }

  showDisabled(anvil: Anvil): void {
    if (!this.disabledPrompt) {
      const us = this.game.uiScale;
      const prompt = new Container();
      const bg = new Graphics();
      bg.roundRect(0, 0, 72 * us, 18 * us, 3 * us)
        .fill({ color: 0x151515, alpha: 0.82 })
        .stroke({ color: 0x777777, width: Math.max(1, us), alpha: 0.9 });
      const label = createUiText(t('ui.world.disabled'), {
        fontFamily: PIXEL_FONT,
        fontSize: 7 * us,
        fill: 0xb8b8b8,
      });
      label.x = Math.round((72 * us - label.width) / 2);
      label.y = Math.round((18 * us - label.height) / 2);
      prompt.addChild(bg, label);
      this.disabledPrompt = prompt;
    }
    attachDisplayObjectIfMissing(this.game.uiContainer, this.disabledPrompt);
    this.disabledPrompt.visible = true;
    this.positionPrompt(this.disabledPrompt, anvil, -56);
  }

  hideAction(): void {
    hideDisplayObject(this.actionPrompt);
  }

  hideDisabled(): void {
    hideDisplayObject(this.disabledPrompt);
  }

  hideAll(): void {
    this.hideAction();
    this.hideDisabled();
  }

  destroy(): void {
    this.actionPrompt = destroyNullableDisplayObject(this.actionPrompt, { children: true });
    this.disabledPrompt = destroyNullableDisplayObject(this.disabledPrompt, { children: true });
    this.actionPromptKey = '';
    this.suppressMs = 0;
  }

  private positionPrompt(prompt: Container, anvil: Anvil, yOffset: number): void {
    const cam = this.game.camera;
    const anchor = anvil.getFloorPlateCenterWorld();
    const p = projectWorldToUi({
      camera: cam,
      uiScale: this.game.uiScale,
      worldX: anchor.x,
      worldY: anvil.y + yOffset,
    });
    prompt.x = Math.round(p.x - prompt.width / 2);
    prompt.y = Math.round(p.y);
  }
}
