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
import type { LandingDustManager } from '@effects/LandingDust';
import type { JumpTakeoffPuffManager } from '@effects/JumpTakeoffPuff';
import type { SteamPuffManager } from '@effects/SteamPuff';
import type { WaterBubblesManager } from '@effects/WaterBubbles';
import type { WaterSplashManager } from '@effects/WaterSplash';
import type { IceSkidStreakManager } from '@effects/IceSkidStreak';
import type { FluidResidueManager } from '@effects/FluidResidue';
import type { FluidSystem } from '@effects/FluidSystem';
import type { FluidSpawnerManager } from '@systems/FluidSpawner';
import type { WorldFluidContactState } from './WorldFluidContactState';

interface WorldFluidFeedbackRuntimeDeps {
  getPlayer: () => Player;
  getEnemies: () => Enemy<string>[];
  getCollisionGrid: () => number[][];
  getFluidSystem: () => FluidSystem;
  getFluidSpawners: () => FluidSpawnerManager;
  getFluidResidue: () => FluidResidueManager;
  getContactState: () => WorldFluidContactState;
  getDamageNumbers: () => DamageNumberManager;
  getLandingDust: () => LandingDustManager;
  getJumpTakeoff: () => JumpTakeoffPuffManager;
  getSteamPuff: () => SteamPuffManager;
  getWaterBubbles: () => WaterBubblesManager;
  getWaterSplash: () => WaterSplashManager;
  getIceSkidStreak: () => IceSkidStreakManager;
}

export class WorldFluidFeedbackRuntime {
  constructor(private readonly deps: WorldFluidFeedbackRuntimeDeps) {}

