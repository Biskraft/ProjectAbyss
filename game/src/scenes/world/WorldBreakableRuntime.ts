import type { Container } from 'pixi.js';
import type { Game } from '../../Game';
import { aabbOverlap } from '@core/Physics';
import { SFX } from '@audio/Sfx';
import type { Player } from '@entities/Player';
import { Breakable } from '@entities/Breakable';
import { GoldPickup } from '@entities/GoldPickup';
import type { HitSparkManager } from '@effects/HitSpark';
import type { PropShatterManager } from '@effects/PropShatter';
import type { LdtkLevel } from '@level/LdtkLoader';
import { getActivePlayerAttackHitbox } from '@systems/PlayerAttackHitbox';
import type { WorldBreakableRegistry } from './WorldBreakableRegistry';

interface WorldBreakableRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getCollisionGrid: () => number[][];
  getEntityLayer: () => Container;
  getRegistry: () => WorldBreakableRegistry;
  getPropShatter: () => PropShatterManager;
  getHitSparks: () => HitSparkManager;
  addGoldPickup: (pickup: GoldPickup) => void;
}

export class WorldBreakableRuntime {
  constructor(private readonly deps: WorldBreakableRuntimeDeps) {}

  spawn(level: LdtkLevel): void {
    const registry = this.deps.getRegistry();
    registry.clear();

    const layer = this.deps.getEntityLayer();
    const playerContainer = this.deps.getPlayer().container;
    const entities = level.entities.filter(entity => entity.type === 'Breakable');
    for (const entity of entities) {
      const rawSprite = (entity.fields['Sprite'] ?? entity.fields['sprite']) as string | undefined;
      const spriteName = rawSprite && rawSprite.length > 0 ? rawSprite : 'signboard_save_01';
      const breakable = new Breakable(entity.px[0], entity.px[1], spriteName);
      registry.add(breakable);
      // Insert behind the player so the character is never hidden by the prop.
      const playerIdx = layer.children.indexOf(playerContainer);
      layer.addChildAt(breakable.container, playerIdx >= 0 ? playerIdx : 0);
    }
  }

  update(dt: number): void {
    this.deps.getRegistry().update(dt);
  }

  checkAttack(): void {
    const player = this.deps.getPlayer();
    const hitbox = getActivePlayerAttackHitbox(player);
    if (!hitbox) return;

    const breakables = this.deps.getRegistry().breakables;
    for (let i = breakables.length - 1; i >= 0; i--) {
      const breakable = breakables[i];
      if (breakable.destroyed) continue;
      if (breakable.width === 0) continue;
      if (!aabbOverlap(hitbox, breakable.getAABB())) continue;

      const drop = breakable.break();
      this.deps.game.hitstopFrames += 4;
      this.deps.game.camera.shake(4);
      this.deps.getPropShatter().spawn(
        breakable.x,
        breakable.y,
        breakable.width,
        breakable.height,
        breakable.getParticleColor(),
        breakable.getAccentColor(),
        breakable.getArtifactTexture(),
      );
      SFX.play('breakable_destroy', 0, { speed: 1 / (1 + Math.random() * 0.5) });
      this.deps.getHitSparks().spawn(
        breakable.x + breakable.width / 2,
        breakable.y + breakable.height / 2,
        false,
        player.facingRight ? 1 : -1,
      );

      if (drop.type === 'gold' && drop.amount > 0) {
        const burstX = breakable.x + breakable.width / 2 - 8;
        const burstY = breakable.y + breakable.height;
        for (const pickup of GoldPickup.spawnBurst(burstX, burstY, drop.amount)) {
          pickup.roomData = this.deps.getCollisionGrid();
          this.deps.addGoldPickup(pickup);
        }
      } else if (drop.type === 'flask') {
        player.flaskCharges = Math.min(player.flaskCharges + 1, player.flaskMaxCharges);
      }

      this.deps.getRegistry().removeAt(i);
    }
  }
}
