import type { ThrowableContainer } from '@entities/ThrowableContainer';
import type { TileMutator } from '@systems/TileMutator';
import { isContainerFluidCell, isContainerSolidCell } from './ContainerTileRules';
import { containerOverlapsFluid, createContainerEnvironment } from './ContainerPositionHelpers';

interface UpdateContainerBodiesInput {
  containers: readonly ThrowableContainer[];
  collisionGrid: number[][];
  tileMutator: TileMutator;
  paintContainerImpact: (kind: ThrowableContainer['kind'], gx: number, gy: number, volume: number) => void;
  applyContainerEffectToFluid: (container: ThrowableContainer) => void;
  destroyContainerWithVFX: (container: ThrowableContainer) => void;
  removeContainerAt: (index: number) => void;
}

export function updateContainerBodies(input: UpdateContainerBodiesInput, dtMs: number): void {
  const { containers, collisionGrid } = input;
  for (let i = containers.length - 1; i >= 0; i--) {
    const container = containers[i];
    const envImpact = container.tickEnvironment(
      dtMs,
      createContainerEnvironment(collisionGrid, input.tileMutator),
    );
    if (envImpact) {
      if (containerOverlapsFluid(container, collisionGrid)) {
        input.paintContainerImpact(container.kind, envImpact.gx, envImpact.gy, container.fluidVolume);
      }
      input.applyContainerEffectToFluid(container);
      input.destroyContainerWithVFX(container);
      input.removeContainerAt(i);
      continue;
    }

    const impact = container.update(
      dtMs,
      (gx, gy) => isContainerSolidCell(collisionGrid, container, gx, gy),
      containers,
      (gx, gy) => isContainerFluidCell(collisionGrid, gx, gy),
    );
    if (impact) {
      input.paintContainerImpact(container.kind, impact.gx, impact.gy, container.fluidVolume);
      input.destroyContainerWithVFX(container);
      input.removeContainerAt(i);
      continue;
    }
    input.applyContainerEffectToFluid(container);
  }
}
