import { EGO_SHARD_MAX, type Player } from '@entities/Player';
import type { ShardElement } from '@effects/EgoShard';
import type { EgoShardRuntime } from '@effects/EgoShardRuntime';

const TILE_SIZE = 16;
const RETRIEVE_PAD = 24;
const SOLID_SHARD_TILES = new Set([1, 7, 9, 12, 15]);

interface UpdateEgoShardProjectilesInput {
  dtMs: number;
  player: Player;
  collisionGrid: number[][];
  egoShardRuntime: EgoShardRuntime;
  onImpact: (x: number, y: number, element: ShardElement) => void;
  checkHit: (x: number, y: number, element: ShardElement) => boolean;
  flushContainerFluidChanges: () => void;
}

export interface EgoShardProjectileRuntimeDeps {
  getPlayer: () => Player;
  getCollisionGrid: () => number[][];
  getEgoShardRuntime: () => EgoShardRuntime;
  onImpact: (x: number, y: number, element: ShardElement) => void;
  checkHit: (x: number, y: number, element: ShardElement) => boolean;
  flushContainerFluidChanges: () => void;
}

export class EgoShardProjectileRuntimeAdapter {
  constructor(private readonly deps: EgoShardProjectileRuntimeDeps) {}

  update(dtMs: number): void {
    updateEgoShardProjectileRuntime(this.deps, dtMs);
  }
}

export function updateEgoShardProjectiles(input: UpdateEgoShardProjectilesInput): void {
  input.egoShardRuntime.update(
    input.dtMs,
    (info) => input.onImpact(info.x, info.y, info.element),
    (x, y) => isEgoShardSolidAt(input.collisionGrid, x, y),
    input.checkHit,
  );
  input.flushContainerFluidChanges();
  retrieveEgoShardsNearPlayer(input.egoShardRuntime, input.player);
}

export function updateEgoShardProjectileRuntime(
  deps: EgoShardProjectileRuntimeDeps,
  dtMs: number,
): void {
  updateEgoShardProjectiles({
    dtMs,
    player: deps.getPlayer(),
    collisionGrid: deps.getCollisionGrid(),
    egoShardRuntime: deps.getEgoShardRuntime(),
    onImpact: deps.onImpact,
    checkHit: deps.checkHit,
    flushContainerFluidChanges: deps.flushContainerFluidChanges,
  });
}

export function isEgoShardSolidAt(collisionGrid: number[][], x: number, y: number): boolean {
  const gx = Math.floor(x / TILE_SIZE);
  const gy = Math.floor(y / TILE_SIZE);
  const tile = collisionGrid[gy]?.[gx] ?? 0;
  return SOLID_SHARD_TILES.has(tile);
}

export function retrieveEgoShardsNearPlayer(egoShardRuntime: EgoShardRuntime, player: Player): void {
  const retrieved = egoShardRuntime.retrieveInAABB(
    player.x - RETRIEVE_PAD,
    player.y - RETRIEVE_PAD,
    player.width + RETRIEVE_PAD * 2,
    player.height + RETRIEVE_PAD * 2,
  );
  for (let i = 0; i < retrieved; i++) {
    removeLongestRecoveryCooldown(player);
    player.egoShardCount = Math.min(player.egoShardCount + 1, EGO_SHARD_MAX);
  }
}

function removeLongestRecoveryCooldown(player: Player): void {
  const cooldowns = player.shardCooldowns;
  if (cooldowns.length === 0) return;

  let maxIdx = 0;
  for (let i = 1; i < cooldowns.length; i++) {
    if (cooldowns[i] > cooldowns[maxIdx]) maxIdx = i;
  }
  cooldowns.splice(maxIdx, 1);
}
