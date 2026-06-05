import type { Container } from 'pixi.js';
import type { Game } from '../../Game';
import { aabbOverlap } from '@core/Physics';
import type { Player } from '@entities/Player';
import { Breakable } from '@entities/Breakable';
import type { GoldPickup } from '@entities/GoldPickup';
import { applyBreakableDrop } from '@scenes/shared/BreakableDropHelpers';
import { applyBreakableDestroyFeedback } from '@scenes/shared/BreakableFeedbackHelpers';
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
      applyBreakableDestroyFeedback({
        prop: breakable,
        source: 'sword',
        player,
        game: this.deps.game,
        propShatter: this.deps.getPropShatter(),
        hitSparks: this.deps.getHitSparks(),
      });

      applyBreakableDrop({
        prop: breakable,
        drop,
        player,
        collisionGrid: this.deps.getCollisionGrid(),
        addGoldPickup: this.deps.addGoldPickup,
      });

      this.deps.getRegistry().removeAt(i);
    }
  }
}
