import type { ArcTether } from '@effects/ArcTether';
import type { Player } from '@entities/Player';
import type { ThrowableContainer } from '@entities/ThrowableContainer';
import {
  findNearestGrabbableContainer,
  updateContainerArcTether,
  updateContainerGrabInput,
  updateHeldContainerCarry,
} from '@systems/ContainerInteraction';
import type { Game } from '../../Game';
import { ItemWorldContainerPromptRuntime } from './ItemWorldContainerPromptRuntime';

interface ItemWorldContainerCarryRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getContainers: () => ThrowableContainer[];
  getArcTether: () => ArcTether | null;
}

interface ContainerCarryState {
  pullStartX: number;
  pullStartY: number;
  pullElapsedMs: number;
  pullingContainer: ThrowableContainer | null;
  heldContainer: ThrowableContainer | null;
}

export class ItemWorldContainerCarryRuntime {
  private state: ContainerCarryState = {
    pullStartX: 0,
    pullStartY: 0,
    pullElapsedMs: 0,
    pullingContainer: null,
    heldContainer: null,
  };
  private readonly promptRuntime: ItemWorldContainerPromptRuntime;

  constructor(private readonly deps: ItemWorldContainerCarryRuntimeDeps) {
    this.promptRuntime = new ItemWorldContainerPromptRuntime({
      game: deps.game,
      getHeldContainer: () => this.state.heldContainer,
      findTarget: () => this.findNearestGrabbableContainer(),
    });
  }

  hasHeldContainer(): boolean {
    return this.state.heldContainer !== null;
  }

  getHeldContainer(): ThrowableContainer | null {
    return this.state.heldContainer;
  }

  reset(): void {
    this.state = {
      pullStartX: 0,
      pullStartY: 0,
      pullElapsedMs: 0,
      pullingContainer: null,
      heldContainer: null,
    };
    this.deps.getArcTether()?.hide();
    this.promptRuntime.hide();
    this.deps.getPlayer().isLifting = false;
  }

  update(dtMs: number): void {
    this.state = updateContainerGrabInput({
      input: this.deps.game.input,
      player: this.deps.getPlayer(),
      arcTether: this.deps.getArcTether(),
      state: this.state,
      findTarget: () => this.findNearestGrabbableContainer(),
    });
    this.state = updateHeldContainerCarry({
      dtMs,
      player: this.deps.getPlayer(),
      state: this.state,
    });
    this.promptRuntime.update();
    this.updateArcTether(dtMs);
  }

  destroy(): void {
    this.promptRuntime.destroy();
    this.deps.getArcTether()?.hide();
  }

  private findNearestGrabbableContainer(): ThrowableContainer | null {
    return findNearestGrabbableContainer({
      player: this.deps.getPlayer(),
      containers: this.deps.getContainers(),
      input: this.deps.game.input,
    });
  }

  private updateArcTether(dtMs: number): void {
    updateContainerArcTether({
      dtMs,
      player: this.deps.getPlayer(),
      arcTether: this.deps.getArcTether(),
      heldContainer: this.state.heldContainer,
      pullingContainer: this.state.pullingContainer,
      findHover: () => this.findNearestGrabbableContainer(),
    });
  }
}
