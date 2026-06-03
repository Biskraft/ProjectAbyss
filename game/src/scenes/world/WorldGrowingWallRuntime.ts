import type { Container } from 'pixi.js';
import type { Game } from '../../Game';
import { aabbOverlap } from '@core/Physics';
import type { Player } from '@entities/Player';
import { GrowingWall } from '@entities/GrowingWall';
import type { Slime } from '@entities/Slime';
import type { HitSparkManager } from '@effects/HitSpark';
import type { ScreenFlash } from '@effects/ScreenFlash';
import type { LdtkLevel } from '@level/LdtkLoader';
import { t } from '@i18n';
import type { WorldGrowingWallRegistry } from './WorldGrowingWallRegistry';

interface WorldGrowingWallRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getCollisionGrid: () => number[][];
  getEntityLayer: () => Container;
  getRegistry: () => WorldGrowingWallRegistry;
  getUnlockedEvents: () => Set<string>;
  getHitSparks: () => HitSparkManager;
  getScreenFlash: () => ScreenFlash;
  addSpawnedSlime: (slime: Slime) => void;
  showToast: (message: string, color: number) => void;
}

type BreakStyle = 'surge' | 'landing';

export class WorldGrowingWallRuntime {
  constructor(private readonly deps: WorldGrowingWallRuntimeDeps) {}

  spawn(level: LdtkLevel): void {
    const registry = this.deps.getRegistry();
    registry.clear();

    const wallEntities = level.entities.filter(entity => entity.type === 'GrowingWall');
    for (const entity of wallEntities) {
      const key = `gwall_${level.identifier}_${entity.px[0]}_${entity.px[1]}`;
      if (this.deps.getUnlockedEvents().has(key)) continue;

      const wall = new GrowingWall(entity.px[0], entity.px[1], entity.width, entity.height);
      (wall as any)._key = key;
      wall.injectCollision(this.deps.getCollisionGrid());
      registry.add(wall, this.deps.getEntityLayer());
    }
  }

  update(dt: number): void {
    for (const wall of this.deps.getRegistry().walls) {
      wall.update(dt);
      for (const slime of wall.pendingSlimes) {
        slime.roomData = this.deps.getCollisionGrid();
        slime.target = this.deps.getPlayer();
        this.deps.addSpawnedSlime(slime);
      }
      wall.pendingSlimes.length = 0;
    }
  }

  shatterOnSurge(playerBox: { x: number; y: number; width: number; height: number }): void {
    this.shatterOverlapping(playerBox, 'surge');
  }

  shatterOnLanding(px: number, py: number, radius: number): void {
    const wallBox = { x: px - radius, y: py - 12, width: radius * 2, height: 16 };
    this.shatterOverlapping(wallBox, 'landing');
  }

  private shatterOverlapping(
    hitbox: { x: number; y: number; width: number; height: number },
    style: BreakStyle,
  ): void {
    const registry = this.deps.getRegistry();
    const walls = registry.walls;
    for (let i = walls.length - 1; i >= 0; i--) {
      const wall = walls[i];
      if (wall.destroyed) continue;
      if (!aabbOverlap(hitbox, wall.getAABB())) continue;
      if (!wall.shatter(this.deps.getCollisionGrid())) continue;

      const key = (wall as any)._key as string;
      if (key) this.deps.getUnlockedEvents().add(key);
      this.playBreakFeedback(wall, style);
      registry.removeAt(i);
    }
  }

  private playBreakFeedback(wall: GrowingWall, style: BreakStyle): void {
    this.deps.game.hitstopFrames += 4;
    this.deps.getScreenFlash().flash(0xffffff, 0.4, 150);
    this.deps.game.camera.shake(style === 'surge' ? 8 : 10);
    this.deps.showToast(t('toast.wall_shattered'), 0xffaa44);

    for (let i = 0; i < 6; i++) {
      this.deps.getHitSparks().spawn(
        wall.x + Math.random() * wall.width,
        wall.y + Math.random() * wall.height,
        true,
        0,
      );
    }
  }
}
