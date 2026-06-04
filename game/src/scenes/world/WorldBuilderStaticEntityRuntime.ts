import type { Container } from 'pixi.js';
import type { GiantBuilder } from '@entities/GiantBuilder';
import { Breakable } from '@entities/Breakable';
import { CollapsingPlatform } from '@entities/CollapsingPlatform';
import { Spike } from '@entities/Spike';
import type { LdtkEntity } from '@level/LdtkLoader';
import type { WorldBreakableRegistry } from './WorldBreakableRegistry';
import type { WorldBuilderAttachmentRuntime } from './WorldBuilderAttachmentRuntime';
import type { WorldCollapsingPlatformRegistry } from './WorldCollapsingPlatformRegistry';
import type { WorldSpikeRegistry } from './WorldSpikeRegistry';

interface WorldBuilderStaticEntityRuntimeDeps {
  attachments: WorldBuilderAttachmentRuntime;
  getEntityLayer: () => Container;
  spikeRegistry: WorldSpikeRegistry;
  breakableRegistry: WorldBreakableRegistry;
  collapsingPlatformRegistry: WorldCollapsingPlatformRegistry;
  getUnlockedEvents: () => Set<string>;
}

export class WorldBuilderStaticEntityRuntime {
  constructor(private readonly deps: WorldBuilderStaticEntityRuntimeDeps) {}

  spawnIfStaticEntity(builderLevelId: string, builder: GiantBuilder, entity: LdtkEntity): boolean {
    switch (entity.type) {
      case 'Spike':
        this.spawnSpike(builder, entity);
        return true;
      case 'Breakable':
        this.spawnBreakable(builder, entity);
        return true;
      case 'CollapsingPlatform':
        this.spawnCollapsingPlatform(builderLevelId, builder, entity);
        return true;
      default:
        return false;
    }
  }

  private spawnSpike(builder: GiantBuilder, entity: LdtkEntity): void {
    const localX = entity.px[0];
    const localY = entity.px[1];
    const spike = new Spike(localX, localY, entity.width, entity.height);
    this.deps.spikeRegistry.add(spike, this.deps.getEntityLayer());
    this.deps.attachments.attachWorldPositioned(
      builder,
      spike,
      spike.container.x,
      spike.container.y,
      () => this.deps.spikeRegistry.includes(spike),
    );
  }

  private spawnBreakable(builder: GiantBuilder, entity: LdtkEntity): void {
    const localX = entity.px[0];
    const localY = entity.px[1];
    const rawSprite = (entity.fields['Sprite'] ?? entity.fields['sprite']) as string | undefined;
    const spriteName = rawSprite && rawSprite.length > 0 ? rawSprite : 'signboard_save_01';
    const breakable = new Breakable(localX, localY, spriteName);
    this.deps.breakableRegistry.add(breakable, this.deps.getEntityLayer());
    this.deps.attachments.attachSizedWorldPositioned(
      builder,
      breakable,
      localX,
      localY,
      () => this.deps.breakableRegistry.includes(breakable) && !breakable.destroyed,
    );
  }

  private spawnCollapsingPlatform(builderLevelId: string, builder: GiantBuilder, entity: LdtkEntity): void {
    const localX = entity.px[0];
    const localY = entity.px[1];
    const respawns = (entity.fields['Respawn'] ?? entity.fields['respawn'] ?? true) as boolean;
    const respawnTime = (entity.fields['RespawnTime'] ?? entity.fields['respawnTime'] ?? 3.0) as number;
    const key = `cplat_${builderLevelId}_${localX}_${localY}`;
    if (!respawns && this.deps.getUnlockedEvents().has(key)) return;

    const platform = new CollapsingPlatform(
      localX,
      localY,
      entity.width,
      entity.height,
      respawns,
      respawnTime,
    );
    platform.injectCollision(builder.collisionGrid);
    this.deps.collapsingPlatformRegistry.add(
      platform,
      builder.collisionGrid,
      this.deps.getEntityLayer(),
      { key, respawns },
    );
    this.deps.attachments.attachWorldPositioned(
      builder,
      platform,
      platform.container.x,
      platform.container.y,
      () => this.deps.collapsingPlatformRegistry.includes(platform),
    );
  }
}
