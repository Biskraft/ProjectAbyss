import type { Container } from 'pixi.js';
import { aabbOverlap } from '@core/Physics';
import { getAttackHitbox } from '@combat/CombatData';
import type { Player } from '@entities/Player';
import type { Enemy } from '@entities/Enemy';
import type { Projectile } from '@entities/Projectile';
import type { Game } from '../../Game';
import type { HUD } from '@ui/HUD';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { HitSparkManager } from '@effects/HitSpark';
import type { ScreenFlash } from '@effects/ScreenFlash';
import {
  clearProjectiles,
  collectPendingGhostProjectiles,
  updateProjectileCollection,
} from '@scenes/shared/ProjectileCollectionHelpers';
import {
  getProjectileAabb,
  spawnProjectileDeflectSpark,
  tryHitPlayerWithProjectile,
} from '@scenes/shared/ProjectileCollisionHelpers';

interface ItemWorldProjectileRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getEnemies: () => Enemy<string>[];
  getEntityLayer: () => Container;
  getHud: () => HUD;
  getDamageNumbers: () => DamageNumberManager;
  getHitSparks: () => HitSparkManager;
  getScreenFlash: () => ScreenFlash;
}

export class ItemWorldProjectileRuntime {
  private readonly projectiles: Projectile[] = [];

  constructor(private readonly deps: ItemWorldProjectileRuntimeDeps) {}

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
    this.updateProjectiles(dtMs);
  }

  private updateProjectiles(dtMs: number): void {
    updateProjectileCollection({
      projectiles: this.projectiles,
      dtMs,
      tryDeflectProjectile: projectile => this.tryDeflectProjectile(projectile),
      tryHitPlayer: projectile => this.tryHitPlayer(projectile),
    });
  }

  private tryDeflectProjectile(projectile: Projectile): boolean {
    const player = this.deps.getPlayer();
    if (!player.isAttackActive()) return false;

    const step = player.getAttackStep(player.comboIndex);
    if (!step) return false;

    const hitbox = getAttackHitbox(
      player.x,
      player.y,
      player.width,
      player.height,
      player.facingRight ?? true,
      step,
    );
    if (!aabbOverlap(hitbox, getProjectileAabb(projectile))) {
      return false;
    }

    spawnProjectileDeflectSpark(this.deps.getHitSparks(), projectile);
    projectile.alive = false;
    return true;
  }

  private tryHitPlayer(projectile: Projectile): boolean {
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
