import type { Container } from 'pixi.js';
import type { Game } from '../../Game';
import { DamageNumberManager } from '@ui/DamageNumber';
import { HitSparkManager } from '@effects/HitSpark';
import { PropShatterManager } from '@effects/PropShatter';
import { DeathParticleManager } from '@effects/DeathParticles';
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
import { SteamPuffManager } from '@effects/SteamPuff';
import { AshRemnantManager } from '@effects/AshRemnant';
import { FluidResidueManager } from '@effects/FluidResidue';
import { WaterBubblesManager } from '@effects/WaterBubbles';
import { DropThroughDustManager } from '@effects/DropThroughDust';
import { IceSkidStreakManager } from '@effects/IceSkidStreak';
import { ItemPickupGlowManager } from '@effects/ItemPickupGlow';
import { LowHpVignetteManager } from '@effects/LowHpVignette';

export interface ItemWorldVfxManagers {
  dmgNumbers: DamageNumberManager;
  hitSparks: HitSparkManager;
  propShatter: PropShatterManager;
  deathParticles: DeathParticleManager;
  landingDust: LandingDustManager;
  dashAfterimage: DashAfterimageManager;
  dashBoostPuff: DashBoostPuffManager;
  doubleJumpRing: DoubleJumpRingManager;
  wallJumpDust: WallJumpDustManager;
  jumpTakeoff: JumpTakeoffPuffManager;
  wallSlideDust: WallSlideDustManager;
  footstepPuff: FootstepPuffManager;
  flaskBurst: FlaskHealBurstManager;
  surgeVfx: SurgeVfxManager;
  criticalHighlight: CriticalHighlightManager;
  hitBloodSpray: HitBloodSprayManager;
  diveLandImpact: DiveLandImpactManager;
  waterSplash: WaterSplashManager;
  steamPuff: SteamPuffManager;
  ashRemnant: AshRemnantManager;
  fluidResidue: FluidResidueManager;
  waterBubbles: WaterBubblesManager;
  dropThroughDust: DropThroughDustManager;
  iceSkidStreak: IceSkidStreakManager;
  itemPickupGlow: ItemPickupGlowManager;
  lowHpVignette: LowHpVignetteManager;
}

export function createItemWorldVfxManagers(
  game: Game,
  entityLayer: Container,
  viewportWidth: number,
  viewportHeight: number,
): ItemWorldVfxManagers {
  const lowHpVignette = new LowHpVignetteManager(game.legacyUIContainer);
  lowHpVignette.setViewport(viewportWidth, viewportHeight);

  return {
    dmgNumbers: new DamageNumberManager(game.uiContainer, game.camera, game.uiScale),
    hitSparks: new HitSparkManager(entityLayer),
    propShatter: new PropShatterManager(entityLayer),
    deathParticles: new DeathParticleManager(entityLayer),
    landingDust: new LandingDustManager(entityLayer),
    dashAfterimage: new DashAfterimageManager(entityLayer),
    dashBoostPuff: new DashBoostPuffManager(entityLayer),
    doubleJumpRing: new DoubleJumpRingManager(entityLayer),
    wallJumpDust: new WallJumpDustManager(entityLayer),
    jumpTakeoff: new JumpTakeoffPuffManager(entityLayer),
    wallSlideDust: new WallSlideDustManager(entityLayer),
    footstepPuff: new FootstepPuffManager(entityLayer),
    flaskBurst: new FlaskHealBurstManager(entityLayer),
    surgeVfx: new SurgeVfxManager(entityLayer),
    criticalHighlight: new CriticalHighlightManager(entityLayer),
    hitBloodSpray: new HitBloodSprayManager(entityLayer),
    diveLandImpact: new DiveLandImpactManager(entityLayer),
    waterSplash: new WaterSplashManager(entityLayer),
    steamPuff: new SteamPuffManager(entityLayer),
    ashRemnant: new AshRemnantManager(entityLayer),
    fluidResidue: new FluidResidueManager(entityLayer),
    waterBubbles: new WaterBubblesManager(entityLayer),
    dropThroughDust: new DropThroughDustManager(entityLayer),
    iceSkidStreak: new IceSkidStreakManager(entityLayer),
    itemPickupGlow: new ItemPickupGlowManager(entityLayer),
    lowHpVignette,
  };
}
