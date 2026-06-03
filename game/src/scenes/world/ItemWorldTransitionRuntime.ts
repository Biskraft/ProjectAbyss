import type { Container } from 'pixi.js';
import type { Game } from '../../Game';
import type { Player } from '@entities/Player';
import {
  ItemWorldTransitionController,
  type ItemWorldTransitionTarget,
} from '@effects/ItemWorldTransitionController';

interface ItemWorldTransitionRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getRealityGroups: () => Array<Array<Container | null | undefined>>;
  getFxLayer: () => Container;
  getOverlayLayer: () => Container;
}

export class ItemWorldTransitionRuntime {
  private transition: ItemWorldTransitionController | null = null;

  constructor(private readonly deps: ItemWorldTransitionRuntimeDeps) {}

  get isActive(): boolean {
    return this.transition !== null;
  }

  start(target: ItemWorldTransitionTarget, onComplete: () => void): void {
    this.destroy();

    const transition = new ItemWorldTransitionController({
      game: this.deps.game,
      player: this.deps.getPlayer(),
      layers: {
        realityGroups: this.deps.getRealityGroups(),
        fxLayer: this.deps.getFxLayer(),
        overlayLayer: this.deps.getOverlayLayer(),
      },
      onComplete: () => {
        if (this.transition === transition) {
          this.transition = null;
        }
        transition.destroy();
        onComplete();
      },
    });

    this.transition = transition;
    transition.start(target);
  }

  update(deltaMS: number): boolean {
    if (!this.transition) return false;
    this.transition.update(deltaMS);
    return true;
  }

  destroy(): void {
    if (!this.transition) return;
    const transition = this.transition;
    this.transition = null;
    transition.destroy();
  }
}
