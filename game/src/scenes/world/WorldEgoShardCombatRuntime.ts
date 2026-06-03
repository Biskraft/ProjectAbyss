import type { ElementAffinity } from '@combat/ElementAffinity';
import type { Enemy } from '@entities/Enemy';
import type { Player } from '@entities/Player';
import type { ThrowableContainer } from '@entities/ThrowableContainer';
import type { ShardElement } from '@effects/EgoShard';
import type { HitSparkManager } from '@effects/HitSpark';
import type { TileMutator } from '@systems/TileMutator';
import type { DamageNumberManager } from '@ui/DamageNumber';

const TILE_SIZE = 16;

interface WorldEgoShardCombatRuntimeDeps {
  getPlayer: () => Player;
  getEnemies: () => Enemy<string>[];
  getContainers: () => ThrowableContainer[];
  getCollisionGrid: () => number[][];
  getTileMutator: () => TileMutator;
  getDamageNumbers: () => DamageNumberManager;
  getHitSparks: () => HitSparkManager;
  retrieveShardsInAABB: (x: number, y: number, width: number, height: number) => number;
  paintContainerImpact: (kind: ThrowableContainer['kind'], gx: number, gy: number, volume: number) => void;
  destroyContainerWithVFX: (container: ThrowableContainer) => void;
  removeContainerAt: (index: number) => void;
}

export class WorldEgoShardCombatRuntime {
  constructor(private readonly deps: WorldEgoShardCombatRuntimeDeps) {}

  checkHit(x: number, y: number, element: ShardElement): boolean {
    return this.checkEnemyHit(x, y, element) || this.checkContainerHit(x, y);
  }

  private checkContainerHit(x: number, y: number): boolean {
    const containers = this.deps.getContainers();
    for (let i = containers.length - 1; i >= 0; i--) {
      const container = containers[i];
      if (container.destroyed || container.held) continue;
      if (x < container.colX || x > container.colX + container.colW) continue;
      if (y < container.colY || y > container.colY + container.colH) continue;

      if (container.kind === 'MetalCrate') {
        if (this.tryShatterBrittleMetalCrate(container, i)) return true;
        this.spawnContainerSpark(container);
        return true;
      }

      const impact = container.takeAttack(Math.max(2, Math.floor(this.deps.getPlayer().atk * 0.6)));
      this.spawnContainerSpark(container);
      if (impact) {
        this.deps.paintContainerImpact(container.kind, impact.gx, impact.gy, container.fluidVolume);
        this.deps.destroyContainerWithVFX(container);
        this.deps.removeContainerAt(i);
      }
      return true;
    }
    return false;
  }

  private tryShatterBrittleMetalCrate(container: ThrowableContainer, index: number): boolean {
    const left = Math.floor(container.colX / TILE_SIZE);
    const right = Math.floor((container.colX + container.colW - 1) / TILE_SIZE);
    const bottom = Math.floor((container.colY + container.colH - 1) / TILE_SIZE);
    const grid = this.deps.getCollisionGrid();
    const tileMutator = this.deps.getTileMutator();

    let brittle = false;
    for (let gx = left; gx <= right; gx++) {
      const below = grid[bottom + 1]?.[gx];
      if (below === 7 || tileMutator.isFrozen(gx, bottom + 1)) {
        brittle = true;
        break;
      }
    }
    if (!brittle) return false;

    const impact = container.shatterBrittle();
    this.spawnContainerSpark(container);
    if (impact) {
      this.deps.destroyContainerWithVFX(container);
      this.deps.removeContainerAt(index);
    }
    return true;
  }

  private checkEnemyHit(x: number, y: number, element: ShardElement): boolean {
    const player = this.deps.getPlayer();
    for (const enemy of this.deps.getEnemies()) {
      if (!enemy.alive) continue;
      if (x < enemy.x || x > enemy.x + enemy.width || y < enemy.y || y > enemy.y + enemy.height) continue;

      const elemMult = enemy.elementMultiplier(element as ElementAffinity);
      const baseDmg = Math.max(1, Math.floor(player.atk * 0.6 * elemMult));
      if (elemMult > 0) enemy.hp -= baseDmg;
      enemy.onHit(player.facingRight ? 60 : -60, -40, 160);
      this.deps.getDamageNumbers().spawn(enemy.x + enemy.width / 2, enemy.y - 8, baseDmg, false);
      this.deps.getHitSparks().spawn(x, y, false, 0);

      if (element === 'fire' && elemMult > 0) {
        enemy.burnRemainingMs = Math.max(enemy.burnRemainingMs ?? 0, 8000);
      } else if (element === 'ice' && elemMult > 0) {
        enemy.frozenRemainingMs = Math.max(enemy.frozenRemainingMs ?? 0, 2000);
      } else if (element === 'thunder' && elemMult > 0) {
        enemy.hp -= Math.max(1, Math.floor(player.atk * 0.4 * elemMult));
        this.applyThunderChainAroundEnemy(enemy, player);
      }

      if (enemy.hp <= 0) {
        enemy.hp = 0;
        enemy.onDeath();
        const retrieved = this.deps.retrieveShardsInAABB(enemy.x, enemy.y, enemy.width, enemy.height);
        if (retrieved > 0) {
          player.egoShardCount = Math.min(player.egoShardCount + retrieved, 99);
        }
      }
      return true;
    }
    return false;
  }

  private applyThunderChainAroundEnemy(enemy: Enemy<string>, player: Player): void {
    const room = player.roomData;
    if (!room) return;

    const anchorX = Math.round((enemy.x + enemy.width / 2) / TILE_SIZE);
    const anchorY = Math.round((enemy.y + enemy.height / 2) / TILE_SIZE);
    const tileMutator = this.deps.getTileMutator();
    const chainCells: Array<[number, number]> = [
      [anchorX - 1, anchorY - 1], [anchorX, anchorY - 1],
      [anchorX - 1, anchorY],     [anchorX, anchorY],
    ];
    for (const [gx, gy] of chainCells) {
      if (tileMutator.isElectric(gx, gy)) continue;
      tileMutator.applyThunderChain(room, gx, gy);
    }
  }

  private spawnContainerSpark(container: ThrowableContainer): void {
    this.deps.getHitSparks().spawn(
      container.colX + container.colW / 2,
      container.colY + container.colH / 2,
      true,
      0,
    );
  }
}
