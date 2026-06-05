import type { Player } from '@entities/Player';
import type { ThrowableContainer } from '@entities/ThrowableContainer';
import type { ArcTether } from '@effects/ArcTether';
import type { GameAction } from '@core/InputManager';
import {
  updateContainerArcTether,
  updateContainerGrabInput,
  updateHeldContainerCarry,
} from '@systems/ContainerInteraction';

export interface ContainerCarryState {
  pullStartX: number;
  pullStartY: number;
  pullElapsedMs: number;
  pullingContainer: ThrowableContainer | null;
  heldContainer: ThrowableContainer | null;
}

interface ContainerCarryStateUpdateDeps {
  dtMs: number;
  input: {
    isJustPressed(action: GameAction): boolean;
    consumeJustPressed(action: GameAction): void;
  };
  player: Player;
  arcTether: ArcTether | null;
  state: ContainerCarryState;
  findTarget: () => ThrowableContainer | null;
}

interface ContainerCarryTetherUpdateDeps {
  dtMs: number;
  player: Player;
  arcTether: ArcTether | null;
  state: ContainerCarryState;
  findHover: () => ThrowableContainer | null;
}

export function createEmptyContainerCarryState(): ContainerCarryState {
  return {
    pullStartX: 0,
    pullStartY: 0,
    pullElapsedMs: 0,
    pullingContainer: null,
    heldContainer: null,
  };
}

export function updateContainerCarryState({
  dtMs,
  input,
  player,
  arcTether,
  state,
  findTarget,
}: ContainerCarryStateUpdateDeps): ContainerCarryState {
  const inputState = updateContainerGrabInput({
    input,
    player,
    arcTether,
    state,
    findTarget,
  });
  return updateHeldContainerCarry({
    dtMs,
    player,
    state: inputState,
  });
}

export function updateContainerCarryTether({
  dtMs,
  player,
  arcTether,
  state,
  findHover,
}: ContainerCarryTetherUpdateDeps): void {
  updateContainerArcTether({
    dtMs,
    player,
    arcTether,
    heldContainer: state.heldContainer,
    pullingContainer: state.pullingContainer,
    findHover,
  });
}

export function clearPlayerLiftPose(player: Player): void {
  player.isLifting = false;
}
