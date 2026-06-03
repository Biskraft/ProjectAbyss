import type { Container } from 'pixi.js';
import type { CameraZone } from '@core/CameraZoneRuntime';
import { Building } from '@entities/Building';
import { CollapsingPlatform } from '@entities/CollapsingPlatform';
import { CrackedFloor } from '@entities/CrackedFloor';
import { GrowingWall } from '@entities/GrowingWall';
import { ItemDisplay } from '@entities/ItemDisplay';
import { LockedDoor, type UnlockCondition } from '@entities/LockedDoor';
import { Spike } from '@entities/Spike';
import { Switch } from '@entities/Switch';
import type { ItemInstance } from '@items/ItemInstance';
import type { LdtkEntity, LdtkLevel } from '@level/LdtkLoader';
import type { PaletteSwapFilter } from '@effects/PaletteSwapFilter';

interface ItemWorldStaticEntitySpawnerDeps {
  getFullGrid: () => number[][];
  getEntityLayer: () => Container;
  getBuildingLayer: () => Container;
  getWallPaletteFilter: () => PaletteSwapFilter | null;
  getItem: () => ItemInstance;
  getBuildings: () => Building[];
  getSpikes: () => Spike[];
  getCrackedFloors: () => CrackedFloor[];
  getCollapsingPlatforms: () => CollapsingPlatform[];
  getGrowingWalls: () => GrowingWall[];
  getSwitches: () => Switch[];
  getLockedDoors: () => LockedDoor[];
  getItemDisplays: () => ItemDisplay[];
  spawnMemoryFromEntity: (entity: LdtkEntity, offX: number, offY: number) => void;
  addCameraZone: (zone: CameraZone) => void;
  spawnAnvil: (x: number, y: number) => void;
}

export class ItemWorldStaticEntitySpawner {
  constructor(private readonly deps: ItemWorldStaticEntitySpawnerDeps) {}

  spawnForRoom(level: LdtkLevel, offX: number, offY: number): void {
    const roomPrefix = `r${offX}_${offY}:`;

    for (const entity of level.entities) {
      const ax = entity.px[0] + offX;
      const ay = entity.px[1] + offY;

      switch (entity.type) {
        case 'Building':
          this.spawnBuilding(entity, ax, ay);
          break;
        case 'Spike':
          this.spawnSpike(entity, ax, ay);
          break;
        case 'CrackedFloor':
          this.spawnCrackedFloor(entity, ax, ay);
          break;
        case 'CollapsingPlatform':
          this.spawnCollapsingPlatform(entity, ax, ay);
          break;
        case 'GrowingWall':
          this.spawnGrowingWall(entity, ax, ay);
          break;
        case 'Switch':
          this.spawnSwitch(entity, ax, ay, roomPrefix);
          break;
        case 'LockedDoor':
          this.spawnLockedDoor(entity, ax, ay, roomPrefix);
          break;
        case 'Memory':
          this.deps.spawnMemoryFromEntity(entity, offX, offY);
          break;
        case 'Camera':
          this.spawnCameraZone(entity, ax, ay);
          break;
        case 'Anvil':
          this.deps.spawnAnvil(ax, ay);
          break;
        case 'ItemDisplay':
          this.spawnItemDisplay(entity, ax, ay);
          break;
        default:
          break;
      }
    }
  }

  private spawnBuilding(entity: LdtkEntity, ax: number, ay: number): void {
    if (!entity.tile || !entity.tile.tilesetPath) {
      console.warn(`[Building] entity at (${ax}, ${ay}) has no tile; skipped.`);
      return;
    }

    const building = new Building(
      ax,
      ay,
      entity.tile.tilesetPath,
      entity.tile.src[0],
      entity.tile.src[1],
      entity.tile.w,
      entity.tile.h,
    );
    const wallPaletteFilter = this.deps.getWallPaletteFilter();
    if (wallPaletteFilter) {
      building.container.filters = [wallPaletteFilter];
    }
    this.deps.getBuildings().push(building);
    this.deps.getBuildingLayer().addChild(building.container);
  }

  private spawnSpike(entity: LdtkEntity, ax: number, ay: number): void {
    const spike = new Spike(ax, ay, entity.width, entity.height);
    this.deps.getSpikes().push(spike);
    this.deps.getEntityLayer().addChild(spike.container);
  }

