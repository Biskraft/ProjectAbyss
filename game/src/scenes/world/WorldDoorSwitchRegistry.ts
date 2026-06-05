import type { Container } from 'pixi.js';
import type { LockedDoor } from '@entities/LockedDoor';
import type { Switch } from '@entities/Switch';
import {
  addEntityToLayer,
  destroyAndClearEntities,
} from '@scenes/shared/EntityLifecycleHelpers';

export class WorldDoorSwitchRegistry {
  readonly doors: LockedDoor[] = [];
  readonly switches: Switch[] = [];

  private readonly doorCollisionGrids = new WeakMap<LockedDoor, number[][]>();
  private readonly switchCollisionGrids = new WeakMap<Switch, number[][]>();

  addDoor(door: LockedDoor, collisionGrid: number[][], entityLayer?: Container): void {
    addEntityToLayer(this.doors, door, entityLayer, { onlyAttachIfUnparented: true });
    this.doorCollisionGrids.set(door, collisionGrid);
  }

  addSwitch(sw: Switch, collisionGrid: number[][], entityLayer?: Container): void {
    addEntityToLayer(this.switches, sw, entityLayer, { onlyAttachIfUnparented: true });
    this.switchCollisionGrids.set(sw, collisionGrid);
  }

  clearDoors(): void {
    destroyAndClearEntities(this.doors);
  }

  clearSwitches(): void {
    destroyAndClearEntities(this.switches);
  }

  getDoorCollisionGrid(door: LockedDoor, fallback: number[][]): number[][] {
    return this.doorCollisionGrids.get(door) ?? fallback;
  }

  getSwitchCollisionGrid(sw: Switch, fallback: number[][]): number[][] {
    return this.switchCollisionGrids.get(sw) ?? fallback;
  }

  includesDoor(door: LockedDoor): boolean {
    return this.doors.includes(door);
  }

  includesSwitch(sw: Switch): boolean {
    return this.switches.includes(sw);
  }
}
