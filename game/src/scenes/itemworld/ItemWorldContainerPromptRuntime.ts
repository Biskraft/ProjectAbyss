import type { Container } from 'pixi.js';
import { t } from '@i18n';
import type { ThrowableContainer } from '@entities/ThrowableContainer';
import { updateContainerPrompt as updateContainerPromptUi } from '@systems/ContainerInteraction';
import type { Game } from '../../Game';
import { destroyNullableDisplayObject, hideDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';

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
    hideDisplayObject(this.prompt);
  }

  destroy(): void {
    this.prompt = destroyNullableDisplayObject(this.prompt, { children: true });
  }
}
