import type { ElementAffinity } from '@combat/ElementAffinity';
import type { Enemy } from '@entities/Enemy';
import type { Player } from '@entities/Player';
import type { ThrowableContainer } from '@entities/ThrowableContainer';
import type { EgoShardManager, ShardElement } from '@effects/EgoShard';
import type { HitSparkManager } from '@effects/HitSpark';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { TileMutator } from '@systems/TileMutator';

const TILE_SIZE = 16;

interface ItemWorldEgoShardCombatRuntimeDeps {
  getPlayer: () => Player;
  getEnemies: () => Enemy<string>[];
  getContainers: () => ThrowableContainer[];
  getFullGrid: () => number[][];
  getTileMutator: () => TileMutator;
  getShardManager: () => EgoShardManager;
  getDamageNumbers: () => DamageNumberManager;
  getHitSparks: () => HitSparkManager;
  paintContainerImpact: (kind: ThrowableContainer['kind'], gx: number, gy: number, volume: number) => void;
  destroyContainerWithVFX: (container: ThrowableContainer) => void;
}

export class ItemWorldEgoShardCombatRuntime {
  constructor(private readonly deps: ItemWorldEgoShardCombatRuntimeDeps) {}

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
        containers.splice(i, 1);
      }
      return true;
    }
    return false;
  }

  private tryShatterBrittleMetalCrate(container: ThrowableContainer, index: number): boolean {
    const left = Math.floor(container.colX / TILE_SIZE);
    const right = Math.floor((container.colX + container.colW - 1) / TILE_SIZE);
    const bottom = Math.floor((container.colY + container.colH - 1) / TILE_SIZE);
    let brittle = false;

    for (let gx = left; gx <= right; gx++) {
      const below = this.deps.getFullGrid()[bottom + 1]?.[gx];
      if (below === 7 || this.deps.getTileMutator().isFrozen(gx, bottom + 1)) {
        brittle = true;
        break;
      }
    }
    if (!brittle) return false;

    const impact = container.shatterBrittle();
    this.spawnContainerSpark(container);
    if (impact) {
      this.deps.destroyContainerWithVFX(container);
      this.deps.getContainers().splice(index, 1);
    }
    return true;
  }

  private spawnContainerSpark(container: ThrowableContainer): void {
    this.deps.getHitSparks().spawn(
      container.colX + container.colW / 2,
      container.colY + container.colH / 2,
      true,
      0,
    );
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
        this.applyThunderChainAroundEnemy(enemy);
      }

      if (enemy.hp <= 0) {
        enemy.hp = 0;
        enemy.onDeath();
        const retrieved = this.deps.getShardManager().retrieveInAABB(enemy.x, enemy.y, enemy.width, enemy.height);
        if (retrieved > 0) {
          player.egoShardCount = Math.min(player.egoShardCount + retrieved, 99);
        }
      }
      return true;
    }
    return false;
  }

  private applyThunderChainAroundEnemy(enemy: Enemy<string>): void {
    const grid = this.deps.getFullGrid();
    if (!grid?.length) return;

    const gx = Math.floor((enemy.x + enemy.width / 2) / TILE_SIZE);
    const gy = Math.floor((enemy.y + enemy.height / 2) / TILE_SIZE);
    const tileMutator = this.deps.getTileMutator();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (tileMutator.isElectric(nx, ny)) continue;
        tileMutator.applyThunderChain(grid, nx, ny);
      }
    }
  }
}
