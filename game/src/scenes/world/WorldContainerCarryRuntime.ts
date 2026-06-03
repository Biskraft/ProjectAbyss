import type { Game } from '../../Game';
import type { Player } from '@entities/Player';
import type { ThrowableContainer } from '@entities/ThrowableContainer';
import type { Container } from 'pixi.js';
import { ArcTether } from '@effects/ArcTether';
import {
  updateContainerArcTether,
  updateContainerGrabInput,
  updateContainerPrompt,
  updateHeldContainerCarry,
} from '@systems/ContainerInteraction';

interface CarryState {
  pullStartX: number;
  pullStartY: number;
  pullElapsedMs: number;
  pullingContainer: ThrowableContainer | null;
  heldContainer: ThrowableContainer | null;
}

interface UpdateDeps {
  dtMs: number;
  game: Game;
  player: Player;
  findTarget: () => ThrowableContainer | null;
  promptText: string;
}

export class WorldContainerCarryRuntime {
  private containerPrompt: Container | null = null;
  private pullingContainer: ThrowableContainer | null = null;
  private held: ThrowableContainer | null = null;
  private pullStartX = 0;
  private pullStartY = 0;
  private pullElapsedMs = 0;
  private arcTether: ArcTether | null = null;

  get heldContainer(): ThrowableContainer | null {
    return this.held;
  }

  initialize(entityLayer: Container): void {
    if (this.arcTether) return;
    this.arcTether = new ArcTether();
    entityLayer.addChild(this.arcTether.container);
  }

  reset(): void {
    this.held = null;
    this.pullingContainer = null;
    this.pullElapsedMs = 0;
    this.arcTether?.hide();
  }

  update({ dtMs, game, player, findTarget, promptText }: UpdateDeps): void {
    this.applyState(updateContainerGrabInput({
      input: game.input,
      player,
      arcTether: this.arcTether,
      state: this.getState(),
      findTarget,
    }));
    this.applyState(updateHeldContainerCarry({
      dtMs,
      player,
      state: this.getState(),
    }));
    this.containerPrompt = updateContainerPrompt({
      game,
      prompt: this.containerPrompt,
      heldContainer: this.held,
      findTarget,
      promptText,
    });
    updateContainerArcTether({
      dtMs,
      player,
      arcTether: this.arcTether,
      heldContainer: this.held,
      pullingContainer: this.pullingContainer,
      findHover: findTarget,
    });
  }

  private getState(): CarryState {
    return {
      pullStartX: this.pullStartX,
      pullStartY: this.pullStartY,
      pullElapsedMs: this.pullElapsedMs,
      pullingContainer: this.pullingContainer,
      heldContainer: this.held,
    };
  }

  private applyState(state: CarryState): void {
    this.pullStartX = state.pullStartX;
    this.pullStartY = state.pullStartY;
    this.pullElapsedMs = state.pullElapsedMs;
    this.pullingContainer = state.pullingContainer;
    this.held = state.heldContainer;
  }
}
