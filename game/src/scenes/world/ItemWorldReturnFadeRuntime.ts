import { TransitionTokens } from '@effects/TransitionDirector';
import type { Game } from '../../Game';

interface ItemWorldReturnFadeRuntimeDeps {
  normalizeWorldVisuals?: () => void;
}

export class ItemWorldReturnFadeRuntime {
  private active = false;
  private readonly normalizeWorldVisuals: () => void;

  constructor(game: Game, deps: ItemWorldReturnFadeRuntimeDeps = {}) {
    this.game = game;
    this.normalizeWorldVisuals = deps.normalizeWorldVisuals ?? (() => {});
  }

  private readonly game: Game;

  start(): void {
    if (this.active) return;
    this.normalizeWorldVisuals();
    const started = this.game.transitionDirector.startCoverSwapReveal({
      cover: 'black',
      startCovered: true,
      durationOutMs: 0,
      durationInMs: TransitionTokens.SCENE_SWAP,
      onSwap: () => {},
      onComplete: () => {
        this.active = false;
      },
    });
    this.active = started;
  }

  update(_dt?: number): void {}

  destroy(): void {}
}
