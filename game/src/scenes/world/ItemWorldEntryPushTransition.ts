import { type Scene } from '@core/Scene';
import { Graphics } from 'pixi.js';
import { destroyDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';
import { getProgress01 } from '@scenes/shared/NumericHelpers';
import { GAME_WIDTH, GAME_HEIGHT, type Game } from '../../Game';
const ITEM_WORLD_ENTRY_FADE_MS = 350;

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
    this.game.input.inputLocked = true;

    const overlay = new Graphics();
    overlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: 0x000000, alpha: 1 });
    overlay.alpha = options.alreadyBlack ? 1 : 0;
    this.game.feedbackOverlayContainer.addChild(overlay);

    try {
      if (!options.alreadyBlack) {
        await this.tweenOverlay(overlay, 0, 1, ITEM_WORLD_ENTRY_FADE_MS);
      }
      preparePush();
      await this.game.sceneManager.push(sceneToPush as Scene, true);
      await this.tweenOverlay(overlay, 1, 0, options.revealMs ?? ITEM_WORLD_ENTRY_FADE_MS);
      onBeginEntryDialogueAfterTransition?.();
    } finally {
      destroyDisplayObject(overlay);
      this.game.input.inputLocked = false;
      this.active = false;
    }
  }

  private tweenOverlay(
    overlay: Graphics,
    from: number,
    to: number,
    durationMs: number,
  ): Promise<void> {
    overlay.alpha = from;
    if (durationMs <= 0) {
      overlay.alpha = to;
      return Promise.resolve();
    }
    return new Promise(resolve => {
      let elapsed = 0;
      const onTick = (tk: { deltaMS: number }) => {
        elapsed += tk.deltaMS;
        const t = getProgress01(elapsed, durationMs);
        overlay.alpha = from + (to - from) * t;
        if (t >= 1) {
          overlay.alpha = to;
          this.game.app.ticker.remove(onTick);
          resolve();
        }
      };
      this.game.app.ticker.add(onTick);
    });
  }
}
