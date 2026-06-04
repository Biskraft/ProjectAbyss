import { Container, type Filter } from 'pixi.js';
import type { Player } from '@entities/Player';
import type { ItemWorldGhostOverlay } from '@effects/ItemWorldGhostOverlay';
import { RimLightFilter } from '@effects/RimLightFilter';
import type { ItemDeploymentStreamWorldOptions, ItemDeploymentTunnelOpenOptions } from '@effects/ItemDeploymentTypes';
import type { RuntimeCollisionScope } from '@level/RuntimeCollisionScope';
import type { LdtkLevel } from '@level/LdtkLoader';
import type { ItemInstance } from '@items/ItemInstance';
import { buildItemWorldGhostStreamOverlay } from './ItemWorldGhostStreamOverlay';
import { ItemWorldEntryStreamRuntime, type ItemWorldGrowthProjection } from './ItemWorldEntryStreamRuntime';
import type { ItemWorldGhostCollisionRuntime } from './ItemWorldGhostCollisionRuntime';
import { ItemWorldGhostRevealRuntime } from './ItemWorldGhostRevealRuntime';

type GhostBirthOptions = NonNullable<ItemDeploymentTunnelOpenOptions['ghostBirth']>;

interface GhostTunnelParams {
  x: number;
  y: number;
  w: number;
  h: number;
  ghostBirth?: GhostBirthOptions | null;
  streamReady?: boolean;
  prewarm?: boolean;
}

interface ItemWorldGhostStreamRuntimeDeps {
  sceneContainer: Container;
  getEntityLayer: () => Container;
  streamRuntime: ItemWorldEntryStreamRuntime;
  collisionRuntime: ItemWorldGhostCollisionRuntime;
  getDeploymentScope: () => RuntimeCollisionScope | null;
  getItem: () => ItemInstance | null;
  getLevel36: () => LdtkLevel | null | undefined;
  getPlayer: () => Player;
  getLaserOrigin: () => { x: number; y: number } | null | undefined;
  isDungeonAtmosphereActive: () => boolean;
  getDungeonAtmosphereFilter: () => Filter | null | undefined;
  addDungeonAtmosphereTarget: (target: Container) => void;
  removeDungeonAtmosphereTarget: (target: Container) => void;
  tileSize: number;
}

export class ItemWorldGhostStreamRuntime {
  private ghostOverlay: ItemWorldGhostOverlay | null = null;
  private ghostPendingTimer = -1;
  private ghostPendingParams: GhostTunnelParams | null = null;
  private streamEntranceAabb: { x: number; y: number; width: number; height: number } | null = null;
  private streamStartPoint: { x: number; y: number } | null = null;
  private readonly revealRuntime = new ItemWorldGhostRevealRuntime();

  constructor(private readonly deps: ItemWorldGhostStreamRuntimeDeps) {}

  update(dt: number, onRevealActivated?: () => void): void {
    if (this.ghostOverlay) {
      this.revealRuntime.update(dt, this.ghostOverlay, this.deps.getPlayer(), onRevealActivated);
    }

    if (this.ghostPendingTimer >= 0 && !this.ghostOverlay && this.ghostPendingParams) {
      this.ghostPendingTimer += dt;
      if (this.ghostPendingTimer >= 400) {
        this.buildGhostOverlay(this.ghostPendingParams);
        this.ghostPendingTimer = -1;
        this.ghostPendingParams = null;
      }
    }
  }

  getEntranceAABB(): { x: number; y: number; width: number; height: number } | null {
    return this.streamEntranceAabb;
  }

  getPlatformStart(): { x: number; y: number } | null {
    return this.streamStartPoint;
  }

  clearPlatformStart(): void {
    this.streamStartPoint = null;
  }

  scheduleForTunnel(
    x: number,
    y: number,
    w: number,
    h: number,
    ghostBirth: GhostBirthOptions | null = null,
  ): void {
    if (!this.deps.getItem() || this.ghostOverlay || this.ghostPendingTimer >= 0) return;
    if (ghostBirth) {
      this.buildGhostOverlay({ x, y, w, h, ghostBirth });
      return;
    }
    this.ghostPendingParams = { x, y, w, h, ghostBirth };
    this.ghostPendingTimer = 0;
  }

  prepareLevel36(options: ItemDeploymentStreamWorldOptions): { x: number; y: number } | null {
    const level = this.deps.getLevel36();
    if (!level) {
      this.streamStartPoint = null;
      return null;
    }

    const pos = this.deps.streamRuntime.resolveGhostPositionForSize(
      level.gridW * this.deps.tileSize,
      level.gridH * this.deps.tileSize,
      {
        originX: options.originX,
        originY: options.originY,
      },
    );
    const start = this.deps.streamRuntime.resolvePlayerStart(
      pos.x,
      pos.y,
      level,
      level.collisionGrid,
      this.deps.getPlayer().height,
    );
    this.streamStartPoint = start;

    if (!this.ghostOverlay && this.deps.getItem()) {
      this.buildGhostOverlay({
        x: options.tunnelX,
        y: options.tunnelY,
        w: options.tunnelW,
        h: options.tunnelH,
        ghostBirth: {
          originX: options.originX,
          originY: options.originY,
          pivotX: options.originX,
          pivotY: options.originY,
          durationMs: 1,
          entranceAtEnd: true,
        },
        prewarm: true,
      });
      this.streamStartPoint = start;
    }

    return start;
  }

  getPlatformVisualStart(projection: ItemWorldGrowthProjection | null): { x: number; y: number } | null {
    const start = this.streamStartPoint;
    if (!start || !projection) return start;

    const player = this.deps.getPlayer();
    return this.deps.streamRuntime.projectPlayerStartDuringGrowth(
      start,
      projection,
      { width: player.width, height: player.height },
    );
  }

