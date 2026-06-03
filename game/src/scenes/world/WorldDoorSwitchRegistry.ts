import type { Container } from 'pixi.js';
import type { LockedDoor } from '@entities/LockedDoor';
import type { Switch } from '@entities/Switch';

export class WorldDoorSwitchRegistry {
  readonly doors: LockedDoor[] = [];
  readonly switches: Switch[] = [];

  private readonly doorCollisionGrids = new WeakMap<LockedDoor, number[][]>();
  private readonly switchCollisionGrids = new WeakMap<Switch, number[][]>();

  addDoor(door: LockedDoor, collisionGrid: number[][], entityLayer?: Container): void {
    this.doors.push(door);
    this.doorCollisionGrids.set(door, collisionGrid);
    if (entityLayer && !door.container.parent) entityLayer.addChild(door.container);
  }

  addSwitch(sw: Switch, collisionGrid: number[][], entityLayer?: Container): void {
    this.switches.push(sw);
    this.switchCollisionGrids.set(sw, collisionGrid);
    if (entityLayer && !sw.container.parent) entityLayer.addChild(sw.container);
  }

  clearDoors(): void {
    for (const door of this.doors) door.destroy();
    this.doors.length = 0;
  }

  clearSwitches(): void {
    for (const sw of this.switches) sw.destroy();
    this.switches.length = 0;
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
