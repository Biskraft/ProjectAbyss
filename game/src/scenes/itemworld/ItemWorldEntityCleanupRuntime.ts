import type { CameraZoneRuntime } from '@core/CameraZoneRuntime';
import type { ItemWorldAnvilRuntime } from './ItemWorldAnvilRuntime';
import type { ItemWorldEnemyRegistry } from './ItemWorldEnemyRegistry';
import type { ItemWorldMemoryTriggerRuntime } from './ItemWorldMemoryTriggerRuntime';
import type { ItemWorldPickupRuntime } from './ItemWorldPickupRuntime';
import type { ItemWorldPrologueEndRuntime } from './ItemWorldPrologueEndRuntime';
import type { ItemWorldProjectileRuntime } from './ItemWorldProjectileRuntime';
import type { ItemWorldResidentRuntime } from './ItemWorldResidentRuntime';
import type { ItemWorldRoomSpawnState } from './ItemWorldRoomSpawnState';
import type { ItemWorldStaticEntityRegistry } from './ItemWorldStaticEntityRegistry';
import type { ItemWorldTrapdoorRuntime } from './ItemWorldTrapdoorRuntime';

interface ItemWorldEntityCleanupRuntimeDeps {
  enemyRegistry: ItemWorldEnemyRegistry;
  staticEntityRegistry: ItemWorldStaticEntityRegistry;
  projectileRuntime: ItemWorldProjectileRuntime;
  pickupRuntime: ItemWorldPickupRuntime;
  residentRuntime: ItemWorldResidentRuntime;
  roomSpawnState: ItemWorldRoomSpawnState;
  cameraZoneRuntime: CameraZoneRuntime;
  memoryTriggerRuntime: ItemWorldMemoryTriggerRuntime;
  prologueEndRuntime: ItemWorldPrologueEndRuntime;
  trapdoorRuntime: ItemWorldTrapdoorRuntime;
  itemWorldAnvilRuntime: ItemWorldAnvilRuntime;
  getTrapdoor: () => { destroy(): void } | null;
  clearTrapdoor: () => void;
}

export class ItemWorldEntityCleanupRuntime {
  constructor(private readonly deps: ItemWorldEntityCleanupRuntimeDeps) {}

  clearEnemies(): void {
    this.deps.enemyRegistry.clear();
    this.deps.projectileRuntime.clear();
    this.deps.pickupRuntime.clear();
    this.deps.residentRuntime.clear();
    this.deps.roomSpawnState.resetNeighborPreSpawn();
  }

  clearStaticEntities(): void {
    this.deps.staticEntityRegistry.clear();
    this.deps.cameraZoneRuntime.clear();
    this.deps.memoryTriggerRuntime.clear();
    this.deps.prologueEndRuntime.clear();
    this.deps.residentRuntime.clear();

    const trapdoor = this.deps.getTrapdoor();
    if (trapdoor) {
      this.deps.trapdoorRuntime.hidePrompt();
      trapdoor.destroy();
      this.deps.clearTrapdoor();
    }

    this.deps.itemWorldAnvilRuntime.clear();
  }
}
