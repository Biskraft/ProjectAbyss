import type { Player } from '@entities/Player';
import type { Inventory } from '@items/Inventory';
import { SaveManager } from '@utils/SaveManager';
import { trackSave } from '@utils/Analytics';
import { t } from '@i18n';

interface WorldSaveRuntimeDeps {
  getPlayer: () => Player;
  getLevelId: () => string;
  getInventory: () => Inventory;
  getUnlockedEvents: () => Set<string>;
  getCollectedRelics: () => Set<string>;
  getCollectedItems: () => Set<string>;
  getVisitedLevels: () => Set<string>;
  getClearedLevels: () => Set<string>;
  getGold: () => number;
  getPlaytimeMs: () => number;
  getHealthShardBonus: () => number;
  getCompletedTutorialHints: () => readonly string[];
  flashSaveFeedback: () => void;
  setHitstopFrames: (frames: number) => void;
  pulseNearestSavePoint: () => void;
  showToast: (message: string, color: number) => void;
  updateHud: (hp: number, maxHp: number, gold: number) => void;
}

export class WorldSaveRuntime {
  constructor(private readonly deps: WorldSaveRuntimeDeps) {}

  save(): void {
    const player = this.deps.getPlayer();
    player.hp = player.maxHp;
    player.flaskCharges = player.flaskMaxCharges;

    this.deps.flashSaveFeedback();
    this.deps.setHitstopFrames(4);
    this.deps.pulseNearestSavePoint();

    const levelId = this.deps.getLevelId();
    const playtimeMs = this.deps.getPlaytimeMs();
    const gold = this.deps.getGold();
    SaveManager.save({
      player: {
        hp: player.hp,
        maxHp: player.maxHp,
        atk: player.atk,
        def: player.def,
      },
      levelId,
      inventory: this.deps.getInventory(),
      abilities: { ...player.abilities },
      unlockedEvents: this.deps.getUnlockedEvents(),
      collectedRelics: this.deps.getCollectedRelics(),
      collectedItems: this.deps.getCollectedItems(),
      visitedLevels: this.deps.getVisitedLevels(),
      clearedLevels: this.deps.getClearedLevels(),
      gold,
      playtime: playtimeMs,
      healthShardBonus: this.deps.getHealthShardBonus(),
      completedTutorialHints: this.deps.getCompletedTutorialHints(),
    });

    this.deps.showToast(t('toast.game_saved'), 0x44ffaa);
    trackSave(levelId, Math.floor(playtimeMs / 1000));

    player.hp = player.maxHp;
    this.deps.updateHud(player.hp, player.maxHp, gold);
  }
}
