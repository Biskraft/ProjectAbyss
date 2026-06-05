import type { Container, Texture } from 'pixi.js';
import type { GrassClumpFireSystem } from '@effects/GrassClumpFire';
import type { RimLightFilter } from '@effects/RimLightFilter';
import { GiantBuilder } from '@entities/GiantBuilder';
import type { LdtkEntity, LdtkLevel } from '@level/LdtkLoader';
import type { TileMutator } from '@systems/TileMutator';
import type { WorldAnvilSpawnRuntime } from './WorldAnvilSpawnRuntime';
import type { WorldBuilderAttachmentRuntime } from './WorldBuilderAttachmentRuntime';
import type { WorldBuilderDoorSwitchRuntime } from './WorldBuilderDoorSwitchRuntime';
import type { WorldBuilderEntranceRuntime } from './WorldBuilderEntranceRuntime';
import type { WorldBuilderGrassRuntime } from './WorldBuilderGrassRuntime';
import type { WorldBuilderItemRuntime } from './WorldBuilderItemRuntime';
import type { WorldBuilderLayerRuntime } from './WorldBuilderLayerRuntime';
import type { WorldBuilderPersistenceRuntime } from './WorldBuilderPersistenceRuntime';
import type { WorldBuilderPlayerStateRuntime } from './WorldBuilderPlayerStateRuntime';
import type { WorldBuilderSpawnerRuntime } from './WorldBuilderSpawnerRuntime';
import type { WorldBuilderSpriteRuntime } from './WorldBuilderSpriteRuntime';
import type { WorldBuilderStaticEntityRuntime } from './WorldBuilderStaticEntityRuntime';
import type { WorldBuilderStampRuntime } from './WorldBuilderStampRuntime';
import type { WorldBuilderStepFeedbackRuntime } from './WorldBuilderStepFeedbackRuntime';
import type { WorldBuilderInteriorVisibilityRuntime } from './WorldBuilderInteriorVisibilityRuntime';
import type { WorldBuilderWeatherRuntime } from './WorldBuilderWeatherRuntime';
import type { WorldBuilderVisualFilterRuntime } from './WorldBuilderVisualFilterRuntime';
import type { WorldExitGlowRuntime } from './WorldExitGlowRuntime';
import type { WorldWeatherRuntime } from './WorldWeatherRuntime';
import { compactContainers } from '@scenes/shared/ContainerTargetHelpers';
import { dispatchBuilderEntities } from './WorldBuilderEntitySpawnHelpers';

interface WorldBuilderFlowRuntimeDeps {
  getBuilderLevel: (id: string) => LdtkLevel | undefined;
  getActiveBuilder: () => GiantBuilder | null;
  setActiveBuilder: (builder: GiantBuilder | null) => void;
  getCollisionGrid: () => number[][];
  getRendererContainer: () => Container;
  getShadowLayer: () => Container;
  getSceneContainer: () => Container;
  getRendererAtlases: () => Record<string, Texture>;
  getTileMutator: () => TileMutator;
  getGrassFireSystem: () => GrassClumpFireSystem;
  getBuilderHasPrimaryDecor: () => boolean;
  getTerrainRimFilter: () => RimLightFilter | null;
  builderPersistenceRuntime: WorldBuilderPersistenceRuntime;
  builderSpawnerRuntime: WorldBuilderSpawnerRuntime;
  builderLayerRuntime: WorldBuilderLayerRuntime;
  builderInteriorVisibilityRuntime: WorldBuilderInteriorVisibilityRuntime;
  builderVisualFilterRuntime: WorldBuilderVisualFilterRuntime;
  builderStepFeedbackRuntime: WorldBuilderStepFeedbackRuntime;
  builderWeatherRuntime: WorldBuilderWeatherRuntime;
  worldWeatherRuntime: WorldWeatherRuntime;
  builderGrassRuntime: WorldBuilderGrassRuntime;
  builderItemRuntime: WorldBuilderItemRuntime;
  builderStaticEntityRuntime: WorldBuilderStaticEntityRuntime;
  builderDoorSwitchRuntime: WorldBuilderDoorSwitchRuntime;
  builderEntranceRuntime: WorldBuilderEntranceRuntime;
  anvilSpawnRuntime: WorldAnvilSpawnRuntime;
  builderSpriteRuntime: WorldBuilderSpriteRuntime;
  builderStampRuntime: WorldBuilderStampRuntime;
  builderPlayerStateRuntime: WorldBuilderPlayerStateRuntime;
  exitGlowRuntime: WorldExitGlowRuntime;
  builderAttachmentRuntime: WorldBuilderAttachmentRuntime;
}

export class WorldBuilderFlowRuntime {
  constructor(private readonly deps: WorldBuilderFlowRuntimeDeps) {}

