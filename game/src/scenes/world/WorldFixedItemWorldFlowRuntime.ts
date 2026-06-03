import type { ItemInstance } from '@items/ItemInstance';
import type { FixedItemWorldRuntime } from './FixedItemWorldRuntime';
import type { WorldItemWorldSceneFlowRuntime } from './WorldItemWorldSceneFlowRuntime';

interface WorldFixedItemWorldFlowRuntimeDeps {
  fixedItemWorld: FixedItemWorldRuntime;
  itemWorldSceneFlow: WorldItemWorldSceneFlowRuntime;
  restoreUiAfterDiveTransition: () => void;
  hasLevel: (levelId: string) => boolean;
  loadLevel: (levelId: string, enterFrom: 'down') => void;
  setEntryItem: (item: ItemInstance | null) => void;
  clearEntryItem: () => void;
  setInTunnel: (inTunnel: boolean) => void;
  getAnvilReturnLevelId: () => string | null;
  getPreTunnelLevelId: () => string | null;
  clearPreTunnelLevelId: () => void;
  getFallbackLevelId: () => string;
  setWorldVisualsReleased: (released: boolean) => void;
  resetEdgeTransition: () => void;
  placePlayerAtReturnPoint: () => void;
  isFirstItemWorldBossDefeated: () => boolean;
  getUnlockedEvents: () => Set<string>;
  showFirstItemWorldReturnInventoryHint: (hadFirstBossClear: boolean) => void;
  fireWorldReturnDialogue: (weaponDefId: string) => void;
  retireAfterBossClear: (hadFirstBossClear: boolean) => void;
}

export class WorldFixedItemWorldFlowRuntime {
  constructor(private readonly deps: WorldFixedItemWorldFlowRuntimeDeps) {}

  get isActive(): boolean {
    return this.deps.fixedItemWorld.isActive;
  }

  get currentItem(): ItemInstance | null {
    return this.deps.fixedItemWorld.currentItem;
  }

  clear(): void {
    this.deps.fixedItemWorld.clear();
  }

  enter(item: ItemInstance): void {
    this.deps.restoreUiAfterDiveTransition();
    const levelId = item.fixedLevelId;
    if (!levelId) return;

    if (!this.deps.hasLevel(levelId)) {
      console.error(`[LdtkWorldScene] Fixed item world level not found: "${levelId}"`);
      this.enterProceduralFallback(item);
      return;
    }

    this.deps.fixedItemWorld.begin(item, this.deps.isFirstItemWorldBossDefeated());
    this.deps.setInTunnel(false);
    this.deps.loadLevel(levelId, 'down');
  }

  exit(): void {
    const { item: completedItem, hadFirstBossClear } = this.deps.fixedItemWorld.consumeExitState();
    this.deps.clearEntryItem();

    this.deps.resetEdgeTransition();
    const returnLevel = this.deps.getAnvilReturnLevelId()
      ?? this.deps.getPreTunnelLevelId()
      ?? this.deps.getFallbackLevelId();
    this.deps.clearPreTunnelLevelId();
    this.deps.loadLevel(returnLevel, 'down');
    this.deps.setWorldVisualsReleased(false);
    this.deps.placePlayerAtReturnPoint();

    if (this.deps.isFirstItemWorldBossDefeated()) {
      this.deps.getUnlockedEvents().add('__itemWorldTutorialDone');
    }
    this.deps.showFirstItemWorldReturnInventoryHint(hadFirstBossClear);
    if (completedItem) {
      this.deps.fireWorldReturnDialogue(completedItem.def.id);
    }
    this.deps.retireAfterBossClear(hadFirstBossClear);
  }

  private enterProceduralFallback(item: ItemInstance): void {
    this.deps.setEntryItem(item);
    const hadFirstBossClear = this.deps.isFirstItemWorldBossDefeated();
    const itemWorldScene = this.deps.itemWorldSceneFlow.createScene(item, true);
    itemWorldScene.onComplete = () => {
      this.deps.itemWorldSceneFlow.completeReturn(itemWorldScene, hadFirstBossClear, { restoreAtAnvil: false });
      this.deps.fireWorldReturnDialogue(item.def.id);
      this.deps.retireAfterBossClear(hadFirstBossClear);
    };
    this.deps.itemWorldSceneFlow.pushPrepared(itemWorldScene, { alreadyBlack: true, revealMs: 240 });
  }
}
