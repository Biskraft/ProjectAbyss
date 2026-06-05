import type { Game } from '../../Game';
import type { Player } from '@entities/Player';
import type { ThrowableContainer } from '@entities/ThrowableContainer';
import type { Container } from 'pixi.js';
import { ArcTether } from '@effects/ArcTether';
import {
  updateContainerPrompt,
} from '@systems/ContainerInteraction';
import {
  createEmptyContainerCarryState,
  updateContainerCarryState,
  updateContainerCarryTether,
  type ContainerCarryState,
} from '@scenes/shared/ContainerCarryStateHelpers';

interface UpdateDeps {
  dtMs: number;
  game: Game;
  player: Player;
  findTarget: () => ThrowableContainer | null;
  promptText: string;
}

export class WorldContainerCarryRuntime {
  private containerPrompt: Container | null = null;
  private state: ContainerCarryState = createEmptyContainerCarryState();
  private arcTether: ArcTether | null = null;

  get heldContainer(): ThrowableContainer | null {
    return this.state.heldContainer;
  }

  initialize(entityLayer: Container): void {
    if (this.arcTether) return;
    this.arcTether = new ArcTether();
    entityLayer.addChild(this.arcTether.container);
  }

  reset(): void {
    this.state = createEmptyContainerCarryState();
    this.arcTether?.hide();
  }

  update({ dtMs, game, player, findTarget, promptText }: UpdateDeps): void {
    this.state = updateContainerCarryState({
      dtMs,
      input: game.input,
      player,
      arcTether: this.arcTether,
      state: this.state,
      findTarget,
    });
    this.containerPrompt = updateContainerPrompt({
      game,
      prompt: this.containerPrompt,
      heldContainer: this.state.heldContainer,
      findTarget,
      promptText,
    });
    updateContainerCarryTether({
      dtMs,
      player,
      arcTether: this.arcTether,
      state: this.state,
      findHover: findTarget,
    });
  }
}
