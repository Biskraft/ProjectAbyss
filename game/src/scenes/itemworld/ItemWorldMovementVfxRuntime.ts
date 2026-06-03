import { isInAcid, isInCyro, isInMagma, isInOil } from '@core/Physics';
import {
  ACID_RESIDUE_DURATION_MS,
  CYRO_RESIDUE_DURATION_MS,
  MAGMA_RESIDUE_DURATION_MS,
  OIL_RESIDUE_DURATION_MS,
  OIL_SLIP_DURATION_MS,
  WATER_RESIDUE_DURATION_MS,
  type Player,
} from '@entities/Player';
import type { Enemy } from '@entities/Enemy';
import type { DamageNumberManager } from '@ui/DamageNumber';
import { SFX } from '@audio/Sfx';
import type { DashAfterimageManager } from '@effects/DashAfterimage';
import type { DashBoostPuffManager } from '@effects/DashBoostPuff';
import type { DiveLandImpactManager } from '@effects/DiveLandImpact';
import type { DoubleJumpRingManager } from '@effects/DoubleJumpRing';
import type { DropThroughDustManager } from '@effects/DropThroughDust';
import type { FluidResidueManager } from '@effects/FluidResidue';
import type { FluidSystem } from '@effects/FluidSystem';
import type { FootstepPuffManager } from '@effects/FootstepPuff';
import type { FlaskHealBurstManager } from '@effects/FlaskHealBurst';
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
import type { FluidSpawnerManager } from '@systems/FluidSpawner';

interface ItemWorldMovementVfxRuntimeDeps {
  getPlayer: () => Player;
  getEnemies: () => Enemy<string>[];
  getFullGrid: () => number[][];
  getFluidSystem: () => FluidSystem;
  getFluidSpawners: () => FluidSpawnerManager;
  getDamageNumbers: () => DamageNumberManager;
  managers: {
    landingDust: LandingDustManager;
    dashAfterimage: DashAfterimageManager;
    dashBoostPuff: DashBoostPuffManager;
    doubleJumpRing: DoubleJumpRingManager;
    wallJumpDust: WallJumpDustManager;
    jumpTakeoff: JumpTakeoffPuffManager;
    wallSlideDust: WallSlideDustManager;
    footstepPuff: FootstepPuffManager;
    surgeVfx: SurgeVfxManager;
    hitBloodSpray: HitBloodSprayManager;
    diveLandImpact: DiveLandImpactManager;
    waterSplash: WaterSplashManager;
    fluidResidue: FluidResidueManager;
    waterBubbles: WaterBubblesManager;
    dropThroughDust: DropThroughDustManager;
    iceSkidStreak: IceSkidStreakManager;
    flaskBurst: FlaskHealBurstManager;
    criticalHighlight: CriticalHighlightManager;
    steamPuff: SteamPuffManager;
  };
}

export class ItemWorldMovementVfxRuntime {
  private prevPlayerInOtherFluid = false;
  private prevEnemyInOtherFluid: boolean[] = [];

  constructor(private readonly deps: ItemWorldMovementVfxRuntimeDeps) {}

  update(dtMs: number): void {
    const player = this.deps.getPlayer();
    this.updatePlayerVfx(dtMs, player);
    this.updateEnemyVfx(dtMs);
    this.updateManagers(dtMs);
  }

