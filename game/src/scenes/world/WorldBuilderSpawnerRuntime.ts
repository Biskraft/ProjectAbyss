import type { GiantBuilderSnapshot, BuilderRoutePoint } from '@entities/GiantBuilder';
import type { LdtkEntity, LdtkLevel } from '@level/LdtkLoader';

const TILE_SIZE = 16;

export interface WorldBuilderSpawnerConfig {
  builderLevelId: string;
  builderX: number;
  startY: number;
  endY: number;
  speed: number;
  loop: boolean;
  autoStart: boolean;
  skipInitialWait: boolean;
  cameraShake: boolean;
  runOnceKey: string;
  replayAtEnd: boolean;
  startWaitMs: number;
  endWaitMs: number;
  insertBeforeNaturalDecor: boolean;
}

interface BuilderSpawnState {
  alreadyPlayed: boolean;
  savedState: GiantBuilderSnapshot | undefined;
  savedY: number | undefined;
}

export class WorldBuilderSpawnerRuntime {
  readLevelId(spawner: LdtkEntity): string {
    return this.readStringField(spawner, 'BuilderLevelId', 'Builder_Level_1');
  }

  resolveConfig(spawner: LdtkEntity, hostLevel: LdtkLevel, builderLevel: LdtkLevel): WorldBuilderSpawnerConfig {
    const builderLevelId = this.readLevelId(spawner);
    const anchor = this.readStringField(spawner, 'Anchor', 'Entity');
    const offsetPx = this.readNumberField(spawner, 'OffsetCellsX', 0) * TILE_SIZE;
    const startY = this.readNumberField(spawner, 'StartYCells', Math.round(spawner.px[1] / TILE_SIZE)) * TILE_SIZE;
    const endY = this.readNumberField(spawner, 'EndYCells', Math.round(spawner.px[1] / TILE_SIZE)) * TILE_SIZE;

    let builderX = spawner.px[0] + offsetPx;
    if (anchor === 'LeftWall') {
      builderX = offsetPx;
    } else if (anchor === 'RightWall') {
      builderX = hostLevel.pxWid - builderLevel.pxWid - offsetPx;
    }

    return {
      builderLevelId,
      builderX,
      startY,
      endY,
      speed: Math.max(0, this.readNumberField(spawner, 'Speed', 33)),
      loop: this.readBoolField(spawner, 'Loop', false),
      autoStart: this.readBoolField(spawner, 'AutoStart', true),
      skipInitialWait: this.readBoolField(spawner, 'SkipInitialWait', false),
      cameraShake: this.readBoolField(spawner, 'CameraShake', false),
      runOnceKey: this.readStringField(spawner, 'RunOnceKey', ''),
      replayAtEnd: this.readBoolField(spawner, 'ReplayAtEnd', false),
      startWaitMs: Math.max(0, this.readNumberField(spawner, 'StartWaitMs', 0)),
      endWaitMs: Math.max(0, this.readNumberField(spawner, 'EndWaitMs', 0)),
      insertBeforeNaturalDecor: this.readBoolField(spawner, 'InsertBeforeNaturalDecor', true),
    };
  }

  shouldBuildRoute(config: WorldBuilderSpawnerConfig, state: BuilderSpawnState): boolean {
    return config.autoStart && (!!state.savedState || (!state.alreadyPlayed && state.savedY === undefined));
  }

  createRoute(config: WorldBuilderSpawnerConfig): BuilderRoutePoint[] {
    return [
      { y: config.startY, waitMs: config.startWaitMs },
      { y: config.endY, waitMs: config.endWaitMs },
    ];
  }

  private readStringField(entity: LdtkEntity, key: string, fallback: string): string {
    const value = entity.fields[key];
    return typeof value === 'string' && value.length > 0 ? value : fallback;
  }

  private readNumberField(entity: LdtkEntity, key: string, fallback: number): number {
    const value = entity.fields[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  private readBoolField(entity: LdtkEntity, key: string, fallback: boolean): boolean {
    const value = entity.fields[key];
    return typeof value === 'boolean' ? value : fallback;
  }
}
