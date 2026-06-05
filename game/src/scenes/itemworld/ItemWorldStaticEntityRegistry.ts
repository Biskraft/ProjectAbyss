import type { Building } from '@entities/Building';
import type { BreakableProp } from '@entities/BreakableProp';
import type { CollapsingPlatform } from '@entities/CollapsingPlatform';
import type { CrackedFloor } from '@entities/CrackedFloor';
import type { GrowingWall } from '@entities/GrowingWall';
import type { ItemDisplay } from '@entities/ItemDisplay';
import type { LockedDoor } from '@entities/LockedDoor';
import type { Spike } from '@entities/Spike';
import type { Switch } from '@entities/Switch';
import { destroyAndClearStaticEntities } from '@scenes/shared/StaticEntityRegistryHelpers';

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
    destroyAndClearStaticEntities(this.spikes);
    destroyAndClearStaticEntities(this.crackedFloors);
    destroyAndClearStaticEntities(this.breakableProps);
    destroyAndClearStaticEntities(this.collapsingPlatforms);
    destroyAndClearStaticEntities(this.growingWalls);
    destroyAndClearStaticEntities(this.switches);
    destroyAndClearStaticEntities(this.lockedDoors);
    destroyAndClearStaticEntities(this.buildings);
    destroyAndClearStaticEntities(this.itemDisplays);
  }
}
