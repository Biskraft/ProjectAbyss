import { type Scene } from '@core/Scene';
import { TransitionTokens } from '@effects/TransitionDirector';
import type { Game } from '../../Game';

export interface ItemWorldEntryPushOptions {
  alreadyBlack?: boolean;
  revealMs?: number;
}

export class ItemWorldEntryPushTransition {
  private active = false;

  constructor(private readonly game: Game) {}

  get isActive(): boolean {
    return this.active;
  }

  async push(
    sceneToPush: unknown,
    preparePush: () => void,
    options: ItemWorldEntryPushOptions = {},
    onBeginEntryDialogueAfterTransition?: () => void,
  ): Promise<void> {
    if (this.active) return;
    this.active = true;

    try {
      if (this.game.transitionDirector.isActive) {
        preparePush();
        await this.game.sceneManager.push(sceneToPush as Scene, true);
        onBeginEntryDialogueAfterTransition?.();
        return;
      }

      await this.game.transitionDirector.coverSwapReveal({
        cover: 'black',
        startCovered: options.alreadyBlack,
        durationOutMs: TransitionTokens.SCENE_SWAP,
        durationInMs: options.revealMs ?? TransitionTokens.SCENE_SWAP,
        onSwap: async () => {
          preparePush();
          await this.game.sceneManager.push(sceneToPush as Scene, true);
        },
      });
      onBeginEntryDialogueAfterTransition?.();
    } finally {
      this.active = false;
    }
  }
}

