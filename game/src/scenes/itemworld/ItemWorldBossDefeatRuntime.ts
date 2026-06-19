import type { Container } from 'pixi.js';
import type { Enemy } from '@entities/Enemy';
import { FloatingItemDrop } from '@entities/FloatingItemDrop';
import { createAnvilFlame } from '@entities/HealingPickup';
import { Trapdoor } from '@entities/Trapdoor';
import { Debug } from '@core/Debug';
import { t } from '@i18n';
import {
  grantBossStageJump,
  getDisplayName,
  type ItemInstance,
  type ItemWorldProgress,
} from '@items/ItemInstance';
import { trackItemWorldFloorClear } from '@utils/Analytics';
import type { ItemWorldBossClearRuntime } from './ItemWorldBossClearRuntime';

type TrapdoorEntity = Trapdoor | FloatingItemDrop;

interface BossDefeatPlayerState {
  maxHp: number;
  hp: number;
}

interface ItemWorldBossDefeatRuntimeDeps {
  tileSize: number;
  getEnemies: () => readonly Enemy<string>[];
  getBossClearRuntime: () => ItemWorldBossClearRuntime;
  getItem: () => ItemInstance;
  getProgress: () => ItemWorldProgress;
  getPlayer: () => BossDefeatPlayerState;
  getCurrentStratumIndex: () => number;
  getTotalStrata: () => number;
  getCurrentCell: () => { cleared: boolean; bossPortalX?: number; bossPortalY?: number } | null;
  hideBossHp: () => void;
  isFirstItemWorldBossDefeated: () => boolean;
  markFirstItemWorldBossDefeated: () => void;
  setLastBossStageJump: (value: {
    stratumIndex: number;
    newStage: number;
    fragmentId: string;
    itemName: string;
  }) => void;
  showToast: (message: string, color: number) => void;
  showBigToast: (message: string, color: number, durationMs: number) => void;
  flashBossHeal: () => void;
  addHealingPickup: (pickup: ReturnType<typeof createAnvilFlame>) => void;
  persistRoomState: () => void;
  setHitstopFrames: (frames: number) => void;
  shakeCamera: (intensity: number) => void;
  flashScreen: (color: number, alpha: number, durationMs: number) => void;
  spawnDeathParticles: (x: number, y: number, isBoss: boolean) => void;
  getTrapdoor: () => TrapdoorEntity | null;
  setTrapdoor: (trapdoor: TrapdoorEntity) => void;
  getEntityLayer: () => Container;
  prepareAbsorbFilter: () => void;
  setTrapdoorDescentToWorld: (descentToWorld: boolean) => void;
  findRoomAtPixel: (x: number, y: number) => { col: number; absRow: number };
  getRoomRectTiles: (col: number, absRow: number) => { tileX: number; tileY: number; tileW: number; tileH: number };
  getFullGrid: () => number[][];
  isFinalEndRoom: (col: number, absRow: number) => boolean;
  isFirstBossOnboarding: () => boolean;
  showBossKilledDialogue: () => Promise<void>;
  showTrapdoorThanksIfReady: () => void;
}

export class ItemWorldBossDefeatRuntime {
  constructor(private readonly deps: ItemWorldBossDefeatRuntimeDeps) {}

  consumeAndHandle(): void {
    const enemy = this.deps.getBossClearRuntime().consumeDefeatedBoss(this.deps.getEnemies());
    if (!enemy) return;
    this.handle(enemy);
  }

