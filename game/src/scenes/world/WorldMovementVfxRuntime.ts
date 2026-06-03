import type { Container } from 'pixi.js';
import type { Player } from '@entities/Player';
import { SFX } from '@audio/Sfx';
import { LandingDustManager } from '@effects/LandingDust';
import { DashAfterimageManager } from '@effects/DashAfterimage';
import { DashBoostPuffManager } from '@effects/DashBoostPuff';
import { DoubleJumpRingManager } from '@effects/DoubleJumpRing';
import { WallJumpDustManager } from '@effects/WallJumpDust';
import { JumpTakeoffPuffManager } from '@effects/JumpTakeoffPuff';
import { WallSlideDustManager } from '@effects/WallSlideDust';
import { FootstepPuffManager } from '@effects/FootstepPuff';
import { FlaskHealBurstManager } from '@effects/FlaskHealBurst';
import { SurgeVfxManager } from '@effects/SurgeVfx';
import { CriticalHighlightManager } from '@effects/CriticalHighlight';
import { HitBloodSprayManager } from '@effects/HitBloodSpray';
import { DiveLandImpactManager } from '@effects/DiveLandImpact';
import { WaterSplashManager } from '@effects/WaterSplash';
import { WaterBubblesManager } from '@effects/WaterBubbles';
import { SteamPuffManager } from '@effects/SteamPuff';
import { DropThroughDustManager } from '@effects/DropThroughDust';
import { IceSkidStreakManager } from '@effects/IceSkidStreak';

export class WorldMovementVfxRuntime {
  private landingDustManager: LandingDustManager | null = null;
  private dashAfterimageManager: DashAfterimageManager | null = null;
  private dashBoostPuffManager: DashBoostPuffManager | null = null;
  private doubleJumpRingManager: DoubleJumpRingManager | null = null;
  private wallJumpDustManager: WallJumpDustManager | null = null;
  private jumpTakeoffManager: JumpTakeoffPuffManager | null = null;
  private wallSlideDustManager: WallSlideDustManager | null = null;
  private footstepPuffManager: FootstepPuffManager | null = null;
  private flaskBurstManager: FlaskHealBurstManager | null = null;
  private surgeVfxManager: SurgeVfxManager | null = null;
  private criticalHighlightManager: CriticalHighlightManager | null = null;
  private hitBloodSprayManager: HitBloodSprayManager | null = null;
  private diveLandImpactManager: DiveLandImpactManager | null = null;
  private waterSplashManager: WaterSplashManager | null = null;
  private waterBubblesManager: WaterBubblesManager | null = null;
  private steamPuffManager: SteamPuffManager | null = null;
  private dropThroughDustManager: DropThroughDustManager | null = null;
  private iceSkidStreakManager: IceSkidStreakManager | null = null;

  get landingDust(): LandingDustManager { return this.require(this.landingDustManager, 'landingDust'); }
  get dashAfterimage(): DashAfterimageManager { return this.require(this.dashAfterimageManager, 'dashAfterimage'); }
  get dashBoostPuff(): DashBoostPuffManager { return this.require(this.dashBoostPuffManager, 'dashBoostPuff'); }
  get doubleJumpRing(): DoubleJumpRingManager { return this.require(this.doubleJumpRingManager, 'doubleJumpRing'); }
  get wallJumpDust(): WallJumpDustManager { return this.require(this.wallJumpDustManager, 'wallJumpDust'); }
  get jumpTakeoff(): JumpTakeoffPuffManager { return this.require(this.jumpTakeoffManager, 'jumpTakeoff'); }
  get wallSlideDust(): WallSlideDustManager { return this.require(this.wallSlideDustManager, 'wallSlideDust'); }
  get footstepPuff(): FootstepPuffManager { return this.require(this.footstepPuffManager, 'footstepPuff'); }
  get flaskBurst(): FlaskHealBurstManager { return this.require(this.flaskBurstManager, 'flaskBurst'); }
  get surgeVfx(): SurgeVfxManager { return this.require(this.surgeVfxManager, 'surgeVfx'); }
  get criticalHighlight(): CriticalHighlightManager { return this.require(this.criticalHighlightManager, 'criticalHighlight'); }
  get hitBloodSpray(): HitBloodSprayManager { return this.require(this.hitBloodSprayManager, 'hitBloodSpray'); }
  get diveLandImpact(): DiveLandImpactManager { return this.require(this.diveLandImpactManager, 'diveLandImpact'); }
  get waterSplash(): WaterSplashManager { return this.require(this.waterSplashManager, 'waterSplash'); }
  get waterBubbles(): WaterBubblesManager { return this.require(this.waterBubblesManager, 'waterBubbles'); }
  get steamPuff(): SteamPuffManager { return this.require(this.steamPuffManager, 'steamPuff'); }
  get dropThroughDust(): DropThroughDustManager { return this.require(this.dropThroughDustManager, 'dropThroughDust'); }
  get iceSkidStreak(): IceSkidStreakManager { return this.require(this.iceSkidStreakManager, 'iceSkidStreak'); }

