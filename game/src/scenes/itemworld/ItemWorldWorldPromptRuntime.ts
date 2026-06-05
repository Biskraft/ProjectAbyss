import type { Container } from 'pixi.js';
import { GameAction, actionKey } from '@core/InputManager';
import { KeyPrompt } from '@ui/KeyPrompt';
import { t } from '@i18n';
import {
  attachDisplayObjectIfMissing,
  destroyNullableDisplayObject,
  hideDisplayObject,
} from '@scenes/shared/DisplayObjectLifecycleHelpers';
import { projectWorldToUi } from '@scenes/shared/WorldPromptProjection';
import type { Game } from '../../Game';

interface ItemWorldWorldPromptRuntimeDeps {
  game: Game;
  action?: GameAction;
}

export class ItemWorldWorldPromptRuntime {
  private prompt: Container | null = null;
  private promptKey = '';

  constructor(private readonly deps: ItemWorldWorldPromptRuntimeDeps) {}

  show(worldX: number, worldY: number, promptKey: string, offsetY = -24): void {
    if (!this.prompt || this.promptKey !== promptKey) {
      this.destroy();
      this.prompt = KeyPrompt.createPrompt(
        actionKey(this.deps.action ?? GameAction.ATTACK),
        t(promptKey),
        this.deps.game.uiScale,
      );
      this.promptKey = promptKey;
    }
    if (!this.prompt) return;

    attachDisplayObjectIfMissing(this.deps.game.uiContainer, this.prompt);
    this.prompt.visible = true;

    const cam = this.deps.game.camera;
    const p = projectWorldToUi({
      camera: cam,
      uiScale: this.deps.game.uiScale,
      worldX,
      worldY: worldY + offsetY,
    });
    this.prompt.x = Math.round(p.x - this.prompt.width / 2);
    this.prompt.y = Math.round(p.y);
  }

  hide(): void {
    hideDisplayObject(this.prompt);
  }

  destroy(): void {
    this.prompt = destroyNullableDisplayObject(this.prompt, { children: true });
    this.promptKey = '';
  }
}
