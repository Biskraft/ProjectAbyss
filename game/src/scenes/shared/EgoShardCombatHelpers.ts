import type { ElementAffinity } from '@combat/ElementAffinity';
import type { Enemy } from '@entities/Enemy';
import type { Player } from '@entities/Player';
import type { ThrowableContainer } from '@entities/ThrowableContainer';
import type { ShardElement } from '@effects/EgoShard';
import type { HitSparkManager } from '@effects/HitSpark';
import type { TileMutator } from '@systems/TileMutator';
import type { DamageNumberManager } from '@ui/DamageNumber';

const TILE_SIZE = 16;

export interface EgoShardCombatDeps {
  player: Player;
  enemies: readonly Enemy<string>[];
  containers: readonly ThrowableContainer[];
  collisionGrid: number[][];
  tileMutator: TileMutator;
  damageNumbers: DamageNumberManager;
  hitSparks: HitSparkManager;
  retrieveShardsInAABB: (x: number, y: number, width: number, height: number) => number;
  paintContainerImpact: (kind: ThrowableContainer['kind'], gx: number, gy: number, volume: number) => void;
  destroyContainerWithVFX: (container: ThrowableContainer) => void;
  removeContainerAt: (index: number) => void;
}

export interface EgoShardCombatRuntimeDeps {
  getPlayer: () => Player;
  getEnemies: () => readonly Enemy<string>[];
  getContainers: () => readonly ThrowableContainer[];
  getCollisionGrid: () => number[][];
  getTileMutator: () => TileMutator;
  getDamageNumbers: () => DamageNumberManager;
  getHitSparks: () => HitSparkManager;
  retrieveShardsInAABB: (x: number, y: number, width: number, height: number) => number;
  paintContainerImpact: (kind: ThrowableContainer['kind'], gx: number, gy: number, volume: number) => void;
  destroyContainerWithVFX: (container: ThrowableContainer) => void;
  removeContainerAt: (index: number) => void;
}

export class EgoShardCombatRuntimeAdapter {
  constructor(private readonly deps: EgoShardCombatRuntimeDeps) {}

  checkHit(x: number, y: number, element: ShardElement): boolean {
    return checkEgoShardCombatRuntimeHit(this.deps, x, y, element);
  }
}

export function checkEgoShardCombatRuntimeHit(
  deps: EgoShardCombatRuntimeDeps,
  x: number,
  y: number,
  element: ShardElement,
): boolean {
  return checkEgoShardCombatHit({
    player: deps.getPlayer(),
    enemies: deps.getEnemies(),
    containers: deps.getContainers(),
    collisionGrid: deps.getCollisionGrid(),
    tileMutator: deps.getTileMutator(),
    damageNumbers: deps.getDamageNumbers(),
    hitSparks: deps.getHitSparks(),
    retrieveShardsInAABB: deps.retrieveShardsInAABB,
    paintContainerImpact: deps.paintContainerImpact,
    destroyContainerWithVFX: deps.destroyContainerWithVFX,
    removeContainerAt: deps.removeContainerAt,
  }, x, y, element);
}

export function checkEgoShardCombatHit(
  deps: EgoShardCombatDeps,
  x: number,
  y: number,
  element: ShardElement,
): boolean {
  return checkEnemyHit(deps, x, y, element) || checkContainerHit(deps, x, y);
}

function checkContainerHit(deps: EgoShardCombatDeps, x: number, y: number): boolean {
  const { containers } = deps;
  for (let i = containers.length - 1; i >= 0; i--) {
    const container = containers[i];
    if (container.destroyed || container.held) continue;
    if (x < container.colX || x > container.colX + container.colW) continue;
    if (y < container.colY || y > container.colY + container.colH) continue;

    if (container.kind === 'MetalCrate') {
      if (tryShatterBrittleMetalCrate(deps, container, i)) return true;
      spawnContainerSpark(deps.hitSparks, container);
      return true;
    }

    const impact = container.takeAttack(Math.max(2, Math.floor(deps.player.atk * 0.6)));
    spawnContainerSpark(deps.hitSparks, container);
    if (impact) {
      deps.paintContainerImpact(container.kind, impact.gx, impact.gy, container.fluidVolume);
      deps.destroyContainerWithVFX(container);
      deps.removeContainerAt(i);
    }
    return true;
  }
  return false;
}