  updatePlayer(dt: number): void {
    const player = this.deps.getPlayer();
    const grid = this.deps.getCollisionGrid();
    const fluidSystem = this.deps.getFluidSystem();
    const fluidSpawners = this.deps.getFluidSpawners();
    const fluidResidue = this.deps.getFluidResidue();
    const waterSplash = this.deps.getWaterSplash();

    const waterTransition = player.consumeWaterTransitionEvent();
    if (waterTransition !== null) {
      const strength = waterTransition > 0 ? 1.0 : 0.8;
      waterSplash.spawn(player.x + player.width / 2, player.y + player.height, strength);
      const impulseVy = waterTransition > 0 ? Math.max(80, player.getVy()) : -120;
      fluidSystem.applyImpulse(player.x + player.width / 2, player.y + player.height, impulseVy);
    }

    const playerWaterfallType = fluidSpawners.queryFluidAtAabb(player.x, player.y, player.width, player.height, grid);
    const inMagma = isInMagma(player.x, player.y, player.width, player.height, grid) || playerWaterfallType === 'magma';
    const inOil = isInOil(player.x, player.y, player.width, player.height, grid) || playerWaterfallType === 'oil';
    const inAcid = isInAcid(player.x, player.y, player.width, player.height, grid) || playerWaterfallType === 'acid';
    const inCyro = isInCyro(player.x, player.y, player.width, player.height, grid) || playerWaterfallType === 'cyro';
    const inAnyOther = inMagma || inOil || inAcid || inCyro;
    if (this.deps.getContactState().updatePlayerOtherFluid(inAnyOther)) {
      const type: 'magma' | 'oil' | 'acid' | 'cyro' = inCyro ? 'cyro' : inOil ? 'oil' : inAcid ? 'acid' : 'magma';
      const strength = inAnyOther ? 1.0 : 0.8;
      waterSplash.spawn(player.x + player.width / 2, player.y + player.height, strength, type);
      const impulseVy = inAnyOther ? Math.max(80, player.getVy()) : -120;
      fluidSystem.applyImpulse(player.x + player.width / 2, player.y + player.height, impulseVy);
      if (inAnyOther && inMagma) {
        this.deps.getSteamPuff().spawn(player.x + player.width / 2, player.y + player.height, 1.2);
      }
    }

    if (inOil) {
      player.oilSlipRemainingMs = OIL_SLIP_DURATION_MS;
      player.oilResidueRemainingMs = OIL_RESIDUE_DURATION_MS;
    } else {
      if (player.oilSlipRemainingMs > 0) player.oilSlipRemainingMs = Math.max(0, player.oilSlipRemainingMs - dt);
      if (player.oilResidueRemainingMs > 0) player.oilResidueRemainingMs = Math.max(0, player.oilResidueRemainingMs - dt);
    }
    player.prevInOil = inOil;

    if (inAcid) player.acidResidueRemainingMs = ACID_RESIDUE_DURATION_MS;
    else if (player.acidResidueRemainingMs > 0) player.acidResidueRemainingMs = Math.max(0, player.acidResidueRemainingMs - dt);
    player.prevInAcid = inAcid;

    if (inMagma) player.magmaResidueRemainingMs = MAGMA_RESIDUE_DURATION_MS;
    else if (player.magmaResidueRemainingMs > 0) player.magmaResidueRemainingMs = Math.max(0, player.magmaResidueRemainingMs - dt);
    player.prevInMagma = inMagma;

    if (player.inWater) player.waterResidueRemainingMs = WATER_RESIDUE_DURATION_MS;
    else if (player.waterResidueRemainingMs > 0) player.waterResidueRemainingMs = Math.max(0, player.waterResidueRemainingMs - dt);

    if (inCyro) player.cyroResidueRemainingMs = CYRO_RESIDUE_DURATION_MS;
    else if (player.cyroResidueRemainingMs > 0) player.cyroResidueRemainingMs = Math.max(0, player.cyroResidueRemainingMs - dt);
    player.prevInCyro = inCyro;

    const footX = player.x + player.width / 2;
    const footY = player.y + player.height;
    const grounded = player.isGrounded();
    fluidResidue.emit('oil', footX, footY, player.oilResidueRemainingMs > 0, grounded, player.oilResidueRemainingMs / OIL_RESIDUE_DURATION_MS);
    fluidResidue.emit('acid', footX, footY, player.acidResidueRemainingMs > 0, grounded, player.acidResidueRemainingMs / ACID_RESIDUE_DURATION_MS);
    fluidResidue.emit('magma', footX, footY, player.magmaResidueRemainingMs > 0, grounded, player.magmaResidueRemainingMs / MAGMA_RESIDUE_DURATION_MS);
    fluidResidue.emit('water', footX, footY, player.waterResidueRemainingMs > 0, grounded, player.waterResidueRemainingMs / WATER_RESIDUE_DURATION_MS);
    fluidResidue.emit('cyro', footX, footY, player.cyroResidueRemainingMs > 0, grounded, player.cyroResidueRemainingMs / CYRO_RESIDUE_DURATION_MS);

    fluidResidue.applyEffects(player.x, player.y, player.width, player.height, {
      refreshOilSlip: () => {},
      onAcidContact: () => {
        let acc = player.acidTickAccum ?? 0;
        acc += dt;
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
          const dmg = Math.max(1, Math.floor(player.maxHp * 0.03 * (dt / 1000)));
          player.hp = Math.max(0, player.hp - dmg);
        }
        player.burnRemainingMs = Math.max(player.burnRemainingMs ?? 0, 10000);
      },
    });
    if (player.inWater) player.extinguishFireDebuffs();

