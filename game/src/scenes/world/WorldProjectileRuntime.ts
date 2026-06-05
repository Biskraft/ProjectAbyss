import type { Container } from 'pixi.js';
import { aabbOverlap } from '@core/Physics';
import type { Enemy } from '@entities/Enemy';
import type { Player } from '@entities/Player';
import type { Projectile } from '@entities/Projectile';
import type { ScreenFlash } from '@effects/ScreenFlash';
import type { HitSparkManager } from '@effects/HitSpark';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { HUD } from '@ui/HUD';
import {
  addProjectileToLayer,
  clearProjectiles,
  collectPendingGhostProjectiles,
  updateProjectileCollection,
} from '@scenes/shared/ProjectileCollectionHelpers';
import {
  getProjectileAabb,
  spawnProjectileDeflectSpark,
  tryHitPlayerWithProjectile,
} from '@scenes/shared/ProjectileCollisionHelpers';
import type { Game } from '../../Game';

interface Aabb {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WorldProjectileRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getEntityLayer: () => Container;
  getEnemies: () => readonly Enemy<string>[];
  getActiveAttackHitbox: () => Aabb | null;
  getHud: () => HUD;
  getDamageNumbers: () => DamageNumberManager;
  getHitSparks: () => HitSparkManager;
  getScreenFlash: () => ScreenFlash;
}

export class WorldProjectileRuntime {
  private readonly projectiles: Projectile[] = [];

  constructor(private readonly deps: WorldProjectileRuntimeDeps) {}

  add(projectile: Projectile): void {
    addProjectileToLayer(this.projectiles, projectile, this.deps.getEntityLayer(), { onlyAttachIfUnparented: true });
  }

  clear(): void {
    clearProjectiles(this.projectiles);
  }

  update(dtMs: number): void {
    collectPendingGhostProjectiles(
      this.deps.getEnemies(),
      this.projectiles,
      this.deps.getEntityLayer(),
      { onlyAttachIfUnparented: true },
    );

    const player = this.deps.getPlayer();
    const attackHitbox = this.deps.getActiveAttackHitbox();
    updateProjectileCollection({
      projectiles: this.projectiles,
      dtMs,
      tryDeflectProjectile: projectile => {
        if (!attackHitbox) return false;
        const projectileBox = getProjectileAabb(projectile);
        if (!aabbOverlap(attackHitbox, projectileBox)) return false;
        spawnProjectileDeflectSpark(this.deps.getHitSparks(), projectile);
        projectile.alive = false;
        return true;
      },
      tryHitPlayer: projectile => {
        return this.hitPlayer(projectile);
      },
    });
  }

  private hitPlayer(projectile: Projectile): boolean {
    return tryHitPlayerWithProjectile({
      projectile,
      player: this.deps.getPlayer(),
      game: this.deps.game,
      hud: this.deps.getHud(),
      screenFlash: this.deps.getScreenFlash(),
      damageNumbers: this.deps.getDamageNumbers(),
      hitSparks: this.deps.getHitSparks(),
    });
  }
}
