import type { Container } from 'pixi.js';
import type { Game } from '../../Game';
import { aabbOverlap } from '@core/Physics';
import { SFX } from '@audio/Sfx';
import { BreakableProp } from '@entities/BreakableProp';
import { GoldPickup } from '@entities/GoldPickup';
import type { Player } from '@entities/Player';
import type { HitSparkManager } from '@effects/HitSpark';
import type { PropShatterManager } from '@effects/PropShatter';
import type { LdtkLevel } from '@level/LdtkLoader';
import { spawnBreakableProps } from '@systems/BreakablePropSpawner';
import { getActivePlayerAttackHitbox } from '@systems/PlayerAttackHitbox';
import type { TileMutator } from '@systems/TileMutator';
import { hashString } from '@level/ProceduralDecorator';
import type { WorldBreakablePropRegistry } from './WorldBreakablePropRegistry';

export type WorldBreakablePropDestroySource = 'sword' | 'fire';

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

  private destroyWithEffects(prop: BreakableProp, source: WorldBreakablePropDestroySource): void {
    const player = this.deps.getPlayer();
    const drop = prop.break();
    if (source === 'sword') {
      this.deps.game.hitstopFrames += 4;
      this.deps.game.camera.shake(4);
    }

    this.deps.getPropShatter().spawn(
      prop.x,
      prop.y,
      prop.width,
      prop.height,
      prop.getParticleColor(),
      prop.getAccentColor(),
      prop.getArtifactTexture(),
    );
    SFX.play('breakable_destroy', 0, { speed: 1 / (1 + Math.random() * 0.5) });

    if (source === 'sword') {
      this.deps.getHitSparks().spawn(
        prop.x + prop.width / 2,
        prop.y + prop.height / 2,
        false,
        player.facingRight ? 1 : -1,
      );
    }

    if (drop.type === 'gold' && drop.amount > 0) {
      const burstX = prop.x + prop.width / 2 - 8;
      const burstY = prop.y + prop.height;
      for (const pickup of GoldPickup.spawnBurst(burstX, burstY, drop.amount)) {
        pickup.roomData = this.deps.getCollisionGrid();
        this.deps.addGoldPickup(pickup);
      }
    } else if (drop.type === 'flask') {
      player.flaskCharges = Math.min(player.flaskCharges + 1, player.flaskMaxCharges);
    }
  }

  private buildLevelExclusion(level: LdtkLevel): Set<string> {
    const exclude = new Set<string>();
    const radius = 8;
    const addRadius = (col: number, row: number) => {
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          exclude.add(`${col + dc},${row + dr}`);
        }
      }
    };

    for (const entity of level.entities) {
      if (entity.type === 'GameSaver' || entity.type === 'Player') {
        addRadius(Math.floor(entity.px[0] / 16), Math.floor(entity.px[1] / 16));
      }
    }

    const grid = this.deps.getCollisionGrid();
    const cols = grid[0]?.length ?? 0;
    const rows = grid.length;
    const leftPassage = this.deps.findEdgePassage(grid, 'left', -1);
    if (leftPassage >= 0) addRadius(0, leftPassage);
    const rightPassage = this.deps.findEdgePassage(grid, 'right', -1);
    if (rightPassage >= 0) addRadius(cols - 1, rightPassage);
    const upPassage = this.deps.findEdgePassage(grid, 'up', -1);
    if (upPassage >= 0) addRadius(upPassage, 0);
    const downPassage = this.deps.findEdgePassage(grid, 'down', -1);
    if (downPassage >= 0) addRadius(downPassage, rows - 1);

    return exclude;
  }
}