    this.deps.getWaterBubbles().emit(player.x + player.width / 2, player.y + player.height * 0.35, dt, player.submerged);
  }

  updateEnemies(dt: number): void {
    const grid = this.deps.getCollisionGrid();
    const fluidSystem = this.deps.getFluidSystem();
    const waterSplash = this.deps.getWaterSplash();
    const waterBubbles = this.deps.getWaterBubbles();
    const iceSkidStreak = this.deps.getIceSkidStreak();
    const landingDust = this.deps.getLandingDust();
    const jumpTakeoff = this.deps.getJumpTakeoff();
    const contactState = this.deps.getContactState();

    const enemies = this.deps.getEnemies();
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy.alive) continue;
      const ex = enemy.x + enemy.width / 2;
      const ey = enemy.y + enemy.height;

      if (enemy.waterTransition !== 0) {
        const strength = enemy.waterTransition > 0 ? 1.0 : 0.8;
        waterSplash.spawn(ex, ey, strength, 'water');
        const impulseVy = enemy.waterTransition > 0 ? 150 : -100;
        fluidSystem.applyImpulse(ex, ey, impulseVy);
      }

      const inOther = isInMagma(enemy.x, enemy.y, enemy.width, enemy.height, grid)
        || isInOil(enemy.x, enemy.y, enemy.width, enemy.height, grid)
        || isInAcid(enemy.x, enemy.y, enemy.width, enemy.height, grid);
      if (contactState.updateEnemyOtherFluid(i, inOther)) {
        let type: 'magma' | 'oil' | 'acid' = 'magma';
        if (isInOil(enemy.x, enemy.y, enemy.width, enemy.height, grid)) type = 'oil';
        else if (isInAcid(enemy.x, enemy.y, enemy.width, enemy.height, grid)) type = 'acid';
        const strength = inOther ? 1.0 : 0.8;
        waterSplash.spawn(ex, ey, strength, type);
        const impulseVy = inOther ? 150 : -100;
        fluidSystem.applyImpulse(ex, ey, impulseVy);
      }

      const key = `enemy_${i}`;
      waterBubbles.emit(ex, enemy.y + enemy.height * 0.35, dt, enemy.submerged, key);
      iceSkidStreak.emit(dt, enemy.isStandingOnIce(), ex, ey, enemy.getVx(), key);
      const landedSpeed = enemy.consumeLandedEvent();
      if (landedSpeed !== null) landingDust.spawn(ex, ey, landedSpeed);
      if (enemy.consumeGroundJumpEvent()) jumpTakeoff.spawn(ex, ey);

      this.applyEnemyResidueEffects(dt, enemy);
    }
  }

  private applyEnemyResidueEffects(dt: number, enemy: Enemy<string>): void {
    if (enemy.oilSlipRemainingMs > 0) enemy.oilSlipRemainingMs = Math.max(0, enemy.oilSlipRemainingMs - dt);
    const acidMultiplier = enemy.elementMultiplier('acid');
    const magmaMultiplier = enemy.elementMultiplier('magma');
    const fireMultiplier = enemy.elementMultiplier('fire');
    this.deps.getFluidResidue().applyEffects(enemy.x, enemy.y, enemy.width, enemy.height, {
      refreshOilSlip: (remainingMs) => {
        enemy.oilSlipRemainingMs = Math.max(enemy.oilSlipRemainingMs, remainingMs);
      },
      onAcidContact: () => {
        if (acidMultiplier <= 0) return;
        let acc = enemy.acidTickAccum;
        acc += dt;
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
          this.deps.getDamageNumbers().spawn(enemy.x + enemy.width / 2, enemy.y - 8, totalDmg, false);
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
          this.deps.getDamageNumbers().spawn(enemy.x + enemy.width / 2, enemy.y - 8, dmg, false);
          if (enemy.hp <= 0) enemy.onDeath();
        }
      },
      onFireContact: () => {
        if (fireMultiplier <= 0) return;
        const dmg = Math.max(1, Math.floor(enemy.maxHp * 0.03 * fireMultiplier * (dt / 1000)));
        enemy.hp = Math.max(0, enemy.hp - dmg);
        enemy.burnRemainingMs = Math.max(enemy.burnRemainingMs, 10000);
        if (enemy.hp <= 0) enemy.onDeath();
      },
    });
  }
}
