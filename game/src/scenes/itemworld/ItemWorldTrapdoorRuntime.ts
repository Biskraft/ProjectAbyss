import { GameAction } from '@core/InputManager';
import { FloatingItemDrop } from '@entities/FloatingItemDrop';
import type { Player } from '@entities/Player';
import type { Trapdoor } from '@entities/Trapdoor';
import type { Game } from '../../Game';
import { consumeJustPressedAction } from '@scenes/shared/InputPressHelpers';
import { ItemWorldWorldPromptRuntime } from './ItemWorldWorldPromptRuntime';

type ItemWorldTrapdoorEntity = Trapdoor | FloatingItemDrop;

interface ItemWorldTrapdoorRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getTrapdoor: () => ItemWorldTrapdoorEntity | null;
  isInteractionSuppressed: () => boolean;
  onActivate: () => void;
}

export class ItemWorldTrapdoorRuntime {
  private readonly prompt: ItemWorldWorldPromptRuntime;

  constructor(private readonly deps: ItemWorldTrapdoorRuntimeDeps) {
    this.prompt = new ItemWorldWorldPromptRuntime({ game: deps.game });
  }

  update(dtMs: number): void {
    const trapdoor = this.deps.getTrapdoor();
    if (!trapdoor) {
      this.prompt.hide();
      return;
    }

    trapdoor.update(dtMs);
    if (!trapdoor.active || this.deps.isInteractionSuppressed()) {
      this.prompt.hide();
      return;
    }

    const player = this.deps.getPlayer();
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    const near = trapdoor.isPlayerNear(px, py);

    if (near) {
      const promptKey = trapdoor instanceof FloatingItemDrop ? 'prompt.absorb' : 'prompt.descend';
      this.prompt.show(trapdoor.x, trapdoor.y - trapdoor.height, promptKey);
      // Prompt up → player ignores its ATTACK press (interact, don't swing).
      this.deps.game.input.markInteractionPrompt();
    } else {
      this.prompt.hide();
    }

    if (near && consumeJustPressedAction(this.deps.game.input, GameAction.ATTACK)) {
      this.prompt.hide();
      this.deps.onActivate();
    }
  }

  hidePrompt(): void {
    this.prompt.hide();
  }

  destroy(): void {
    this.prompt.destroy();
  }
}
