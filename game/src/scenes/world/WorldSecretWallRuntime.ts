import type { Game } from '../../Game';
import { aabbOverlap } from '@core/Physics';
import { SecretWall } from '@entities/SecretWall';
import type { Player } from '@entities/Player';
import { ItemDropEntity } from '@items/ItemDrop';
import { createRandomRareOrBetterRewardItem } from '@items/ItemRewardFactory';
import { resolveItemDropSpawn } from '@items/DropSpawn';
import { getActivePlayerAttackHitbox } from '@systems/PlayerAttackHitbox';
import type { LdtkLevel } from '@level/LdtkLoader';
import type { LdtkRenderer } from '@level/LdtkRenderer';
import { t } from '@i18n';
import { trackSecretWallBreak } from '@utils/Analytics';
import { getWallRuntimeItemId, getWallRuntimeKey, setWallRuntimeItemId, setWallRuntimeKey } from '@entities/WallMetadata';
import type { WorldSecretWallRegistry } from './WorldSecretWallRegistry';

interface WorldSecretWallRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getCollisionGrid: () => number[][];
  getRenderer: () => LdtkRenderer;
  getRegistry: () => WorldSecretWallRegistry;
  getUnlockedEvents: () => Set<string>;
  getCurrentLevelId: () => string | undefined;
  addItemDrop: (drop: ItemDropEntity) => void;
  spawnFixedItem: (x: number, y: number, itemId: string) => void;
  showToast: (message: string, color: number) => void;
}

export class WorldSecretWallRuntime {
  constructor(private readonly deps: WorldSecretWallRuntimeDeps) {}

  spawn(level: LdtkLevel): void {
    const registry = this.deps.getRegistry();
    registry.clear();

    const entities = level.entities.filter(entity => entity.type === 'SecretWall');
    for (const entity of entities) {
      const key = `secret_${level.identifier}_${entity.px[0]}_${entity.px[1]}`;
      if (this.deps.getUnlockedEvents().has(key)) {
        this.clearUnlockedSecretWall(entity.px[0], entity.px[1], entity.width, entity.height);
        continue;
      }

      const mode = ((entity.fields['Mode'] ?? 'Item') as string).toLowerCase() as 'item' | 'passage';
      const hintAlpha = (entity.fields['HintAlpha'] as number) ?? 0.08;
      const rawItemId = (entity.fields['ItemId'] as string) ?? null;
      const itemId = rawItemId ? rawItemId.toLowerCase() : null;

      const wall = new SecretWall({
        x: entity.px[0],
        y: entity.px[1],
        width: entity.width,
        height: entity.height,
        mode,
        hintAlpha,
      });
      setWallRuntimeKey(wall, key);
      setWallRuntimeItemId(wall, itemId);
      wall.recordCollision(this.deps.getCollisionGrid());
      registry.add(wall, this.deps.getRenderer().wallLayer);
    }
  }

  checkAttack(): void {
    const player = this.deps.getPlayer();
    if (!player.isAttackActive()) return;

    const hitbox = getActivePlayerAttackHitbox(player);
    if (!hitbox) return;

    const dirX = (player.facingRight ?? true) ? 1 : -1;
    const walls = this.deps.getRegistry().walls;
    for (let i = walls.length - 1; i >= 0; i--) {
      const wall = walls[i];
      if (wall.destroyed) continue;
      if (!aabbOverlap(hitbox, wall.getHitAABB())) continue;

      if (wall.break(this.deps.getCollisionGrid(), this.deps.game, dirX)) {
        this.handleBrokenWall(wall, i);
      }
    }
  }

  private clearUnlockedSecretWall(x: number, y: number, width: number, height: number): void {
    const topLeftX = x;
    const topLeftY = y - height;
    const startCol = Math.floor(topLeftX / 16);
    const startRow = Math.floor(topLeftY / 16);
    const cols = Math.ceil(width / 16);
    const rows = Math.ceil(height / 16);
    const grid = this.deps.getCollisionGrid();
    const gridHeight = grid.length;
    const gridWidth = gridHeight > 0 ? grid[0].length : 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const gridRow = startRow + row;
        const gridCol = startCol + col;
        if (gridRow >= 0 && gridRow < gridHeight && gridCol >= 0 && gridCol < gridWidth) {
          grid[gridRow][gridCol] = 0;
        }
      }
    }

    this.deps.getRenderer().clearTilesInRect(topLeftX, topLeftY, width, height, { preserveInterior: true });
  }

  private handleBrokenWall(wall: SecretWall, index: number): void {
    const key = getWallRuntimeKey(wall);
    if (key) this.deps.getUnlockedEvents().add(key);

    trackSecretWallBreak({
      mode: wall.mode,
      level_id: this.deps.getCurrentLevelId(),
      item_id: wall.mode === 'item' ? getWallRuntimeItemId(wall) ?? undefined : undefined,
    });

    this.deps.getRenderer().clearTilesInRect(
      wall.x,
      wall.y,
      wall.width,
      wall.height,
      { preserveInterior: true },
    );

    if (wall.mode === 'item') {
      const itemId = getWallRuntimeItemId(wall);
      if (itemId) {
        this.deps.spawnFixedItem(wall.centerX, wall.centerY, itemId);
      } else {
        this.spawnRandomSecretWallWeapon(wall.centerX, wall.centerY);
      }
      this.deps.showToast(t('toast.secret_found'), 0xffd700);
    } else {
      this.deps.showToast(t('toast.path_opened'), 0x44ffaa);
    }

    this.deps.getRegistry().removeAt(index);
  }

  private spawnRandomSecretWallWeapon(x: number, y: number): void {
    const item = createRandomRareOrBetterRewardItem();
    const spawn = resolveItemDropSpawn(x, y, this.deps.getCollisionGrid());
    this.deps.addItemDrop(new ItemDropEntity(spawn.x, spawn.y, item));
  }
}
