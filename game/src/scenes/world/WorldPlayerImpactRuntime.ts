import { aabbOverlap } from '@core/Physics';
import type { Enemy } from '@entities/Enemy';
import type { Player } from '@entities/Player';
import type { HitSparkManager } from '@effects/HitSpark';
import type { ScreenFlash } from '@effects/ScreenFlash';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { Game } from '../../Game';

interface WorldPlayerImpactRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getEnemies: () => Enemy<string>[];
  getDamageNumbers: () => DamageNumberManager;
  getHitSparks: () => HitSparkManager;
  getScreenFlash: () => ScreenFlash;
  shatterGrowingWallsOnSurge: (playerBox: { x: number; y: number; width: number; height: number }) => void;
  shatterCrackedFloorsOnSurge: (playerBox: { x: number; y: number; width: number; height: number }) => void;
  shatterCrackedFloorsOnLanding: (px: number, py: number, radius: number) => void;
  shatterGrowingWallsOnLanding: (px: number, py: number, radius: number) => void;
}

export class WorldPlayerImpactRuntime {
  constructor(private readonly deps: WorldPlayerImpactRuntimeDeps) {}

  update(): void {
    const player = this.deps.getPlayer();
    if (player.diveLanded) {
      this.handleDiveLanding(player);
    }
    if (player.surgeActive) {
      this.handleSurgeContact(player);
    }
  }

  private handleSurgeContact(player: Player): void {
    const playerBox = {
      x: player.x,
      y: player.y,
      width: player.width,
      height: player.height,
    };
    this.deps.shatterGrowingWallsOnSurge(playerBox);
    this.deps.shatterCrackedFloorsOnSurge(playerBox);
  }

  private handleDiveLanding(player: Player): void {
    const distance = player.diveFallDistance;
    const px = player.x + player.width / 2;
    const py = player.y + player.height;
    const { damageMultiplier, radius } = this.getDiveImpactTier(distance);

    this.deps.game.camera.shake(Math.min(8, 3 + distance / 32));
    this.deps.game.hitstopFrames = distance > 128 ? 8 : distance > 64 ? 6 : 4;
    this.deps.getScreenFlash().flashHit(distance > 64);

    for (let i = 0; i < 4; i++) {
      this.deps.getHitSparks().spawn(px + (Math.random() - 0.5) * radius, py - 4, distance > 64, 0);
    }

    const impactBox = { x: px - radius, y: py - 8, width: radius * 2, height: 16 };
    const damage = Math.floor(player.atk * damageMultiplier);
    for (const enemy of this.deps.getEnemies()) {
      if (!enemy.alive) continue;
      const enemyBox = { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height };
      if (!aabbOverlap(impactBox, enemyBox)) continue;

      enemy.hp -= damage;
      enemy.onHit(0, -80, 200);
      if (enemy.hp <= 0) {
        enemy.hp = 0;
        enemy.onDeath();
      }
      this.deps.getDamageNumbers().spawn(enemy.x + enemy.width / 2, enemy.y - 8, damage, true);
      this.deps.getHitSparks().spawn(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, true, 0);
    }

    this.deps.shatterCrackedFloorsOnLanding(px, py, radius);
    this.deps.shatterGrowingWallsOnLanding(px, py, radius);
  }

  private getDiveImpactTier(distance: number): { damageMultiplier: number; radius: number } {
    if (distance > 128) return { damageMultiplier: 2.5, radius: 32 };
    if (distance > 64) return { damageMultiplier: 1.5, radius: 24 };
    return { damageMultiplier: 1.0, radius: 16 };
  }
}
