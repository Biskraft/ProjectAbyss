import type { Container } from 'pixi.js';
import { aabbOverlap } from '@core/Physics';
import { getAttackHitbox } from '@combat/CombatData';
import type { Player } from '@entities/Player';
import type { Enemy } from '@entities/Enemy';
import { Ghost } from '@entities/Ghost';
import type { Projectile } from '@entities/Projectile';
import type { Game } from '../../Game';
import type { HUD } from '@ui/HUD';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { HitSparkManager } from '@effects/HitSpark';
import type { ScreenFlash } from '@effects/ScreenFlash';

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
    for (const projectile of this.projectiles) projectile.destroy();
    this.projectiles.length = 0;
  }

  update(dtMs: number): void {
    this.collectGhostProjectiles();
    this.updateProjectiles(dtMs);
  }

  private collectGhostProjectiles(): void {
    const entityLayer = this.deps.getEntityLayer();
    for (const enemy of this.deps.getEnemies()) {
      if (enemy instanceof Ghost && enemy.alive) {
        for (const projectile of enemy.pendingProjectiles) {
          this.projectiles.push(projectile);
          entityLayer.addChild(projectile.container);
        }
        enemy.pendingProjectiles.length = 0;
      }
    }
  }

  private updateProjectiles(dtMs: number): void {
    const projectiles = this.projectiles;
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const projectile = projectiles[i];
      projectile.update(dtMs);
      if (!projectile.alive) {
        projectile.destroy();
        projectiles.splice(i, 1);
        continue;
      }
      if (this.tryDeflectProjectile(projectile)) {
        projectiles.splice(i, 1);
        continue;
      }
      if (this.tryHitPlayer(projectile)) {
        projectiles.splice(i, 1);
      }
    }
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
    if (!aabbOverlap(hitbox, { x: projectile.x, y: projectile.y, width: projectile.width, height: projectile.height })) {
      return false;
    }

    this.deps.getHitSparks().spawn(
      projectile.x + projectile.width / 2,
      projectile.y + projectile.height / 2,
      true,
      projectile.vx > 0 ? -1 : 1,
    );
    projectile.alive = false;
    projectile.destroy();
    return true;
  }

  private tryHitPlayer(projectile: Projectile): boolean {
    const player = this.deps.getPlayer();
    if (player.invincible || player.hp <= 0) return false;

    const overlap = aabbOverlap(
      { x: projectile.x, y: projectile.y, width: projectile.width, height: projectile.height },
      { x: player.x, y: player.y, width: player.width, height: player.height },
    );
    if (!overlap) return false;

    const dir = projectile.vx > 0 ? 1 : -1;
    const dmg = Math.max(1, Math.floor(projectile.atk - player.def * 0.5));
    player.onHit(dir * 80, -40, 150);
    player.lastDamageSource = 'projectile';
    player.hp -= dmg;
    this.deps.getHud().flashDamage();
    player.invincible = true;
    player.invincibleTimer = 1000;
    player.startVibrate(3, 4, true);
    player.triggerFlash();
    this.deps.game.hitstopFrames = 2;
    this.deps.game.camera.shakeDirectional(2, dir, -0.2);
    this.deps.getScreenFlash().flashDamage(false);
    this.deps.getHitSparks().spawn(player.x + player.width / 2, player.y + player.height * 0.4, false, -dir);
    this.deps.getDamageNumbers().spawn(player.x + player.width / 2, player.y + player.height * 0.4 - 8, dmg, false);
    if (player.hp <= 0) {
      player.hp = 0;
      player.onDeath();
      this.deps.game.hitstopFrames = 8;
      this.deps.getScreenFlash().flashDamage(true);
    }
    projectile.alive = false;
    projectile.destroy();
    return true;
  }
}
