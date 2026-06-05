import { SFX } from '@audio/Sfx';
import type { Enemy } from '@entities/Enemy';
import type { Player } from '@entities/Player';
import type { DashAfterimageManager } from '@effects/DashAfterimage';
import type { DashBoostPuffManager } from '@effects/DashBoostPuff';
import type { DiveLandImpactManager } from '@effects/DiveLandImpact';
import type { DoubleJumpRingManager } from '@effects/DoubleJumpRing';
import type { FlaskHealBurstManager } from '@effects/FlaskHealBurst';
import type { FootstepPuffManager } from '@effects/FootstepPuff';
import type { FluidResidueManager } from '@effects/FluidResidue';
import type { CriticalHighlightManager } from '@effects/CriticalHighlight';
import type { HitBloodSprayManager } from '@effects/HitBloodSpray';
import type { IceSkidStreakManager } from '@effects/IceSkidStreak';
import type { JumpTakeoffPuffManager } from '@effects/JumpTakeoffPuff';
import type { LandingDustManager } from '@effects/LandingDust';
import type { SteamPuffManager } from '@effects/SteamPuff';
import type { SurgeVfxManager } from '@effects/SurgeVfx';
import type { WallJumpDustManager } from '@effects/WallJumpDust';
import type { WallSlideDustManager } from '@effects/WallSlideDust';
import type { WaterBubblesManager } from '@effects/WaterBubbles';
import type { WaterSplashManager } from '@effects/WaterSplash';

export interface PlayerKinematicVfxManagers {
  landingDust: LandingDustManager;
  dashAfterimage: DashAfterimageManager;
  dashBoostPuff: DashBoostPuffManager;
  doubleJumpRing: DoubleJumpRingManager;
  wallJumpDust: WallJumpDustManager;
  jumpTakeoff: JumpTakeoffPuffManager;
  wallSlideDust: WallSlideDustManager;
  footstepPuff: FootstepPuffManager;
  surgeVfx: SurgeVfxManager;
  diveLandImpact: DiveLandImpactManager;
}

export interface CommonMovementVfxManagers {
  landingDust: LandingDustManager;
  dashBoostPuff: DashBoostPuffManager;
  doubleJumpRing: DoubleJumpRingManager;
  wallJumpDust: WallJumpDustManager;
  jumpTakeoff: JumpTakeoffPuffManager;
  wallSlideDust: WallSlideDustManager;
  footstepPuff: FootstepPuffManager;
  flaskBurst: FlaskHealBurstManager;
  criticalHighlight: CriticalHighlightManager;
  hitBloodSpray: HitBloodSprayManager;
  diveLandImpact: DiveLandImpactManager;
  waterSplash: WaterSplashManager;
  steamPuff?: SteamPuffManager;
  fluidResidue?: FluidResidueManager;
}

export interface EnemyKinematicVfxManagers {
  waterSplash: WaterSplashManager;
  waterBubbles: WaterBubblesManager;
  iceSkidStreak: IceSkidStreakManager;
  landingDust: LandingDustManager;
  jumpTakeoff: JumpTakeoffPuffManager;
}

export function updateCommonMovementVfxManagers(
  dtMs: number,
  managers: CommonMovementVfxManagers,
): void {
  managers.landingDust.update(dtMs);
  managers.dashBoostPuff.update(dtMs);
  managers.doubleJumpRing.update(dtMs);
  managers.wallJumpDust.update(dtMs);
  managers.jumpTakeoff.update(dtMs);
  managers.wallSlideDust.update(dtMs);
  managers.footstepPuff.update(dtMs);
  managers.flaskBurst.update(dtMs);
  managers.criticalHighlight.update(dtMs);
  managers.hitBloodSpray.update(dtMs);
  managers.diveLandImpact.update(dtMs);
  managers.waterSplash.update(dtMs);
  managers.steamPuff?.update(dtMs);
  managers.fluidResidue?.update(dtMs);
}

