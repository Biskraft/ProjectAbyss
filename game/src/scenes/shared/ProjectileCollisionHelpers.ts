import { aabbOverlap } from '@core/Physics';
import type { Projectile } from '@entities/Projectile';
import type { HitSparkManager } from '@effects/HitSpark';
import type { Player } from '@entities/Player';
import type { ScreenFlash } from '@effects/ScreenFlash';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { HUD } from '@ui/HUD';

export interface ProjectileAabb {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getEntityAabb(entity: { x: number; y: number; width: number; height: number }): ProjectileAabb {
  return {
    x: entity.x,
    y: entity.y,
    width: entity.width,
    height: entity.height,
  };
}

export function getProjectileAabb(projectile: Projectile): ProjectileAabb {
  return {
    x: projectile.x,
    y: projectile.y,
    width: projectile.width,
    height: projectile.height,
  };
}

export function spawnProjectileDeflectSpark(hitSparks: HitSparkManager, projectile: Projectile): void {
  hitSparks.spawn(
    projectile.x + projectile.width / 2,
    projectile.y + projectile.height / 2,
    true,
    projectile.vx > 0 ? -1 : 1,
  );
}

interface ProjectileHitFeedbackGame {
  hitstopFrames: number;
  camera: {
    shakeDirectional: (amount: number, dir: number, verticalBias: number) => void;
  };
}

interface ApplyProjectilePlayerHitFeedbackInput {
  projectile: Projectile;
  player: Player;
  game: ProjectileHitFeedbackGame;
  hud: HUD;
  screenFlash: ScreenFlash;
  damageNumbers: DamageNumberManager;
  hitSparks: HitSparkManager;
  flashHud?: boolean;
  setLastDamageSource?: boolean;
  floorDamage?: boolean;
}

export function applyProjectilePlayerHitFeedback(input: ApplyProjectilePlayerHitFeedbackInput): void {
  const {
    projectile,
    player,
    game,
    hud,
    screenFlash,
    damageNumbers,
    hitSparks,
    flashHud = true,
    setLastDamageSource = true,
    floorDamage = true,
  } = input;
  const dir = projectile.vx > 0 ? 1 : -1;
  const rawDamage = projectile.atk - player.def * 0.5;
  const dmg = Math.max(1, floorDamage ? Math.floor(rawDamage) : rawDamage);

  player.onHit(dir * 80, -40, 150);
  if (setLastDamageSource) player.lastDamageSource = 'projectile';
  player.hp -= dmg;
  if (flashHud) hud.flashDamage();
  player.invincible = true;
  player.invincibleTimer = 1000;
  player.startVibrate(3, 4, true);
  player.triggerFlash();
  game.hitstopFrames = 2;
  game.camera.shakeDirectional(2, dir, -0.2);
  screenFlash.flashDamage(false);

  const hitX = player.x + player.width / 2;
  const hitY = player.y + player.height * 0.4;
  hitSparks.spawn(hitX, hitY, false, -dir);
  damageNumbers.spawn(hitX, hitY - 8, dmg, false);

  if (player.hp <= 0) {
    player.hp = 0;
    player.onDeath();
    game.hitstopFrames = 8;
    screenFlash.flashDamage(true);
  }
}

export function tryHitPlayerWithProjectile(input: ApplyProjectilePlayerHitFeedbackInput): boolean {
  const { projectile, player } = input;
  if (player.invincible || player.hp <= 0) return false;
  if (!aabbOverlap(getProjectileAabb(projectile), getEntityAabb(player))) return false;

  applyProjectilePlayerHitFeedback(input);
  projectile.alive = false;
  return true;
}
