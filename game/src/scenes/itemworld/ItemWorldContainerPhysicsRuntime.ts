import type { ContainerPhysicsRuntimeDeps } from '@scenes/shared/ContainerPhysicsRuntimeContracts';
import { updateContainerPhysicsRuntime } from '@scenes/shared/ContainerPhysicsRuntimeHelpers';
import { isPlayerStandingOnContainerTop } from '@scenes/shared/ContainerPlayerCollisionHelpers';

export class ItemWorldContainerPhysicsRuntime {
  constructor(private readonly deps: ContainerPhysicsRuntimeDeps) {}

  update(dtMs: number): void {
    updateContainerPhysicsRuntime(this.deps, dtMs);
  }

  isPlayerStandingOnTop(): boolean {
    return isPlayerStandingOnContainerTop(this.deps.getPlayer(), this.deps.getContainers());
  }

}