export function updateEnemyKinematicVfx(
  dtMs: number,
  enemies: readonly Enemy<string>[],
  managers: EnemyKinematicVfxManagers,
  options: {
    splashType?: 'water' | 'magma' | 'oil' | 'acid' | 'cyro';
    getKey?: (enemy: Enemy<string>, index: number) => string;
    onWaterTransition?: (enemy: Enemy<string>, footX: number, footY: number, transition: number) => void;
  } = {},
): void {
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (!enemy.alive) continue;
    const footX = enemy.x + enemy.width / 2;
    const footY = enemy.y + enemy.height;

    if (enemy.waterTransition !== 0) {
      const strength = enemy.waterTransition > 0 ? 1.0 : 0.8;
      managers.waterSplash.spawn(footX, footY, strength, options.splashType);
      options.onWaterTransition?.(enemy, footX, footY, enemy.waterTransition);
    }

    const key = options.getKey?.(enemy, i) ?? `enemy_${i}`;
    managers.waterBubbles.emit(footX, enemy.y + enemy.height * 0.35, dtMs, enemy.submerged, key);
    managers.iceSkidStreak.emit(dtMs, enemy.isStandingOnIce(), footX, footY, enemy.getVx(), key);
    const landed = enemy.consumeLandedEvent();
    if (landed !== null) managers.landingDust.spawn(footX, footY, landed);
    if (enemy.consumeGroundJumpEvent()) managers.jumpTakeoff.spawn(footX, footY);
  }
}

export function updatePlayerKinematicVfx(
  dtMs: number,
  player: Player,
  managers: PlayerKinematicVfxManagers,
  options: { playSfx?: boolean } = {},
): void {
  const playSfx = options.playSfx !== false;
  const landedSpeed = player.consumeLandedEvent();
  if (landedSpeed !== null) {
    managers.landingDust.spawn(player.x + player.width / 2, player.y + player.height, landedSpeed);
    if (playSfx && landedSpeed > 120) {
      const t = Math.min(1, (landedSpeed - 120) / 380);
      SFX.play('land', 0, { speed: 1.1 - t * 0.25 });
    }
  }

  const dashDir = player.consumeDashedEvent();
  if (dashDir !== null) {
    managers.dashBoostPuff.spawn(player.x + player.width / 2, player.y + player.height, dashDir);
  }

  if (player.consumeDoubleJumpEvent()) {
    managers.doubleJumpRing.spawn(player.x + player.width / 2, player.y + player.height);
  }

  const kickDir = player.consumeWallJumpEvent();
  if (kickDir !== null) {
    const wallX = kickDir > 0 ? player.x : player.x + player.width;
    const wallY = player.y + player.height * 0.45;
    managers.wallJumpDust.spawn(wallX, wallY, kickDir);
  }

  managers.dashAfterimage.tick(dtMs, player.isDashing(), () => ({
    x: player.x,
    y: player.y,
    w: player.width,
    h: player.height,
    facingRight: player.facingRight,
    texture: player.getCurrentErdaTexture(),
    spriteCenterX: player.x + player.width / 2,
    spriteFootY: player.y + player.height,
  }));

  if (player.consumeGroundJumpEvent()) {
    managers.jumpTakeoff.spawn(player.x + player.width / 2, player.y + player.height);
  }

  if (player.isWallSliding()) {
    const wallSide = player.wallContactDir();
    const wallX = wallSide < 0 ? player.x : player.x + player.width;
    managers.wallSlideDust.emit(wallX, player.y + player.height * 0.55, -wallSide, dtMs);
  }

  if (managers.footstepPuff.stepIfMoving(
    dtMs,
    player.isGrounded(),
    player.x + player.width / 2,
    player.y + player.height,
    player.getVx(),
    player.facingRight,
  ) && playSfx) {
    SFX.play('footstep', 0, { speed: 0.92 + Math.random() * 0.16 });
  }

  if (player.isSurgeCharging()) {
    managers.surgeVfx.tickCharge(dtMs, player.x + player.width / 2, player.y + player.height, player.getSurgeChargeRatio());
  } else if (player.isSurgeFlying()) {
    managers.surgeVfx.tickFly(dtMs, player.x + player.width / 2, player.y + player.height / 2);
  } else {
    managers.surgeVfx.idleTick(dtMs);
  }

  if (player.diveLanded) {
    const severity = Math.max(0.8, Math.min(1.6, player.diveFallDistance / 240));
    managers.diveLandImpact.spawn(player.x + player.width / 2, player.y + player.height, severity);
  } else if (landedSpeed !== null && landedSpeed > 520) {
    managers.diveLandImpact.spawn(player.x + player.width / 2, player.y + player.height, 0.9);
  }
}
