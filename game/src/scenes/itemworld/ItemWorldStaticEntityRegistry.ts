import type { Building } from '@entities/Building';
import type { BreakableProp } from '@entities/BreakableProp';
import type { CollapsingPlatform } from '@entities/CollapsingPlatform';
import type { CrackedFloor } from '@entities/CrackedFloor';
import type { GrowingWall } from '@entities/GrowingWall';
import type { ItemDisplay } from '@entities/ItemDisplay';
import type { LockedDoor } from '@entities/LockedDoor';
import type { Spike } from '@entities/Spike';
import type { Switch } from '@entities/Switch';

export class ItemWorldStaticEntityRegistry {
  readonly spikes: Spike[] = [];
  readonly crackedFloors: CrackedFloor[] = [];
  readonly breakableProps: BreakableProp[] = [];
  readonly collapsingPlatforms: CollapsingPlatform[] = [];
  readonly growingWalls: GrowingWall[] = [];
  readonly switches: Switch[] = [];
  readonly lockedDoors: LockedDoor[] = [];
  readonly buildings: Building[] = [];
  readonly itemDisplays: ItemDisplay[] = [];

  clear(): void {
    this.destroyAll(this.spikes);
    this.destroyAll(this.crackedFloors);
    this.destroyAll(this.breakableProps);
    this.destroyAll(this.collapsingPlatforms);
    this.destroyAll(this.growingWalls);
    this.destroyAll(this.switches);
    this.destroyAll(this.lockedDoors);
    this.destroyAll(this.buildings);
    this.destroyAll(this.itemDisplays);
  }

  private destroyAll(items: Array<{ destroy: () => void }>): void {
    for (const item of items) item.destroy();
    items.length = 0;
  }
}
