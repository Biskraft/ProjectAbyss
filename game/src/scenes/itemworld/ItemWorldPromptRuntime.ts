import type { ItemWorldAnvilRuntime } from './ItemWorldAnvilRuntime';
import type { ItemWorldTrapdoorRuntime } from './ItemWorldTrapdoorRuntime';
import type { ItemWorldUiController } from './ItemWorldUiController';

interface ItemWorldPromptRuntimeDeps {
  getUiController: () => ItemWorldUiController;
  getTrapdoorRuntime: () => ItemWorldTrapdoorRuntime;
  getAnvilRuntime: () => ItemWorldAnvilRuntime;
  isRoomTransitionActive: () => boolean;
  isAbsorbActive: () => boolean;
  isExitFade: () => boolean;
  isPostClearHold: () => boolean;
}

export class ItemWorldPromptRuntime {
  constructor(private readonly deps: ItemWorldPromptRuntimeDeps) {}

  hideWorldPrompts(): void {
    this.deps.getUiController().hideWorldPrompts({ exitPrompt: null });
    this.deps.getTrapdoorRuntime().hidePrompt();
    this.deps.getAnvilRuntime().hidePrompt();
  }

  shouldSuppressWorldPrompts(): boolean {
    return this.deps.getUiController().shouldSuppressWorldPrompts({
      isTransitionActive: this.deps.isRoomTransitionActive()
        || this.deps.isAbsorbActive()
        || this.deps.isExitFade()
        || this.deps.isPostClearHold(),
    });
  }

  hideIfSuppressed(): void {
    if (this.shouldSuppressWorldPrompts()) {
      this.hideWorldPrompts();
    }
  }
}