  private updatePlayerVfx(dtMs: number, player: Player): void {
    const { managers } = this.deps;

    const landedSpeed = player.consumeLandedEvent();
    if (landedSpeed !== null) {
      managers.landingDust.spawn(player.x + player.width / 2, player.y + player.height, landedSpeed);
      if (landedSpeed > 120) {
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
    )) {
      SFX.play('footstep', 0, { speed: 0.92 + Math.random() * 0.16 });
    }

    if (player.isSurgeCharging()) {
      managers.surgeVfx.tickCharge(dtMs, player.x + player.width / 2, player.y + player.height, player.getSurgeChargeRatio());
    } else if (player.isSurgeFlying()) {
      managers.surgeVfx.tickFly(dtMs, player.x + player.width / 2, player.y + player.height / 2);
    } else {
      managers.surgeVfx.idleTick(dtMs);
    }

    const hitDir = player.consumePlayerHitEvent();
    if (hitDir !== null) {
      managers.hitBloodSpray.spawn(player.x + player.width / 2, player.y + player.height * 0.4, hitDir);
    }

    if (player.diveLanded) {
      const severity = Math.max(0.8, Math.min(1.6, player.diveFallDistance / 240));
      managers.diveLandImpact.spawn(player.x + player.width / 2, player.y + player.height, severity);
    } else if (landedSpeed !== null && landedSpeed > 520) {
      managers.diveLandImpact.spawn(player.x + player.width / 2, player.y + player.height, 0.9);
    }

    const waterTransition = player.consumeWaterTransitionEvent();
    if (waterTransition !== null) {
      const strength = waterTransition > 0 ? 1.0 : 0.8;
      managers.waterSplash.spawn(player.x + player.width / 2, player.y + player.height, strength);
      const impulseVy = waterTransition > 0 ? Math.max(80, player.getVy()) : -120;
      this.deps.getFluidSystem().applyImpulse(player.x + player.width / 2, player.y + player.height, impulseVy);
    }

    this.updatePlayerFluidResidue(dtMs, player);

    managers.waterBubbles.emit(player.x + player.width / 2, player.y + player.height * 0.35, dtMs, player.submerged);
    if (player.consumeDropThroughEvent()) {
      managers.dropThroughDust.spawn(player.x + player.width / 2, player.y + player.height, player.width * 0.9);
    }
    managers.iceSkidStreak.emit(dtMs, player.isStandingOnIce(), player.x + player.width / 2, player.y + player.height, player.getVx());
  }