  spawnBuilderFromSpawner(hostLevel: LdtkLevel, spawner: LdtkEntity): void {
    const builderLevelId = this.deps.builderSpawnerRuntime.readLevelId(spawner);
    const builderLevel = this.deps.getBuilderLevel(builderLevelId);
    if (!builderLevel) return;

    const config = this.deps.builderSpawnerRuntime.resolveConfig(spawner, hostLevel, builderLevel);
    const spawnState = this.deps.builderPersistenceRuntime.resolveSpawnState(
      config.builderLevelId,
      config.runOnceKey,
      config.replayAtEnd,
      config.startY,
      config.endY,
    );
    const { savedState, spawnY } = spawnState;

    const builder = new GiantBuilder(
      builderLevel,
      this.deps.getRendererAtlases(),
      'world_shaft_builder_bg',
      'world_shaft_builder_wall',
      { hostLevel, builderX: config.builderX, builderY: spawnY },
    );

    this.deps.builderVisualFilterRuntime.apply(builder, this.deps.getTerrainRimFilter());
    builder.placeInLevel(config.builderX, spawnY);
    this.deps.builderLayerRuntime.attachBody(
      this.deps.getRendererContainer(),
      this.deps.getShadowLayer(),
      builder,
      this.deps.getBuilderHasPrimaryDecor(),
    );
    this.deps.builderLayerRuntime.attach(this.deps.getSceneContainer(), builder);
    this.deps.builderInteriorVisibilityRuntime.reset(builder);

    const shouldBuildRoute = this.deps.builderSpawnerRuntime.shouldBuildRoute(config, spawnState);
    if (shouldBuildRoute) {
      builder.setRoute(this.deps.builderSpawnerRuntime.createRoute(config), config.speed, config.loop);
      if (savedState) {
        builder.restoreSnapshot(savedState);
      } else if (config.skipInitialWait) {
        builder.skipInitialWait();
      }
      this.deps.builderPersistenceRuntime.markRunOnce(config.runOnceKey);
    } else if (savedState) {
      builder.restoreSnapshot(savedState);
    }

    this.deps.setActiveBuilder(builder);
    this.deps.builderPersistenceRuntime.setActive(
      config.builderLevelId,
      config.cameraShake ? 'cinematic' : 'patrol',
    );
    this.deps.builderStepFeedbackRuntime.reset(config.cameraShake);

    dispatchBuilderEntities(builderLevel.entities, [
      (ent) => this.deps.builderItemRuntime.spawnIfItem(config.builderLevelId, builder, ent),
      (ent) => this.deps.builderStaticEntityRuntime.spawnIfStaticEntity(config.builderLevelId, builder, ent),
      (ent) => this.deps.builderDoorSwitchRuntime.spawnIfDoorSwitch(builder, ent),
      (ent) => this.deps.builderEntranceRuntime.spawnIfEntrance(builder, ent),
      (ent) => this.deps.anvilSpawnRuntime.spawnBuilderMounted(builder, ent, this.deps.builderAttachmentRuntime),
      (ent) => this.deps.builderSpriteRuntime.spawnIfSprite(builder, ent),
    ]);
    this.deps.builderGrassRuntime.register(builder, this.deps.getGrassFireSystem(), this.deps.getTileMutator());
  }

  clearBuilder(): void {
    const builder = this.deps.getActiveBuilder();

    this.deps.builderPersistenceRuntime.saveActive(builder);
    this.deps.exitGlowRuntime.clearBuilderEntranceGlows();
    this.deps.builderStampRuntime.unstamp(this.deps.getCollisionGrid());
    this.deps.worldWeatherRuntime.clearDynamicColliders();
    this.deps.builderWeatherRuntime.clear();
    this.deps.builderPlayerStateRuntime.reset();
    this.deps.builderPersistenceRuntime.clearActive();
    this.deps.builderStepFeedbackRuntime.reset();
    this.deps.builderInteriorVisibilityRuntime.reset();
    this.deps.builderAttachmentRuntime.clear();

    if (!builder) return;

    this.deps.builderLayerRuntime.destroy(builder);
    builder.destroy();
    this.deps.setActiveBuilder(null);
  }

  syncBuilderAttachments(): void {
    const builder = this.deps.getActiveBuilder();
    if (!builder) return;
    this.deps.builderAttachmentRuntime.sync(builder);
  }

  setBuilderEntranceGlowAlpha(alpha: number): void {
    this.deps.exitGlowRuntime.setBuilderEntranceGlowAlpha(alpha);
  }

  getBuilderAtmosphereTargets(): Container[] {
    const builder = this.deps.getActiveBuilder();
    return compactContainers(this.deps.builderLayerRuntime.getAtmosphereTargets(builder));
  }
}

