import { Container, Graphics } from 'pixi.js';
import { GameAction, actionKey } from '@core/InputManager';
import type { Anvil } from '@entities/Anvil';
import { GAME_HEIGHT, GAME_WIDTH, type Game } from '../../Game';
import { KeyPrompt } from '@ui/KeyPrompt';
import { createUiText } from '@ui/factories';
import { PIXEL_FONT } from '@ui/fonts';
import { t } from '@i18n';

export class AnvilPromptController {
  private actionPrompt: Container | null = null;
  private disabledPrompt: Container | null = null;
  private actionPromptKey = '';

  constructor(private readonly game: Game) {}

  showAction(anvil: Anvil, promptKey: string): void {
    if (!this.actionPrompt || this.actionPromptKey !== promptKey) {
      this.actionPrompt?.parent?.removeChild(this.actionPrompt);
      this.actionPrompt?.destroy({ children: true });
      this.actionPrompt = KeyPrompt.createPrompt(actionKey(GameAction.ATTACK), t(promptKey), this.game.uiScale);
      this.actionPromptKey = promptKey;
    }
    if (!this.actionPrompt.parent) {
      this.game.uiContainer.addChild(this.actionPrompt);
    }
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
    if (!this.disabledPrompt.parent) {
      this.game.uiContainer.addChild(this.disabledPrompt);
    }
    this.disabledPrompt.visible = true;
    this.positionPrompt(this.disabledPrompt, anvil, -56);
  }

  hideAction(): void {
    if (this.actionPrompt) this.actionPrompt.visible = false;
  }

  hideDisabled(): void {
    if (this.disabledPrompt) this.disabledPrompt.visible = false;
  }

  hideAll(): void {
    this.hideAction();
    this.hideDisabled();
  }

  destroy(): void {
    this.actionPrompt?.parent?.removeChild(this.actionPrompt);
    this.actionPrompt?.destroy({ children: true });
    this.actionPrompt = null;
    this.disabledPrompt?.parent?.removeChild(this.disabledPrompt);
    this.disabledPrompt?.destroy({ children: true });
    this.disabledPrompt = null;
    this.actionPromptKey = '';
  }

  private positionPrompt(prompt: Container, anvil: Anvil, yOffset: number): void {
    const us = this.game.uiScale;
    const cam = this.game.camera;
    const anchor = anvil.getFloorPlateCenterWorld();
    const sx = (anchor.x - cam.renderX + GAME_WIDTH / 2) * us - prompt.width / 2;
    const sy = (anvil.y - cam.renderY + GAME_HEIGHT / 2 + yOffset) * us;
    prompt.x = Math.round(sx);
    prompt.y = Math.round(sy);
  }
}