  private updatePlayerFluidResidue(dtMs: number, player: Player): void {
    const { managers } = this.deps;
    const fullGrid = this.deps.getFullGrid();
    const waterfallType = this.deps.getFluidSpawners().queryFluidAtAabb(player.x, player.y, player.width, player.height, fullGrid);
    const inOil = isInOil(player.x, player.y, player.width, player.height, fullGrid) || waterfallType === 'oil';
    const inAcid = isInAcid(player.x, player.y, player.width, player.height, fullGrid) || waterfallType === 'acid';
    const inMagma = isInMagma(player.x, player.y, player.width, player.height, fullGrid) || waterfallType === 'magma';
    const inCyro = isInCyro(player.x, player.y, player.width, player.height, fullGrid) || waterfallType === 'cyro';
    const inAnyOther = inMagma || inOil || inAcid || inCyro;

    if (inAnyOther !== this.prevPlayerInOtherFluid) {
      const type: 'magma' | 'oil' | 'acid' | 'cyro' = inCyro ? 'cyro' : inOil ? 'oil' : inAcid ? 'acid' : 'magma';
      const strength = inAnyOther ? 1.0 : 0.8;
      managers.waterSplash.spawn(player.x + player.width / 2, player.y + player.height, strength, type);
      const impulseVy = inAnyOther ? Math.max(80, player.getVy()) : -120;
      this.deps.getFluidSystem().applyImpulse(player.x + player.width / 2, player.y + player.height, impulseVy);
      if (inAnyOther && inMagma) {
        managers.steamPuff.spawn(player.x + player.width / 2, player.y + player.height, 1.2);
      }
      this.prevPlayerInOtherFluid = inAnyOther;
    }

    if (inOil) {
      player.oilSlipRemainingMs = OIL_SLIP_DURATION_MS;
      player.oilResidueRemainingMs = OIL_RESIDUE_DURATION_MS;
    } else {
      if (player.oilSlipRemainingMs > 0) player.oilSlipRemainingMs = Math.max(0, player.oilSlipRemainingMs - dtMs);
      if (player.oilResidueRemainingMs > 0) player.oilResidueRemainingMs = Math.max(0, player.oilResidueRemainingMs - dtMs);
    }
    player.prevInOil = inOil;

    if (inAcid) player.acidResidueRemainingMs = ACID_RESIDUE_DURATION_MS;
    else if (player.acidResidueRemainingMs > 0) player.acidResidueRemainingMs = Math.max(0, player.acidResidueRemainingMs - dtMs);
    player.prevInAcid = inAcid;

    if (inMagma) player.magmaResidueRemainingMs = MAGMA_RESIDUE_DURATION_MS;
    else if (player.magmaResidueRemainingMs > 0) player.magmaResidueRemainingMs = Math.max(0, player.magmaResidueRemainingMs - dtMs);
    player.prevInMagma = inMagma;

    if (player.inWater) player.waterResidueRemainingMs = WATER_RESIDUE_DURATION_MS;
    else if (player.waterResidueRemainingMs > 0) player.waterResidueRemainingMs = Math.max(0, player.waterResidueRemainingMs - dtMs);

    if (inCyro) player.cyroResidueRemainingMs = CYRO_RESIDUE_DURATION_MS;
    else if (player.cyroResidueRemainingMs > 0) player.cyroResidueRemainingMs = Math.max(0, player.cyroResidueRemainingMs - dtMs);
    player.prevInCyro = inCyro;

    const footX = player.x + player.width / 2;
    const footY = player.y + player.height;
    const grounded = player.isGrounded();
    managers.fluidResidue.emit('oil', footX, footY, player.oilResidueRemainingMs > 0, grounded, player.oilResidueRemainingMs / OIL_RESIDUE_DURATION_MS);
    managers.fluidResidue.emit('acid', footX, footY, player.acidResidueRemainingMs > 0, grounded, player.acidResidueRemainingMs / ACID_RESIDUE_DURATION_MS);
    managers.fluidResidue.emit('magma', footX, footY, player.magmaResidueRemainingMs > 0, grounded, player.magmaResidueRemainingMs / MAGMA_RESIDUE_DURATION_MS);
    managers.fluidResidue.emit('water', footX, footY, player.waterResidueRemainingMs > 0, grounded, player.waterResidueRemainingMs / WATER_RESIDUE_DURATION_MS);
    managers.fluidResidue.emit('cyro', footX, footY, player.cyroResidueRemainingMs > 0, grounded, player.cyroResidueRemainingMs / CYRO_RESIDUE_DURATION_MS);

    managers.fluidResidue.applyEffects(player.x, player.y, player.width, player.height, {
      refreshOilSlip: () => {},
      onAcidContact: () => {
        let acc = player.acidTickAccum ?? 0;
        acc += dtMs;
        while (acc >= 100) {
          acc -= 100;
          const dmg = Math.max(1, Math.floor(player.maxHp * 0.005));
          if (!player.invincible) player.hp = Math.max(0, player.hp - dmg);
        }
        player.acidTickAccum = acc;
      },
      onMagmaContact: () => {
        if (player.inWater) {
          player.extinguishFireDebuffs();
          return;
        }
        const wasBurning = (player.burnRemainingMs ?? 0) > 0;
        player.burnRemainingMs = 15000;
        if (!wasBurning && !player.invincible) {
          const dmg = Math.max(1, Math.floor(player.maxHp * 0.02));
          player.hp = Math.max(0, player.hp - dmg);
        }
      },
      onFireContact: () => {
        if (player.inWater) {
          player.extinguishFireDebuffs();
          return;
        }
        if (!player.invincible) {
          const dmg = Math.max(1, Math.floor(player.maxHp * 0.03 * (dtMs / 1000)));
          player.hp = Math.max(0, player.hp - dmg);
        }
        player.burnRemainingMs = Math.max(player.burnRemainingMs ?? 0, 10000);
      },
    });
    if (player.inWater) player.extinguishFireDebuffs();
  }

  private updateEnemyVfx(dtMs: number): void {
    const { managers } = this.deps;
    const fullGrid = this.deps.getFullGrid();
    const enemies = this.deps.getEnemies();
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy.alive) continue;
      const ex = enemy.x + enemy.width / 2;
      const ey = enemy.y + enemy.height;

      if (enemy.waterTransition !== 0) {
        const strength = enemy.waterTransition > 0 ? 1.0 : 0.8;
        managers.waterSplash.spawn(ex, ey, strength, 'water');
        const impulseVy = enemy.waterTransition > 0 ? 150 : -100;
        this.deps.getFluidSystem().applyImpulse(ex, ey, impulseVy);
      }

