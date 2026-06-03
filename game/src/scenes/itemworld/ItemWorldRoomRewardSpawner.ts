import { GoldPickup } from '@entities/GoldPickup';
import { HealingPickup, createForgeEmber } from '@entities/HealingPickup';
import type { ItemInstance } from '@items/ItemInstance';
import type { UnifiedGridData } from '@level/RoomGrid';
import type { LdtkLevel } from '@level/LdtkLoader';
import { PRNG } from '@utils/PRNG';
import { TILE_SIZE } from './ItemWorldMapController';

interface ItemWorldRoomRewardSpawnerDeps {
  getUnifiedGrid: () => UnifiedGridData;
  getItem: () => ItemInstance;
  getPlayerMaxHp: () => number;
  getRoomData: () => number[][];
  addHealingPickup: (pickup: HealingPickup) => void;
  addGoldPickup: (pickup: GoldPickup) => void;
}

const RARITY_MUL: Record<string, number> = {
  normal: 1.0,
  magic: 1.3,
  rare: 1.6,
  legendary: 2.0,
  ancient: 2.5,
};

export class ItemWorldRoomRewardSpawner {
  private readonly roomItemSpawners: Map<string, Array<{ x: number; y: number }>> = new Map();

  constructor(private readonly deps: ItemWorldRoomRewardSpawnerDeps) {}

  clearSpawnerPoints(): void {
    this.roomItemSpawners.clear();
  }

  captureSpawnersForRoom(
    ldtkLevel: LdtkLevel,
    col: number,
    absRow: number,
    roomX: number,
    roomY: number,
  ): void {
    const offGx = roomX / TILE_SIZE;
    const offGy = roomY / TILE_SIZE;
    const list: Array<{ x: number; y: number }> = [];
    for (const ent of ldtkLevel.entities) {
      if (ent.type !== 'ItemSpawner') continue;
      const sx = (ent.grid[0] + offGx) * TILE_SIZE;
      const sy = (ent.grid[1] + offGy) * TILE_SIZE;
      list.push({ x: sx, y: sy });
    }

    const key = `${col}:${absRow}`;
    if (list.length > 0) {
      this.roomItemSpawners.set(key, list);
    } else {
      this.roomItemSpawners.delete(key);
    }
  }

  spawnForRoom(col: number, row: number): void {
    const list = this.roomItemSpawners.get(`${col}:${row}`);
    if (!list || list.length === 0) return;

    const item = this.deps.getItem();
    const rarityMul = RARITY_MUL[item.rarity] ?? 1.0;
    const cell = this.deps.getUnifiedGrid().cells[row]?.[col];
    const stratumDepth = cell?.stratumIndex ?? 0;
    const depthMul = 1 + stratumDepth * 0.2;

    const rng = new PRNG(item.uid * 999 + col * 77 + row * 33 + 7777);
    for (const point of list) {
      if (rng.next() < 0.5) {
        this.spawnGold(point.x, point.y, rarityMul, depthMul, rng);
      } else {
        this.spawnHealing(point.x, point.y, rarityMul, rng);
      }
    }
  }

  private spawnGold(x: number, y: number, rarityMul: number, depthMul: number, rng: PRNG): void {
    const goldBase = 50 + rng.nextInt(0, 100);
    const goldAmount = Math.max(1, Math.floor(goldBase * rarityMul * depthMul));
    const pickup = new GoldPickup(x, y, goldAmount);
    pickup.enableTerrainPhysics(this.deps.getRoomData());
    this.deps.addGoldPickup(pickup);
  }

  private spawnHealing(x: number, y: number, rarityMul: number, rng: PRNG): void {
    const maxHp = this.deps.getPlayerMaxHp();
    const pickup = createForgeEmber(x, y, maxHp);
    this.deps.addHealingPickup(pickup);

    if (rarityMul >= 2.0 && rng.next() < 0.5) {
      const bonusPickup = createForgeEmber(x + 8, y, maxHp);
      this.deps.addHealingPickup(bonusPickup);
    }
  }
}
