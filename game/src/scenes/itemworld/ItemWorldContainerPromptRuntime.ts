import type { Container } from 'pixi.js';
import { t } from '@i18n';
import type { ThrowableContainer } from '@entities/ThrowableContainer';
import { updateContainerPrompt as updateContainerPromptUi } from '@systems/ContainerInteraction';
import type { Game } from '../../Game';

interface ItemWorldContainerPromptRuntimeDeps {
  game: Game;
  getHeldContainer: () => ThrowableContainer | null;
  findTarget: () => ThrowableContainer | null;
}

export class ItemWorldContainerPromptRuntime {
  private prompt: Container | null = null;

  constructor(private readonly deps: ItemWorldContainerPromptRuntimeDeps) {}

  update(): void {
    this.prompt = updateContainerPromptUi({
      game: this.deps.game,
      prompt: this.prompt,
      heldContainer: this.deps.getHeldContainer(),
      findTarget: this.deps.findTarget,
      promptText: t('prompt.lift'),
    });
  }

  hide(): void {
    if (this.prompt) this.prompt.visible = false;
  }

  destroy(): void {
    if (!this.prompt) return;
    if (this.prompt.parent) this.prompt.parent.removeChild(this.prompt);
    this.prompt.destroy({ children: true });
    this.prompt = null;
  }
}
