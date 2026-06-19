import type { Container } from 'pixi.js';
import type { Game } from '../../Game';
import { isSolid, TILE_SIZE } from '@core/Physics';
import type { Enemy } from '@entities/Enemy';
import type { Player } from '@entities/Player';
import { FallingHazard, type FallingHazardConfig } from '@entities/FallingHazard';
import type { LdtkLevel } from '@level/LdtkLoader';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { HUD } from '@ui/HUD';
import type { ScreenFlash } from '@effects/ScreenFlash';
import type { LandingDustManager } from '@effects/LandingDust';
import type { PropShatterManager } from '@effects/PropShatter';
import type { WaterSplashManager } from '@effects/WaterSplash';
import type { WorldFallingHazardRegistry } from './WorldFallingHazardRegistry';
import { SFX } from '@audio/Sfx';

interface WorldFallingHazardRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getEnemies: () => readonly Enemy<string>[];
  getCollisionGrid: () => number[][];
  getEntityLayer: () => Container;
  getRegistry: () => WorldFallingHazardRegistry;
  getHud: () => HUD;
  getScreenFlash: () => ScreenFlash;
  getDamageNumbers: () => DamageNumberManager;
  getLandingDust: () => LandingDustManager;
  getPropShatter: () => PropShatterManager;
  getWaterSplash: () => WaterSplashManager;
}

export class WorldFallingHazardRuntime {
  constructor(private readonly deps: WorldFallingHazardRuntimeDeps) {}

  spawn(level: LdtkLevel): void {
    const registry = this.deps.getRegistry();
    registry.clear();

    for (const entity of level.entities) {
      if (entity.type !== 'FallingHazard') continue;
      const hazard = new FallingHazard(this.configFromEntity(entity));
      registry.add(hazard, this.deps.getEntityLayer());
    }
  }

  update(dt: number): void {
    const player = this.deps.getPlayer();
    const playerBox = player.getHurtAABB();
    const grid = this.deps.getCollisionGrid();
    const registry = this.deps.getRegistry();

    for (let i = registry.hazards.length - 1; i >= 0; i--) {
      const hazard = registry.hazards[i];
      hazard.tryTrigger(playerBox);

      if (hazard.overlapsPlayer(playerBox)) {
        this.damagePlayer(hazard);
      }

      for (const enemy of this.deps.getEnemies()) {
        if (hazard.overlapsEnemy(enemy)) {
          this.damageEnemy(enemy, hazard);
        }
      }

      const impact = hazard.update(dt, grid);
      if (!impact) continue;

      this.deps.game.camera.shake(5);
      this.deps.getLandingDust().spawnScaled(impact.centerX, impact.bottomY, 520, Math.max(1.4, impact.width / 24));
      this.deps.getPropShatter().spawn(
        impact.x,
        impact.y,
        impact.width,
        impact.height,
        0x2b3138,
        0x9ba7a8,
        null,
      );
      SFX.play('breakable_destroy', 0, { speed: 1 / (1 + Math.random() * 0.5) });
      if (impact.fluidType) {
        this.deps.getWaterSplash().spawn(impact.centerX, impact.bottomY, 1.5, impact.fluidType);
      }
      registry.removeAt(i);
    }
  }

  private configFromEntity(entity: LdtkLevel['entities'][number]): FallingHazardConfig {
    const fields = entity.fields ?? {};
    const tileW = numberField(fields, 'TileW', 'tileW') ?? Math.max(1, Math.ceil(entity.width / TILE_SIZE));
    return {
      x: entity.px[0],
      y: entity.px[1],
      triggerHeight: this.resolveTriggerHeight(entity.px[0], entity.px[1], tileW),
      tileW,
      tileH: numberField(fields, 'TileH', 'tileH') ?? 1,
      telegraphMs: numberField(fields, 'TelegraphMs', 'telegraphMs') ?? 1000,
    };
  }

  private resolveTriggerHeight(x: number, y: number, tileW: number): number {
    const grid = this.deps.getCollisionGrid();
    const startRow = Math.max(0, Math.floor(y / TILE_SIZE));
    const leftCol = Math.floor(x / TILE_SIZE);
    const rightCol = leftCol + Math.max(1, tileW) - 1;
    for (let row = startRow; row < grid.length; row++) {
      for (let col = leftCol; col <= rightCol; col++) {
        if (isSolid(grid[row]?.[col] ?? 0)) {
          return Math.max(TILE_SIZE, row * TILE_SIZE - y);
        }
      }
    }
    return Math.max(TILE_SIZE, grid.length * TILE_SIZE - y);
  }

  private damagePlayer(hazard: FallingHazard): void {
    const player = this.deps.getPlayer();
    if (player.invincible || player.hp <= 0) return;

    const dmg = Math.max(1, Math.floor(player.maxHp * 0.2));
    player.lastDamageSource = 'falling_hazard';
    player.hp = Math.max(0, player.hp - dmg);
    player.invincible = true;
    player.invincibleTimer = 1000;
    player.onHit(0, -480, 180);
    this.deps.getHud().flashDamage();
    this.deps.getDamageNumbers().spawn(player.x + player.width / 2, player.y - 8, dmg, true);
    this.deps.getScreenFlash().flashDamage(true);
    this.deps.game.hitstopFrames = 8;
    this.deps.game.camera.shake(6);

    if (player.hp <= 0) {
      player.hp = 0;
      player.onDeath();
      this.deps.game.hitstopFrames = 8;
    }
  }

  private damageEnemy(enemy: Enemy<string>, hazard: FallingHazard): void {
    const dmg = 100;
    enemy.hp = Math.max(0, enemy.hp - dmg);
    const hazardBox = hazard.getAABB();
    const dir = enemy.x + enemy.width / 2 >= hazardBox.x + hazardBox.width / 2 ? 1 : -1;
    enemy.onHit(dir * 90, -140, 240);
    this.deps.getDamageNumbers().spawn(enemy.x + enemy.width / 2, enemy.y - 8, dmg, true);
    this.deps.game.hitstopFrames = Math.max(this.deps.game.hitstopFrames, 4);
    if (enemy.hp <= 0) {
      enemy.hp = 0;
      enemy.onDeath();
    }
  }
}

function numberField(fields: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = fields[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}