  private handle(enemy: Enemy<string>): void {
    this.deps.hideBossHp();
    const cell = this.deps.getCurrentCell();
    if (!cell) return;
    cell.cleared = true;

    if (!this.deps.isFirstItemWorldBossDefeated()) {
      this.deps.markFirstItemWorldBossDefeated();
    }

    const item = this.deps.getItem();
    const currentStratumIndex = this.deps.getCurrentStratumIndex();
    trackItemWorldFloorClear(currentStratumIndex, item.rarity);

    const stageJumpResult = grantBossStageJump(
      item,
      currentStratumIndex,
      this.deps.getTotalStrata(),
    );
    if (stageJumpResult.stageChanged) {
      this.deps.setLastBossStageJump({
        stratumIndex: currentStratumIndex,
        newStage: stageJumpResult.newStage,
        fragmentId: stageJumpResult.fragmentId,
        itemName: getDisplayName(item),
      });
      this.deps.showToast(`??${getDisplayName(item)}`, 0xffd700);
    }

    const player = this.deps.getPlayer();
    const bossHeal = Math.floor(player.maxHp * 0.30);
    player.hp = Math.min(player.maxHp, player.hp + bossHeal);
    if (bossHeal > 0) {
      this.deps.showToast(t('toast.hp_gain', { amount: bossHeal }), 0x44ff44);
      this.deps.flashBossHeal();
    }

    const anvilX = enemy.x + enemy.width / 2 - 8;
    const anvilY = enemy.y + enemy.height;
    this.deps.addHealingPickup(createAnvilFlame(anvilX, anvilY, player.maxHp));

    const px = enemy.x + enemy.width / 2;
    const py = enemy.y + enemy.height;
    cell.bossPortalX = px;
    cell.bossPortalY = py;
    const progress = this.deps.getProgress();
    progress.bossPortals ??= {};
    progress.bossPortals[String(currentStratumIndex)] = { x: px, y: py };
    this.deps.persistRoomState();

    const bossCx = enemy.x + enemy.width / 2;
    const bossCy = enemy.y + enemy.height / 2;
    this.deps.setHitstopFrames(24);
    this.deps.shakeCamera(9);
    this.deps.flashScreen(0xffffff, 0.55, 180);
    this.deps.showBigToast(t('toast.boss_defeated'), 0xffd35a, 2200);
    const runFollowupBurst = (): void => {
      this.deps.flashScreen(0xffaa22, 0.35, 220);
      this.deps.spawnDeathParticles(bossCx, bossCy, true);
      this.deps.shakeCamera(5);
    };

    const pendingTrapdoor = this.queueTrapdoor(enemy);
    const spawnTrapdoorEntity = (): void => {
      if (!pendingTrapdoor || this.deps.getTrapdoor()) return;
      const { x, y, descentToWorld } = pendingTrapdoor;
      const trapdoor = descentToWorld
        ? new FloatingItemDrop(x, y, item)
        : new Trapdoor(x, y);
      if (descentToWorld) this.deps.prepareAbsorbFilter();
      this.deps.setTrapdoor(trapdoor);
      this.deps.getEntityLayer().addChild(trapdoor.container);
      this.deps.setTrapdoorDescentToWorld(descentToWorld);
      this.deps.showToast(t('toast.trapdoor_opens'), 0xff7744);
      Debug.log(`[Trapdoor] spawned post-dialogue at (${x.toFixed(0)}, ${y.toFixed(0)}) ${descentToWorld ? '(FloatingItemDrop)' : '(Trapdoor)'}`);
      this.deps.showTrapdoorThanksIfReady();
    };

    const wasOnboarding = this.deps.isFirstBossOnboarding();
    this.deps.getBossClearRuntime().start({
      onFollowupBurst: runFollowupBurst,
      onSpawnTrapdoor: async () => {
        if (wasOnboarding) await this.deps.showBossKilledDialogue();
        spawnTrapdoorEntity();
      },
    });
  }

  private queueTrapdoor(enemy: Enemy<string>): { x: number; y: number; descentToWorld: boolean } | null {
    if (this.deps.getTrapdoor()) return null;

    const enemyCx = enemy.x + enemy.width / 2;
    const enemyFootY = enemy.y + enemy.height;
    const bossRoom = this.deps.findRoomAtPixel(enemyCx, enemyFootY);
    const bossCellCol = bossRoom.col;
    const bossCellRow = bossRoom.absRow;
    const bossRect = this.deps.getRoomRectTiles(bossCellCol, bossCellRow);
    const cellTopRow = bossRect.tileY;
    const cellBottomRow = bossRect.tileY + bossRect.tileH;
    const probeCol = Math.floor(enemyCx / this.deps.tileSize);
    let probeRow = Math.max(cellTopRow, Math.floor(enemyFootY / this.deps.tileSize));
    let floorTileRow = cellBottomRow - 1;
    const fullGrid = this.deps.getFullGrid();
    while (probeRow < cellBottomRow) {
      const v = fullGrid[probeRow]?.[probeCol];
      if (v === 1) {
        floorTileRow = probeRow;
        break;
      }
      probeRow++;
    }

    const cellLeftPx = bossRect.tileX * this.deps.tileSize;
    const cellRightPx = (bossRect.tileX + bossRect.tileW) * this.deps.tileSize;
    const x = Math.min(cellRightPx - 16, Math.max(cellLeftPx + 16, enemyCx));
    const y = floorTileRow * this.deps.tileSize;
    const descentToWorld = this.deps.isFinalEndRoom(bossCellCol, bossCellRow);
    Debug.log(`[Trapdoor] queued at (${x.toFixed(0)}, ${y.toFixed(0)}) cell=(${bossCellCol},${bossCellRow}) descentToWorld=${descentToWorld}`);
    return { x, y, descentToWorld };
  }
}
