import type { Container } from 'pixi.js';
import type { Game } from '../../Game';
import { aabbOverlap } from '@core/Physics';
import { BreakableProp } from '@entities/BreakableProp';
import type { GoldPickup } from '@entities/GoldPickup';
import type { BreakableDestroySource } from '@scenes/shared/BreakableFeedbackHelpers';
import { applyBreakablePropBreakConsequences } from '@scenes/shared/BreakablePropDestructionHelpers';
import type { Player } from '@entities/Player';
import type { HitSparkManager } from '@effects/HitSpark';
import type { PropShatterManager } from '@effects/PropShatter';
import type { LdtkLevel } from '@level/LdtkLoader';
import { spawnBreakableProps } from '@systems/BreakablePropSpawner';
import { getActivePlayerAttackHitbox } from '@systems/PlayerAttackHitbox';
import type { TileMutator } from '@systems/TileMutator';
import { hashString } from '@level/ProceduralDecorator';
import { addCellExclusionRadius } from '@scenes/shared/CellExclusionHelpers';
import type { WorldBreakablePropRegistry } from './WorldBreakablePropRegistry';

type EdgeDirection = 'left' | 'right' | 'up' | 'down';

interface WorldBreakablePropRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getCollisionGrid: () => number[][];
  getEntityLayer: () => Container;
  getRegistry: () => WorldBreakablePropRegistry;
  getTileMutator: () => TileMutator;
  getPropShatter: () => PropShatterManager;
  getHitSparks: () => HitSparkManager;
  findEdgePassage: (grid: number[][], direction: EdgeDirection, preferred: number) => number;
  addGoldPickup: (pickup: GoldPickup) => void;
}

export class WorldBreakablePropRuntime {
  constructor(private readonly deps: WorldBreakablePropRuntimeDeps) {}

  spawnForLevel(level: LdtkLevel): void {
    this.clearRegisteredProps();

    const exclude = this.buildLevelExclusion(level);
    const seed = hashString(`${level.identifier}_props`);
    const props = spawnBreakableProps(this.deps.getCollisionGrid(), seed, false, exclude);
    for (const prop of props) {
      this.deps.getTileMutator().registerBurnable(prop);
      this.deps.getRegistry().add(prop, this.deps.getEntityLayer());
    }
  }

  update(dt: number): void {
    this.deps.getRegistry().update(dt);
  }

  checkAttack(): void {
    const hitbox = getActivePlayerAttackHitbox(this.deps.getPlayer());
    if (!hitbox) return;

    const props = this.deps.getRegistry().props;
    for (let i = props.length - 1; i >= 0; i--) {
      const prop = props[i];
      if (prop.destroyed) continue;
      if (!aabbOverlap(hitbox, prop.getAABB())) continue;
      this.deps.getTileMutator().unregisterBurnable(prop);
      this.destroyWithEffects(prop, 'sword');
      this.deps.getRegistry().removeAt(i);
    }
  }

  cleanupBurnedOut(): void {
    const props = this.deps.getRegistry().props;
    for (let i = props.length - 1; i >= 0; i--) {
      const prop = props[i];
      if (prop.destroyed) {
        this.deps.getTileMutator().unregisterBurnable(prop);
        this.deps.getRegistry().removeAt(i);
        continue;
      }
      if (prop.burnedOut) {
        this.deps.getTileMutator().unregisterBurnable(prop);
        this.destroyWithEffects(prop, 'fire');
        this.deps.getRegistry().removeAt(i);
      }
    }
  }

  private clearRegisteredProps(): void {
    for (const prop of this.deps.getRegistry().props) {
      this.deps.getTileMutator().unregisterBurnable(prop);
    }
    this.deps.getRegistry().clear();
  }

  private destroyWithEffects(prop: BreakableProp, source: BreakableDestroySource): void {
    const player = this.deps.getPlayer();
    const drop = prop.break();
    applyBreakablePropBreakConsequences({
      prop,
      drop,
      source,
      player,
      game: this.deps.game,
      propShatter: this.deps.getPropShatter(),
      hitSparks: this.deps.getHitSparks(),
      collisionGrid: this.deps.getCollisionGrid(),
      addGoldPickup: this.deps.addGoldPickup,
    });
  }

  private buildLevelExclusion(level: LdtkLevel): Set<string> {
    const exclude = new Set<string>();
    const radius = 8;

    for (const entity of level.entities) {
      if (entity.type === 'GameSaver' || entity.type === 'Player') {
        addCellExclusionRadius(
          exclude,
          Math.floor(entity.px[0] / 16),
          Math.floor(entity.px[1] / 16),
          radius,
        );
      }
    }

    const grid = this.deps.getCollisionGrid();
    const cols = grid[0]?.length ?? 0;
    const rows = grid.length;
    const leftPassage = this.deps.findEdgePassage(grid, 'left', -1);
    if (leftPassage >= 0) addCellExclusionRadius(exclude, 0, leftPassage, radius);
    const rightPassage = this.deps.findEdgePassage(grid, 'right', -1);
    if (rightPassage >= 0) addCellExclusionRadius(exclude, cols - 1, rightPassage, radius);
    const upPassage = this.deps.findEdgePassage(grid, 'up', -1);
    if (upPassage >= 0) addCellExclusionRadius(exclude, upPassage, 0, radius);
    const downPassage = this.deps.findEdgePassage(grid, 'down', -1);
    if (downPassage >= 0) addCellExclusionRadius(exclude, downPassage, rows - 1, radius);

    return exclude;
  }
}
