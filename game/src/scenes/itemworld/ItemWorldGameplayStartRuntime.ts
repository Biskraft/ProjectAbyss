import { t } from '@i18n';
import { RARITY_COLOR, type ItemInstance, type ItemWorldProgress } from '@items/ItemInstance';
import type { StrataConfig } from '@data/StrataConfig';
import type { ItemWorldEntryGateState } from './ItemWorldEntryGateState';
import type { ItemWorldRoomSpawnRuntime } from './ItemWorldRoomSpawnRuntime';
import type { ItemWorldRoomSpawnState } from './ItemWorldRoomSpawnState';
import type { ItemWorldStratumPickerRuntime } from './ItemWorldStratumPickerRuntime';

interface ItemWorldGameplayStartRuntimeDeps {
  getEntryGateState: () => ItemWorldEntryGateState;
  getCurrentRoom: () => { col: number; row: number };
  getCurrentStratumIndex: () => number;
  getRoomSpawnState: () => ItemWorldRoomSpawnState;
  getRoomSpawnRuntime: () => ItemWorldRoomSpawnRuntime;
  getItem: () => ItemInstance;
  getProgress: () => ItemWorldProgress;
  getStrataConfig: () => StrataConfig;
  getStratumPickerRuntime: () => ItemWorldStratumPickerRuntime;
  showToast: (message: string, color: number) => void;
}

export class ItemWorldGameplayStartRuntime {
  constructor(private readonly deps: ItemWorldGameplayStartRuntimeDeps) {}

  start(): void {
    const entryGateState = this.deps.getEntryGateState();
    if (!entryGateState.tryMarkStartSpawnDone()) return;

    const currentRoom = this.deps.getCurrentRoom();
    const roomKey = `${currentRoom.col},${currentRoom.row}`;
    this.deps.getRoomSpawnState().markSpawned(roomKey);
    this.deps.getRoomSpawnRuntime().spawnForRoom(currentRoom.col, currentRoom.row);

    const item = this.deps.getItem();
    const currentStratumIndex = this.deps.getCurrentStratumIndex();
    const rarityColor = RARITY_COLOR[item.rarity];
    this.deps.showToast(t('iw.stratum_banner', { n: currentStratumIndex + 1 }), rarityColor);

    const totalStrata = this.deps.getStrataConfig().strata.length;
    const maxSelectable = Math.min(this.deps.getProgress().deepestUnlocked + 1, totalStrata);
    if (maxSelectable > 1) {
      this.deps.getStratumPickerRuntime().show(maxSelectable);
    }
  }
}