function tryShatterBrittleMetalCrate(
  deps: EgoShardCombatDeps,
  container: ThrowableContainer,
  index: number,
): boolean {
  const left = Math.floor(container.colX / TILE_SIZE);
  const right = Math.floor((container.colX + container.colW - 1) / TILE_SIZE);
  const bottom = Math.floor((container.colY + container.colH - 1) / TILE_SIZE);

  let brittle = false;
  for (let gx = left; gx <= right; gx++) {
    const below = deps.collisionGrid[bottom + 1]?.[gx];
    if (below === 7 || deps.tileMutator.isFrozen(gx, bottom + 1)) {
      brittle = true;
      break;
    }
  }
  if (!brittle) return false;

  const impact = container.shatterBrittle();
  spawnContainerSpark(deps.hitSparks, container);
  if (impact) {
    deps.destroyContainerWithVFX(container);
    deps.removeContainerAt(index);
  }
  return true;
}

function checkEnemyHit(
  deps: EgoShardCombatDeps,
  x: number,
  y: number,
  element: ShardElement,
): boolean {
  const { player } = deps;
  for (const enemy of deps.enemies) {
    if (!enemy.alive) continue;
    if (x < enemy.x || x > enemy.x + enemy.width || y < enemy.y || y > enemy.y + enemy.height) continue;

    const elemMult = enemy.elementMultiplier(element as ElementAffinity);
    const baseDmg = Math.max(1, Math.floor(player.atk * 0.6 * elemMult));
    if (elemMult > 0) enemy.hp -= baseDmg;
    enemy.onHit(player.facingRight ? 60 : -60, -40, 160);
    deps.damageNumbers.spawn(enemy.x + enemy.width / 2, enemy.y - 8, baseDmg, false);
    deps.hitSparks.spawn(x, y, false, 0);

    if (element === 'fire' && elemMult > 0) {
      enemy.burnRemainingMs = Math.max(enemy.burnRemainingMs ?? 0, 8000);
    } else if (element === 'ice' && elemMult > 0) {
      enemy.frozenRemainingMs = Math.max(enemy.frozenRemainingMs ?? 0, 2000);
    } else if (element === 'thunder' && elemMult > 0) {
      enemy.hp -= Math.max(1, Math.floor(player.atk * 0.4 * elemMult));
      applyThunderChainAroundEnemy(deps, enemy, player);
    }

    if (enemy.hp <= 0) {
      enemy.hp = 0;
      enemy.onDeath();
      const retrieved = deps.retrieveShardsInAABB(enemy.x, enemy.y, enemy.width, enemy.height);
      if (retrieved > 0) {
        player.egoShardCount = Math.min(player.egoShardCount + retrieved, 99);
      }
    }
    return true;
  }
  return false;
}

function applyThunderChainAroundEnemy(
  deps: EgoShardCombatDeps,
  enemy: Enemy<string>,
  player: Player,
): void {
  const room = player.roomData;
  if (!room) return;

  const anchorX = Math.round((enemy.x + enemy.width / 2) / TILE_SIZE);
  const anchorY = Math.round((enemy.y + enemy.height / 2) / TILE_SIZE);
  const chainCells: Array<[number, number]> = [
    [anchorX - 1, anchorY - 1],
    [anchorX, anchorY - 1],
    [anchorX - 1, anchorY],
    [anchorX, anchorY],
  ];
  for (const [gx, gy] of chainCells) {
    if (deps.tileMutator.isElectric(gx, gy)) continue;
    deps.tileMutator.applyThunderChain(room, gx, gy);
  }
}

function spawnContainerSpark(hitSparks: HitSparkManager, container: ThrowableContainer): void {
  hitSparks.spawn(
    container.colX + container.colW / 2,
    container.colY + container.colH / 2,
    true,
    0,
  );
}