  initialize(entityLayer: Container): void {
    this.landingDustManager = new LandingDustManager(entityLayer);
    this.dashAfterimageManager = new DashAfterimageManager(entityLayer);
    this.dashBoostPuffManager = new DashBoostPuffManager(entityLayer);
    this.doubleJumpRingManager = new DoubleJumpRingManager(entityLayer);
    this.wallJumpDustManager = new WallJumpDustManager(entityLayer);
    this.jumpTakeoffManager = new JumpTakeoffPuffManager(entityLayer);
    this.wallSlideDustManager = new WallSlideDustManager(entityLayer);
    this.footstepPuffManager = new FootstepPuffManager(entityLayer);
    this.flaskBurstManager = new FlaskHealBurstManager(entityLayer);
    this.surgeVfxManager = new SurgeVfxManager(entityLayer);
    this.criticalHighlightManager = new CriticalHighlightManager(entityLayer);
    this.hitBloodSprayManager = new HitBloodSprayManager(entityLayer);
    this.diveLandImpactManager = new DiveLandImpactManager(entityLayer);
    this.waterSplashManager = new WaterSplashManager(entityLayer);
    this.steamPuffManager = new SteamPuffManager(entityLayer);
    this.waterBubblesManager = new WaterBubblesManager(entityLayer);
    this.dropThroughDustManager = new DropThroughDustManager(entityLayer);
    this.iceSkidStreakManager = new IceSkidStreakManager(entityLayer);
  }

  updateCharacterFeedback(dt: number): void {
    this.landingDustManager?.update(dt);
    this.dashBoostPuffManager?.update(dt);
    this.doubleJumpRingManager?.update(dt);
    this.wallJumpDustManager?.update(dt);
    this.jumpTakeoffManager?.update(dt);
    this.wallSlideDustManager?.update(dt);
    this.footstepPuffManager?.update(dt);
    this.flaskBurstManager?.update(dt);
    this.criticalHighlightManager?.update(dt);
    this.hitBloodSprayManager?.update(dt);
    this.diveLandImpactManager?.update(dt);
    this.waterSplashManager?.update(dt);
    this.steamPuffManager?.update(dt);
  }

  updatePlayerKinematicFeedback(dt: number, player: Player): void {
    const landedSpeed = player.consumeLandedEvent();
    if (landedSpeed !== null) {
      this.landingDust.spawn(player.x + player.width / 2, player.y + player.height, landedSpeed);
      if (landedSpeed > 120) {
        const t = Math.min(1, (landedSpeed - 120) / 380);
        SFX.play('land', 0, { speed: 1.1 - t * 0.25 });
      }
    }

    const dashDir = player.consumeDashedEvent();
    if (dashDir !== null) {
      this.dashBoostPuff.spawn(player.x + player.width / 2, player.y + player.height, dashDir);
    }

    if (player.consumeDoubleJumpEvent()) {
      this.doubleJumpRing.spawn(player.x + player.width / 2, player.y + player.height);
    }

    const kickDir = player.consumeWallJumpEvent();
    if (kickDir !== null) {
      const wallX = kickDir > 0 ? player.x : player.x + player.width;
      const wallY = player.y + player.height * 0.45;
      this.wallJumpDust.spawn(wallX, wallY, kickDir);
    }

    this.dashAfterimage.tick(dt, player.isDashing(), () => ({
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
      this.jumpTakeoff.spawn(player.x + player.width / 2, player.y + player.height);
    }

    if (player.isWallSliding()) {
      const wallSide = player.wallContactDir();
      const wallX = wallSide < 0 ? player.x : player.x + player.width;
      this.wallSlideDust.emit(wallX, player.y + player.height * 0.55, -wallSide, dt);
    }

    if (this.footstepPuff.stepIfMoving(
      dt,
      player.isGrounded(),
      player.x + player.width / 2,
      player.y + player.height,
      player.getVx(),
      player.facingRight,
    )) {
      SFX.play('footstep', 0, { speed: 0.92 + Math.random() * 0.16 });
    }

    if (player.isSurgeCharging()) {
      this.surgeVfx.tickCharge(dt, player.x + player.width / 2, player.y + player.height, player.getSurgeChargeRatio());
    } else if (player.isSurgeFlying()) {
      this.surgeVfx.tickFly(dt, player.x + player.width / 2, player.y + player.height / 2);
    } else {
      this.surgeVfx.idleTick(dt);
    }

    if (player.diveLanded) {
      const severity = Math.max(0.8, Math.min(1.6, player.diveFallDistance / 240));
      this.diveLandImpact.spawn(player.x + player.width / 2, player.y + player.height, severity);
    } else if (landedSpeed !== null && landedSpeed > 520) {
      this.diveLandImpact.spawn(player.x + player.width / 2, player.y + player.height, 0.9);
    }
  }

  updateLate(dt: number): void {
    this.dropThroughDustManager?.update(dt);
    this.iceSkidStreakManager?.update(dt);
  }

  private require<T>(manager: T | null, name: string): T {
    if (!manager) throw new Error(`WorldMovementVfxRuntime.${name} used before initialize()`);
    return manager;
  }
}