  loadLevel36(options: ItemDeploymentStreamWorldOptions): { x: number; y: number } | null {
    return this.buildGhostOverlay({
      x: options.tunnelX,
      y: options.tunnelY,
      w: options.tunnelW,
      h: options.tunnelH,
      ghostBirth: {
        originX: options.originX,
        originY: options.originY,
        pivotX: options.originX,
        pivotY: options.originY,
        durationMs: 1,
        entranceAtEnd: true,
      },
      streamReady: true,
    });
  }

  destroyOverlay(): void {
    if (this.ghostOverlay) {
      const ghostContainer = this.ghostOverlay.container;
      this.deps.removeDungeonAtmosphereTarget(ghostContainer);
      this.ghostOverlay.destroy();
      this.ghostOverlay = null;
    }
    this.ghostPendingTimer = -1;
    this.ghostPendingParams = null;
    this.revealRuntime.reset();
    this.streamStartPoint = null;
  }

  restoreCollision(): void {
    const hasDeploymentScope = !!this.deps.getDeploymentScope();
    this.streamEntranceAabb = null;
    this.streamStartPoint = null;
    this.deps.collisionRuntime.restore(!hasDeploymentScope, !hasDeploymentScope);
  }

  clearStreamState(restoreGrid: boolean): void {
    this.streamEntranceAabb = null;
    this.streamStartPoint = null;
    this.deps.collisionRuntime.clearStreamState(restoreGrid);
  }

  private buildGhostOverlay({ x, y, w, h, ghostBirth, streamReady = false, prewarm = false }: GhostTunnelParams): { x: number; y: number } | null {
    if (this.ghostOverlay) {
      if (streamReady) return this.activatePrebuiltGhostOverlayForStream();
      return this.streamStartPoint;
    }

    const item = this.deps.getItem();
    if (!item) return this.streamStartPoint;

    const level = this.deps.getLevel36();
    const laserOrigin = this.deps.getLaserOrigin();
    const { ghost, entranceAabb } = buildItemWorldGhostStreamOverlay({
      x,
      y,
      w,
      h,
      item,
      level,
      streamRuntime: this.deps.streamRuntime,
      ghostBirth,
      streamReady,
      shardSource: {
        x: ghostBirth?.originX ?? (laserOrigin?.x ?? x) + 48,
        y: ghostBirth?.originY ?? laserOrigin?.y ?? y + h * 0.5,
      },
    });

    this.deps.collisionRuntime.extendWorldForGhostStream(ghost, this.deps.getDeploymentScope());
    const entityLayer = this.deps.getEntityLayer();
    const entityLayerIndex = this.deps.sceneContainer.getChildIndex(entityLayer);
    this.deps.sceneContainer.addChildAt(ghost.container, entityLayerIndex);
    this.deps.sceneContainer.addChildAt(ghost.itemContainer, entityLayerIndex + 1);

    const rimFilter = new RimLightFilter({
      color: ghost.getTilePalette().rim,
      alpha: 0.9,
      thickness: 2,
      topGuardPixels: 2,
    });
    const ghostFilters: Filter[] = [rimFilter];
    const atmosphereFilter = this.deps.getDungeonAtmosphereFilter();
    if (this.deps.isDungeonAtmosphereActive() && atmosphereFilter) {
      ghostFilters.push(atmosphereFilter);
      this.deps.addDungeonAtmosphereTarget(ghost.container);
    }
    ghost.container.filters = ghostFilters;
    ghost.applyItemPalette(item, palette => rimFilter.setColor(palette.rim));
    ghost.fadeTo(prewarm ? 0 : 1, 0);

    this.ghostOverlay = ghost;
    this.streamEntranceAabb = entranceAabb;

    if (streamReady || !ghostBirth) {
      this.streamStartPoint = this.activatePrebuiltGhostOverlayForStream();
    } else {
      this.streamStartPoint = prewarm
        ? this.resolveGhostPlayerStart(ghost, level)
        : null;
    }

    if (ghostBirth && !streamReady && !prewarm) {
      ghost.beginScaleBirthFromPivot(
        ghostBirth.pivotX ?? ghostBirth.originX,
        ghostBirth.pivotY ?? ghostBirth.originY,
        ghostBirth.durationMs,
        ghostBirth.revealAll ?? true,
      );
    }
    this.revealRuntime.reset();
    return this.streamStartPoint;
  }

  private activatePrebuiltGhostOverlayForStream(): { x: number; y: number } | null {
    const ghost = this.ghostOverlay;
    if (!ghost) return this.streamStartPoint;

    this.deps.collisionRuntime.prepareGhostWorldCollision(ghost, this.deps.getDeploymentScope());
    const start = this.resolveGhostPlayerStart(ghost, this.deps.getLevel36());
    this.streamStartPoint = start;
    if (start) {
      const player = this.deps.getPlayer();
      const footX = start.x + player.width / 2 - ghost.container.x;
      const footY = start.y + player.height - ghost.container.y;
      ghost.revealTilesNear(footX, footY, 6 * this.deps.tileSize, true);
    }
    ghost.fadeTo(1, 0);
    return start;
  }

  private resolveGhostPlayerStart(
    ghost: ItemWorldGhostOverlay,
    level: LdtkLevel | null | undefined,
  ): { x: number; y: number } | null {
    return this.deps.streamRuntime.resolvePlayerStart(
      ghost.container.x,
      ghost.container.y,
      level,
      ghost.getCollisionGrid(),
      this.deps.getPlayer().height,
    );
  }
}
