import type { Container } from 'pixi.js';
import type { GiantBuilder } from '@entities/GiantBuilder';
import { LockedDoor, type UnlockCondition } from '@entities/LockedDoor';
import { Switch } from '@entities/Switch';
import type { LdtkEntity } from '@level/LdtkLoader';
import type { WorldBuilderAttachmentRuntime } from './WorldBuilderAttachmentRuntime';
import type { WorldDoorSwitchRegistry } from './WorldDoorSwitchRegistry';

interface WorldBuilderDoorSwitchRuntimeDeps {
  attachments: WorldBuilderAttachmentRuntime;
  getEntityLayer: () => Container;
  registry: WorldDoorSwitchRegistry;
  getUnlockedEvents: () => Set<string>;
}

export class WorldBuilderDoorSwitchRuntime {
  constructor(private readonly deps: WorldBuilderDoorSwitchRuntimeDeps) {}

  spawnIfDoorSwitch(builder: GiantBuilder, entity: LdtkEntity): boolean {
    switch (entity.type) {
      case 'LockedDoor':
        this.spawnLockedDoor(builder, entity);
        return true;
      case 'Switch':
        this.spawnSwitch(builder, entity);
        return true;
      default:
        return false;
    }
  }

  private spawnLockedDoor(builder: GiantBuilder, entity: LdtkEntity): void {
    const localX = entity.px[0];
    const localY = entity.px[1];
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
    const isAlreadyUnlocked = this.deps.getUnlockedEvents().has(doorKey);
    const door = new LockedDoor(
      localX,
      localY,
      entity.width,
      entity.height,
      entity.iid,
      unlockCondition,
      unlockCondition === 'event' ? unlockEvent : doorKey,
      statType,
      statThreshold,
    );
    door.injectCollision(builder.collisionGrid);
    if (isAlreadyUnlocked) door.unlock(builder.collisionGrid, true);
    this.deps.registry.addDoor(door, builder.collisionGrid, this.deps.getEntityLayer());
    this.deps.attachments.attachWorldPositioned(
      builder,
      door,
      door.container.x,
      door.container.y,
      () => this.deps.registry.includesDoor(door),
    );
  }

  private spawnSwitch(builder: GiantBuilder, entity: LdtkEntity): void {
    const localX = entity.px[0];
    const localY = entity.px[1];
    const ref = (entity.fields['TargetDoor'] ?? entity.fields['targetDoor']) as { entityIid: string } | null;
    if (!ref?.entityIid) return;

    const sw = new Switch(localX, localY, entity.width, entity.height, ref.entityIid);
    if (this.deps.getUnlockedEvents().has(ref.entityIid)) {
      sw.activate(builder.collisionGrid);
    } else {
      sw.injectCollision(builder.collisionGrid);
    }
    this.deps.registry.addSwitch(sw, builder.collisionGrid, this.deps.getEntityLayer());
    this.deps.attachments.attachWorldPositioned(
      builder,
      sw,
      sw.container.x,
      sw.container.y,
      () => this.deps.registry.includesSwitch(sw),
    );
  }
}