      const inOther = isInMagma(enemy.x, enemy.y, enemy.width, enemy.height, fullGrid)
        || isInOil(enemy.x, enemy.y, enemy.width, enemy.height, fullGrid)
        || isInAcid(enemy.x, enemy.y, enemy.width, enemy.height, fullGrid);
      const prevOther = this.prevEnemyInOtherFluid[i] ?? false;
      if (inOther !== prevOther) {
        let type: 'magma' | 'oil' | 'acid' = 'magma';
        if (isInOil(enemy.x, enemy.y, enemy.width, enemy.height, fullGrid)) type = 'oil';
        else if (isInAcid(enemy.x, enemy.y, enemy.width, enemy.height, fullGrid)) type = 'acid';
        const strength = inOther ? 1.0 : 0.8;
        managers.waterSplash.spawn(ex, ey, strength, type);
        const impulseVy = inOther ? 150 : -100;
        this.deps.getFluidSystem().applyImpulse(ex, ey, impulseVy);
        this.prevEnemyInOtherFluid[i] = inOther;
      }

      const key = `enemy_${i}`;
      managers.waterBubbles.emit(ex, enemy.y + enemy.height * 0.35, dtMs, enemy.submerged, key);
      managers.iceSkidStreak.emit(dtMs, enemy.isStandingOnIce(), ex, ey, enemy.getVx(), key);
      const landed = enemy.consumeLandedEvent();
      if (landed !== null) managers.landingDust.spawn(ex, ey, landed);
      if (enemy.consumeGroundJumpEvent()) managers.jumpTakeoff.spawn(ex, ey);

      this.applyEnemyResidueDamage(dtMs, enemy);
    }
  }

  private applyEnemyResidueDamage(dtMs: number, enemy: Enemy<string>): void {
    const { managers } = this.deps;
    const damageNumbers = this.deps.getDamageNumbers();
    if (enemy.oilSlipRemainingMs > 0) enemy.oilSlipRemainingMs = Math.max(0, enemy.oilSlipRemainingMs - dtMs);
    const acidMultiplier = enemy.elementMultiplier('acid');
    const magmaMultiplier = enemy.elementMultiplier('magma');
    const fireMultiplier = enemy.elementMultiplier('fire');
    managers.fluidResidue.applyEffects(enemy.x, enemy.y, enemy.width, enemy.height, {
      refreshOilSlip: (remainingMs) => {
        enemy.oilSlipRemainingMs = Math.max(enemy.oilSlipRemainingMs, remainingMs);
      },
      onAcidContact: () => {
        if (acidMultiplier <= 0) return;
        let acc = enemy.acidTickAccum;
        acc += dtMs;
        let totalDmg = 0;
        while (acc >= 100) {
          acc -= 100;
          const dmg = Math.max(1, Math.floor(enemy.maxHp * 0.005 * acidMultiplier));
          enemy.hp = Math.max(0, enemy.hp - dmg);
          totalDmg += dmg;
        }
        enemy.acidTickAccum = acc;
        if (totalDmg > 0) {
          enemy.showHpBarFlash();
          damageNumbers.spawn(enemy.x + enemy.width / 2, enemy.y - 8, totalDmg, false);
        }
        if (enemy.hp <= 0) enemy.onDeath();
      },
      onMagmaContact: () => {
        if (magmaMultiplier <= 0) return;
        const wasBurning = enemy.burnRemainingMs > 0;
        enemy.burnRemainingMs = 15000;
        if (!wasBurning) {
          const dmg = Math.max(1, Math.floor(enemy.maxHp * 0.02 * magmaMultiplier));
          enemy.hp = Math.max(0, enemy.hp - dmg);
          enemy.showHpBarFlash();
          damageNumbers.spawn(enemy.x + enemy.width / 2, enemy.y - 8, dmg, false);
          if (enemy.hp <= 0) enemy.onDeath();
        }
      },
      onFireContact: () => {
        if (fireMultiplier <= 0) return;
        const dmg = Math.max(1, Math.floor(enemy.maxHp * 0.03 * fireMultiplier * (dtMs / 1000)));
        enemy.hp = Math.max(0, enemy.hp - dmg);
        enemy.burnRemainingMs = Math.max(enemy.burnRemainingMs, 10000);
        if (enemy.hp <= 0) enemy.onDeath();
      },
    });
  }

  private updateManagers(dtMs: number): void {
    const { managers } = this.deps;
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
    managers.steamPuff.update(dtMs);
    managers.fluidResidue.update(dtMs);
  }
}
