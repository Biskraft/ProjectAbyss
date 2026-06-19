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
import { applyPlayerSpikeHitFeedback } from '@scenes/shared/TileHazardRuntimeHelpers';

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

    const playerBox = player.getHurtAABB();
    const inTileSpike = isInSpike(playerBox.x, playerBox.y, playerBox.width, playerBox.height, player.roomData);
    const inEntitySpike = this.deps.getRegistry().overlapsAabb(playerBox);
    if (!inTileSpike && !inEntitySpike) return;

    applyPlayerSpikeHitFeedback({
      player,
      game: this.deps.game,
      hud: this.deps.getHud(),
      damageNumbers: this.deps.getDamageNumbers(),
      screenFlash: this.deps.getScreenFlash(),
      setDeathHitstopFrames: (frames) => {
        this.deps.game.hitstopFrames = frames;
      },
      onRumble: () => {
        rumbleGamepad(160, 0.55, 1.0);
      },
    });
  }
}
