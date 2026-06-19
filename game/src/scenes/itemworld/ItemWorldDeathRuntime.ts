import type { ItemInstance, ItemWorldProgress } from '@items/ItemInstance';
import type { Player } from '@entities/Player';
import type { DiveResult } from '@ui/ReturnResult';
import { trackItemWorldExit, trackPlayerDeath } from '@utils/Analytics';
import type { ItemWorldRunStats } from './ItemWorldRunStats';
import type { ItemWorldStratumStartSnapshot } from './ItemWorldStratumStartSnapshot';

interface ItemWorldDeathRuntimeDeps {
  getPlayer: () => Player;
  isPrologue: () => boolean;
  restartPrologueAfterDeath: () => void;
  getCurrentRoomForAnalytics: () => { col: number; row: number };
  requestDeathExit: () => void;
  getCurrentStratumIndex: () => number;
  markExitTracked: () => void;
  firePlayerDeathDialogue: () => void;
  hideBossHp: () => void;
  clearUiContainer: () => void;
  addHudContainer: () => void;
  getRunStats: () => ItemWorldRunStats;
  getProgress: () => ItemWorldProgress;
  persistRoomState: () => void;
  cleanupForReturnResult: () => void;
  getItem: () => ItemInstance;
  getStratumStartSnapshot: () => ItemWorldStratumStartSnapshot;
  getEnemiesDefeated: () => number;
  getTotalStrata: () => number;
  showReturnResult: (result: DiveResult, onDismiss: () => void) => boolean;
  exitItemWorld: () => void;
}

export class ItemWorldDeathRuntime {
  constructor(private readonly deps: ItemWorldDeathRuntimeDeps) {}

  update(): boolean {
    const player = this.deps.getPlayer();
    if (!player.isDead) return false;

    this.trackDeath(player);
    if (this.deps.isPrologue()) {
      this.deps.restartPrologueAfterDeath();
      return true;
    }

    this.prepareNormalDeathExit(player);
    this.showDeathResult();
    return true;
  }

  private trackDeath(player: Player): void {
    const room = this.deps.getCurrentRoomForAnalytics();
    trackPlayerDeath({
      area: 'itemworld',
      room_col: room.col,
      room_row: room.row,
      enemy_type: player.lastDamageSource,
    });
  }

  private prepareNormalDeathExit(player: Player): void {
    this.deps.requestDeathExit();
    trackItemWorldExit('death', this.deps.getCurrentStratumIndex());
    this.deps.markExitTracked();

    this.deps.firePlayerDeathDialogue();
    this.deps.hideBossHp();
    this.deps.clearUiContainer();
    this.deps.addHudContainer();

    const runStats = this.deps.getRunStats();
    runStats.applyExpPenalty(0.3);
    const progress = this.deps.getProgress();
    const currentStratumIndex = this.deps.getCurrentStratumIndex();
    if (currentStratumIndex > 0) {
      progress.lastSafeStratum = currentStratumIndex - 1;
    }
    this.deps.persistRoomState();
    player.respawn();
    this.deps.cleanupForReturnResult();
  }

  private showDeathResult(): void {
    const item = this.deps.getItem();
    const snapshot = this.deps.getStratumStartSnapshot();
    const currentStratumIndex = this.deps.getCurrentStratumIndex();
    const result: DiveResult = {
      item,
      prevLevel: snapshot.level,
      prevAtk: snapshot.atk,
      goldEarned: 0,
      enemiesDefeated: this.deps.getEnemiesDefeated(),
      innocentsCaptured: snapshot.innocentsCapturedBy(item),
      strataCleared: currentStratumIndex,
      totalStrata: this.deps.getTotalStrata(),
      isDeath: true,
    };

    if (!this.deps.showReturnResult(result, () => this.deps.exitItemWorld())) {
      this.deps.exitItemWorld();
    }
  }
}