  private spawnCrackedFloor(entity: LdtkEntity, ax: number, ay: number): void {
    const crackedFloor = new CrackedFloor(ax, ay, entity.width, entity.height);
    crackedFloor.injectCollision(this.deps.getFullGrid());
    this.deps.getCrackedFloors().push(crackedFloor);
    this.deps.getEntityLayer().addChild(crackedFloor.container);
  }

  private spawnCollapsingPlatform(entity: LdtkEntity, ax: number, ay: number): void {
    const respawns = (entity.fields['Respawn'] ?? entity.fields['respawn'] ?? true) as boolean;
    const respawnTime = (entity.fields['RespawnTime'] ?? entity.fields['respawnTime'] ?? 3.0) as number;
    const platform = new CollapsingPlatform(ax, ay, entity.width, entity.height, respawns, respawnTime);
    platform.injectCollision(this.deps.getFullGrid());
    this.deps.getCollapsingPlatforms().push(platform);
    this.deps.getEntityLayer().addChild(platform.container);
  }

  private spawnGrowingWall(entity: LdtkEntity, ax: number, ay: number): void {
    const wall = new GrowingWall(ax, ay, entity.width, entity.height);
    wall.injectCollision(this.deps.getFullGrid());
    this.deps.getGrowingWalls().push(wall);
    this.deps.getEntityLayer().addChild(wall.container);
  }

  private spawnSwitch(entity: LdtkEntity, ax: number, ay: number, roomPrefix: string): void {
    const ref = (entity.fields['TargetDoor'] ?? entity.fields['targetDoor']) as { entityIid: string } | null;
    if (!ref?.entityIid) return;

    const switchEntity = new Switch(ax, ay, entity.width, entity.height, roomPrefix + ref.entityIid);
    switchEntity.injectCollision(this.deps.getFullGrid());
    this.deps.getSwitches().push(switchEntity);
    this.deps.getEntityLayer().addChild(switchEntity.container);
  }

  private spawnLockedDoor(entity: LdtkEntity, ax: number, ay: number, roomPrefix: string): void {
    const rawCondition = (entity.fields['UnlockCondition'] as string) || (entity.fields['unlockCondition'] as string) || '';
    const unlockCondition = (rawCondition.toLowerCase() as UnlockCondition) || 'event';
    const unlockEvent = (entity.fields['unlockEvent'] as string) || '';
    const statType = ((entity.fields['StatType'] as string) || (entity.fields['statType'] as string) || 'atk').toLowerCase();
    const statThreshold = (entity.fields['StatThreshold'] as number) ?? (entity.fields['statThreshold'] as number) ?? 0;
    const scopedIid = roomPrefix + entity.iid;

    const door = new LockedDoor(
      ax,
      ay,
      entity.width,
      entity.height,
      scopedIid,
      unlockCondition,
      unlockCondition === 'event' ? unlockEvent : scopedIid,
      statType,
      statThreshold,
    );
    door.injectCollision(this.deps.getFullGrid());
    this.deps.getLockedDoors().push(door);
    this.deps.getEntityLayer().addChild(door.container);
  }

  private spawnCameraZone(entity: LdtkEntity, ax: number, ay: number): void {
    this.deps.addCameraZone({
      x: ax,
      y: ay - entity.height,
      w: entity.width,
      h: entity.height,
      zoom: (entity.fields['zoom'] as number) ?? 1.0,
      deadZoneX: (entity.fields['deadZoneX'] as number) ?? 32,
      deadZoneY: (entity.fields['deadZoneY'] as number) ?? 24,
      lookAheadDistance: (entity.fields['lookAheadDistance'] as number) ?? 0,
      followLerp: (entity.fields['followLerp'] as number) ?? 0.08,
      zoomLerp: (entity.fields['zoomLerp'] as number) ?? 0.05,
      entireLevel: (entity.fields['entireLevel'] as boolean) ?? false,
    });
  }

  private spawnItemDisplay(entity: LdtkEntity, ax: number, ay: number): void {
    const sizeRaw = (entity.fields['Size'] ?? entity.fields['size']) as number | undefined;
    const scaleFactor = (typeof sizeRaw === 'number' && sizeRaw > 0) ? sizeRaw : 4;
    const rotate = ((entity.fields['Rotate'] ?? entity.fields['rotate']) as boolean | undefined) ?? false;
    const display = new ItemDisplay(ax, ay, scaleFactor, this.deps.getItem(), rotate);
    this.deps.getItemDisplays().push(display);
    this.deps.getEntityLayer().addChild(display.container);
  }
}
