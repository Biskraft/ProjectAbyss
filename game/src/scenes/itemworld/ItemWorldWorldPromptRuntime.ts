import type { Container } from 'pixi.js';
import { GameAction, actionKey } from '@core/InputManager';
import { KeyPrompt } from '@ui/KeyPrompt';
import { t } from '@i18n';
import type { Game } from '../../Game';
import { GAME_HEIGHT, GAME_WIDTH } from '../../Game';

interface ItemWorldWorldPromptRuntimeDeps {
  game: Game;
  action?: GameAction;
}

export class ItemWorldWorldPromptRuntime {
  private prompt: Container | null = null;
  private promptKey = '';

  constructor(private readonly deps: ItemWorldWorldPromptRuntimeDeps) {}

  show(worldX: number, worldY: number, promptKey: string, offsetY = -24): void {
    this.ensurePrompt(promptKey);
    if (!this.prompt) return;

    if (!this.prompt.parent) {
      this.deps.game.uiContainer.addChild(this.prompt);
    }
    this.prompt.visible = true;

    const us = this.deps.game.uiScale;
    const cam = this.deps.game.camera;
    const sx = (worldX - cam.renderX + GAME_WIDTH / 2) * us - this.prompt.width / 2;
    const sy = (worldY - cam.renderY + GAME_HEIGHT / 2 + offsetY) * us;
    this.prompt.x = Math.round(sx);
    this.prompt.y = Math.round(sy);
  }

  hide(): void {
    if (this.prompt) this.prompt.visible = false;
  }

  destroy(): void {
    if (!this.prompt) return;
    this.prompt.parent?.removeChild(this.prompt);
    this.prompt.destroy({ children: true });
    this.prompt = null;
    this.promptKey = '';
  }

  private ensurePrompt(promptKey: string): void {
    if (this.prompt && this.promptKey === promptKey) return;
    this.destroy();
    this.prompt = KeyPrompt.createPrompt(
      actionKey(this.deps.action ?? GameAction.ATTACK),
      t(promptKey),
      this.deps.game.uiScale,
    );
    this.promptKey = promptKey;
  }
}
