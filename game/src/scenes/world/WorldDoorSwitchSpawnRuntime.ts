import type { Container } from 'pixi.js';
import { LockedDoor, type UnlockCondition } from '@entities/LockedDoor';
import { Switch } from '@entities/Switch';
import type { LdtkLevel } from '@level/LdtkLoader';
import type { WorldDoorSwitchRegistry } from './WorldDoorSwitchRegistry';

interface WorldDoorSwitchSpawnRuntimeDeps {
  getCollisionGrid: () => number[][];
  getEntityLayer: () => Container;
  getRegistry: () => WorldDoorSwitchRegistry;
  getUnlockedEvents: () => Set<string>;
}

export class WorldDoorSwitchSpawnRuntime {
  constructor(private readonly deps: WorldDoorSwitchSpawnRuntimeDeps) {}

  spawnDoors(level: LdtkLevel): void {
    const registry = this.deps.getRegistry();
    const collisionGrid = this.deps.getCollisionGrid();
    const entityLayer = this.deps.getEntityLayer();
    const unlockedEvents = this.deps.getUnlockedEvents();

    registry.clearDoors();

    const doorEntities = level.entities.filter(entity => entity.type === 'LockedDoor');
    for (const entity of doorEntities) {
      const rawCondition = (entity.fields['UnlockCondition'] as string)
        || (entity.fields['unlockCondition'] as string)
        || '';
      const unlockCondition = (rawCondition.toLowerCase() as UnlockCondition) || 'event';
      const unlockEvent = (entity.fields['unlockEvent'] as string) || '';
      const statType = ((entity.fields['StatType'] as string)
        || (entity.fields['statType'] as string)
        || 'atk').toLowerCase();
      const statThreshold = (entity.fields['StatThreshold'] as number)
        ?? (entity.fields['statThreshold'] as number)
        ?? 0;
      const doorKey = unlockCondition === 'event' ? unlockEvent : entity.iid;
      const isAlreadyUnlocked = unlockedEvents.has(doorKey);

      const door = new LockedDoor(
        entity.px[0],
        entity.px[1],
        entity.width,
        entity.height,
        entity.iid,
        unlockCondition,
        unlockCondition === 'event' ? unlockEvent : doorKey,
        statType,
        statThreshold,
      );
      door.injectCollision(collisionGrid);
      registry.addDoor(door, collisionGrid, entityLayer);
      if (isAlreadyUnlocked) {
        door.unlock(collisionGrid, true);
      }
    }
  }

  spawnSwitches(level: LdtkLevel): void {
    const registry = this.deps.getRegistry();
    const collisionGrid = this.deps.getCollisionGrid();
    const entityLayer = this.deps.getEntityLayer();
    const unlockedEvents = this.deps.getUnlockedEvents();

    registry.clearSwitches();

    const switchEntities = level.entities.filter(entity => entity.type === 'Switch');
    for (const entity of switchEntities) {
      const ref = (entity.fields['TargetDoor'] ?? entity.fields['targetDoor']) as { entityIid: string } | null;
      if (!ref?.entityIid) continue;

      const sw = new Switch(
        entity.px[0],
        entity.px[1],
        entity.width,
        entity.height,
        ref.entityIid,
      );
      if (unlockedEvents.has(ref.entityIid)) {
        sw.activate(collisionGrid);
      } else {
        sw.injectCollision(collisionGrid);
      }
      registry.addSwitch(sw, collisionGrid, entityLayer);
    }
  }
}
