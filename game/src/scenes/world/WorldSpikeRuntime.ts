import type { Container } from 'pixi.js';
import type { Game } from '../../Game';
import { isInSpike } from '@core/Physics';
import type { Player } from '@entities/Player';
import { Spike } from '@entities/Spike';
import type { ScreenFlash } from '@effects/ScreenFlash';
import type { LdtkLevel } from '@level/LdtkLoader';
import { rumbleGamepad } from '@utils/GamepadRumble';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { HUD } from '@ui/HUD';
import type { WorldSpikeRegistry } from './WorldSpikeRegistry';

interface WorldSpikeRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getEntityLayer: () => Container;
  getRegistry: () => WorldSpikeRegistry;
  getHud: () => HUD;
  getScreenFlash: () => ScreenFlash;
  getDamageNumbers: () => DamageNumberManager;
}

export class WorldSpikeRuntime {
  constructor(private readonly deps: WorldSpikeRuntimeDeps) {}

  spawn(level: LdtkLevel): void {
    const registry = this.deps.getRegistry();
    registry.clear();

    const spikeEntities = level.entities.filter(entity => entity.type === 'Spike');
    for (const entity of spikeEntities) {
      const spike = new Spike(entity.px[0], entity.px[1], entity.width, entity.height);
      registry.add(spike, this.deps.getEntityLayer());
    }
  }

  checkContact(): void {
    const player = this.deps.getPlayer();
    if (player.invincible || player.hp <= 0) return;

    const inTileSpike = isInSpike(player.x, player.y, player.width, player.height, player.roomData);
    const playerBox = { x: player.x, y: player.y, width: player.width, height: player.height };
    const inEntitySpike = this.deps.getRegistry().overlapsAabb(playerBox);
    if (!inTileSpike && !inEntitySpike) return;

    const damage = Math.max(1, Math.floor(player.maxHp * 0.2));
    player.lastDamageSource = 'spike';
    player.hp -= damage;
    this.deps.getHud().flashDamage();
    player.invincible = true;
    player.invincibleTimer = 1000;

    this.deps.game.hitstopFrames = 16;
    this.deps.game.camera.shake(5);
    rumbleGamepad(160, 0.55, 1.0);
    this.deps.getScreenFlash().flashDamage(true);
    player.triggerFlash();
    this.deps.getDamageNumbers().spawn(
      player.x + player.width / 2,
      player.y - 8,
      damage,
      true,
    );

    player.x = player.lastSafeX;
    player.y = player.lastSafeY;
    player.vx = 0;
    player.vy = 0;
    player.savePrevPosition();

    if (player.hp <= 0) {
      player.hp = 0;
      player.onDeath();
      this.deps.game.hitstopFrames = 8;
      this.deps.getScreenFlash().flashDamage(true);
    }
  }
}
