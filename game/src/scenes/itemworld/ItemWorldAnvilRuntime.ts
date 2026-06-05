import type { Container } from 'pixi.js';
import { GameAction } from '@core/InputManager';
import { Anvil } from '@entities/Anvil';
import type { Player } from '@entities/Player';
import type { Game } from '../../Game';
import { ItemWorldWorldPromptRuntime } from './ItemWorldWorldPromptRuntime';
import {
  addEntityToLayer,
  destroyAndClearEntities,
} from '@scenes/shared/EntityLifecycleHelpers';
import { consumeJustPressedAction } from '@scenes/shared/InputPressHelpers';

interface ItemWorldAnvilRuntimeDeps {
  game: Game;
  getEntityLayer: () => Container;
  getPlayer: () => Player;
  isInteractionSuppressed: () => boolean;
  onReturnRequest: () => void;
}

export class ItemWorldAnvilRuntime {
  private readonly prompt: ItemWorldWorldPromptRuntime;
  private anvils: Anvil[] = [];

  constructor(private readonly deps: ItemWorldAnvilRuntimeDeps) {
    this.prompt = new ItemWorldWorldPromptRuntime({ game: deps.game });
  }

  spawn(x: number, y: number): Anvil {
    const anvil = new Anvil(x, y, false);
    anvil.setShowHint(false);
    addEntityToLayer(this.anvils, anvil, this.deps.getEntityLayer());
    return anvil;
  }

  update(dtMs: number): void {
    if (this.anvils.length === 0) {
      this.prompt.hide();
      return;
    }

    const player = this.deps.getPlayer();
    const suppressed = this.deps.isInteractionSuppressed();
    let nearest: Anvil | null = null;

    for (const anvil of this.anvils) {
      anvil.update(dtMs);
      if (suppressed) continue;

      const promptRange = 16;
      if (anvil.overlaps(
        player.x - promptRange,
        player.y - promptRange,
        player.width + promptRange * 2,
        player.height + promptRange * 2,
      )) {
        nearest = anvil;
      }
    }

    if (!nearest) {
      this.prompt.hide();
      return;
    }

    const anchor = nearest.getFloorPlateCenterWorld();
    this.prompt.show(anchor.x, anchor.y, 'prompt.return');
    // Prompt up → player ignores its ATTACK press (re-enter, don't swing).
    this.deps.game.input.markInteractionPrompt();

    if (consumeJustPressedAction(this.deps.game.input, GameAction.ATTACK)) {
      this.prompt.hide();
      this.deps.onReturnRequest();
    }
  }

  hidePrompt(): void {
    this.prompt.hide();
  }

  clear(): void {
    destroyAndClearEntities(this.anvils);
    this.prompt.destroy();
  }

  destroy(): void {
    this.clear();
  }
}
