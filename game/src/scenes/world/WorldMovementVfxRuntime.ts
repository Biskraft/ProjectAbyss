import type { Container } from 'pixi.js';
import type { Player } from '@entities/Player';
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
import { updateCommonMovementVfxManagers, updatePlayerKinematicVfx } from '@scenes/shared/MovementVfxHelpers';

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
    updateCommonMovementVfxManagers(dt, {
      landingDust: this.landingDust,
      dashBoostPuff: this.dashBoostPuff,
      doubleJumpRing: this.doubleJumpRing,
      wallJumpDust: this.wallJumpDust,
      jumpTakeoff: this.jumpTakeoff,
      wallSlideDust: this.wallSlideDust,
      footstepPuff: this.footstepPuff,
      flaskBurst: this.flaskBurst,
      criticalHighlight: this.criticalHighlight,
      hitBloodSpray: this.hitBloodSpray,
      diveLandImpact: this.diveLandImpact,
      waterSplash: this.waterSplash,
      steamPuff: this.steamPuff,
    });
  }

  updatePlayerKinematicFeedback(dt: number, player: Player): void {
    updatePlayerKinematicVfx(dt, player, {
      landingDust: this.landingDust,
      dashAfterimage: this.dashAfterimage,
      dashBoostPuff: this.dashBoostPuff,
      doubleJumpRing: this.doubleJumpRing,
      wallJumpDust: this.wallJumpDust,
      jumpTakeoff: this.jumpTakeoff,
      wallSlideDust: this.wallSlideDust,
      footstepPuff: this.footstepPuff,
      surgeVfx: this.surgeVfx,
      diveLandImpact: this.diveLandImpact,
    });
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
