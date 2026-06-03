import type { Container } from 'pixi.js';
import { aabbOverlap } from '@core/Physics';
import { Ghost } from '@entities/Ghost';
import type { Enemy } from '@entities/Enemy';
import type { Player } from '@entities/Player';
import type { Projectile } from '@entities/Projectile';
import type { ScreenFlash } from '@effects/ScreenFlash';
import type { HitSparkManager } from '@effects/HitSpark';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { HUD } from '@ui/HUD';
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
    this.projectiles.push(projectile);
    if (!projectile.container.parent) this.deps.getEntityLayer().addChild(projectile.container);
  }

  clear(): void {
    for (const projectile of this.projectiles) projectile.destroy();
    this.projectiles.length = 0;
  }

  update(dtMs: number): void {
    this.collectPendingGhostProjectiles();

    const player = this.deps.getPlayer();
    const attackHitbox = this.deps.getActiveAttackHitbox();
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.update(dtMs);

      if (!projectile.alive) {
        this.removeAt(i);
        continue;
      }

      const projectileBox = {
        x: projectile.x,
        y: projectile.y,
        width: projectile.width,
        height: projectile.height,
      };

      if (attackHitbox && aabbOverlap(attackHitbox, projectileBox)) {
        this.deflect(projectile);
        projectile.alive = false;
        this.removeAt(i);
        continue;
      }

      if (player.invincible || player.hp <= 0) continue;
      const playerBox = { x: player.x, y: player.y, width: player.width, height: player.height };
      if (!aabbOverlap(projectileBox, playerBox)) continue;

      this.hitPlayer(projectile);
      projectile.alive = false;
      this.removeAt(i);
    }
  }

  private deflect(projectile: Projectile): void {
    this.deps.getHitSparks().spawn(
      projectile.x + projectile.width / 2,
      projectile.y + projectile.height / 2,
      true,
      projectile.vx > 0 ? -1 : 1,
    );
  }

  private hitPlayer(projectile: Projectile): void {
    const player = this.deps.getPlayer();
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
    const hitX = player.x + player.width / 2;
    const hitY = player.y + player.height * 0.4;
    this.deps.getDamageNumbers().spawn(hitX, hitY - 8, dmg, false);
    this.deps.getHitSparks().spawn(hitX, hitY, false, -dir);
    this.deps.getDamageNumbers().spawn(hitX, hitY - 8, dmg, false);
    if (player.hp <= 0) {
      player.hp = 0;
      player.onDeath();
      this.deps.game.hitstopFrames = 8;
      this.deps.getScreenFlash().flashDamage(true);
    }
  }

  private collectPendingGhostProjectiles(): void {
    for (const enemy of this.deps.getEnemies()) {
      if (!(enemy instanceof Ghost) || !enemy.alive) continue;
      for (const projectile of enemy.pendingProjectiles) this.add(projectile);
      enemy.pendingProjectiles.length = 0;
    }
  }

  private removeAt(index: number): void {
    const projectile = this.projectiles[index];
    projectile.destroy();
    this.projectiles.splice(index, 1);
  }
}
