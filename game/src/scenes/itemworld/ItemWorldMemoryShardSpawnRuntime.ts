import { SFX } from '@audio/Sfx';
import { EGO_EVENT, EGO_SHARD_RECALL } from '@data/EgoDialogue';
import { INNOCENT_SPAWN_CHANCE, createRandomInnocent } from '@data/memoryShards';
import { MemoryShardNPC } from '@entities/MemoryShardNPC';
import { addInnocent, canAddInnocent, type ItemInstance } from '@items/ItemInstance';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { LoreDisplay } from '@ui/LoreDisplay';
import type { ScreenFlash } from '@effects/ScreenFlash';
import type { PRNG } from '@utils/PRNG';
import type { ItemWorldCaptureOrbRuntime } from './ItemWorldCaptureOrbRuntime';
import type {
  ItemWorldEnemySpawnContext,
  ItemWorldEnemySpawnRuntime,
} from './ItemWorldEnemySpawnRuntime';

interface TrySpawnMemoryShardArgs {
  roll: number;
  seedForArchetype: number;
  stratumIndex: number;
  spawnContext: ItemWorldEnemySpawnContext;
  spawnRng: PRNG;
}

interface ItemWorldMemoryShardSpawnRuntimeDeps {
  getItem: () => ItemInstance;
  getDamageNumbers: () => DamageNumberManager;
  updateHudText: () => void;
  getScreenFlash: () => ScreenFlash;
  getCaptureOrbRuntime: () => ItemWorldCaptureOrbRuntime;
  getLoreDisplay: () => LoreDisplay | null;
  getEgoUnlockedEvents: () => Set<string>;
  getEnemySpawnRuntime: () => ItemWorldEnemySpawnRuntime;
}

export class ItemWorldMemoryShardSpawnRuntime {
  constructor(private readonly deps: ItemWorldMemoryShardSpawnRuntimeDeps) {}

  trySpawn(args: TrySpawnMemoryShardArgs): boolean {
    const item = this.deps.getItem();
    if (args.roll >= INNOCENT_SPAWN_CHANCE || !canAddInnocent(item)) return false;

    const innocent = createRandomInnocent(args.seedForArchetype, args.stratumIndex);
    const npc = new MemoryShardNPC();
    npc.innocent = innocent;
    npc.onSubdued = () => {
      innocent.isSubdued = true;
      addInnocent(item, innocent);
      this.deps.getDamageNumbers().spawnSpecial(
        npc.x + npc.width / 2,
        npc.y - 16,
        `${innocent.name} +${innocent.value} ${innocent.stat}`,
        0xffdd44,
      );
      this.deps.updateHudText();
      this.deps.getScreenFlash().flash(0x88ddff, 0.35, 180);
      SFX.play('capture');
      this.deps.getCaptureOrbRuntime().spawn(
        npc.x + npc.width / 2,
        npc.y + npc.height / 2,
      );
      this.tryShowShardRecallDialogue();
    };

    this.deps.getEnemySpawnRuntime().spawnAt(
      npc,
      args.spawnContext.roomKey,
      this.deps.getEnemySpawnRuntime().pickSpawn(args.spawnContext, args.spawnRng, npc.height),
    );
    return true;
  }

  private tryShowShardRecallDialogue(): void {
    const loreDisplay = this.deps.getLoreDisplay();
    const egoUnlockedEvents = this.deps.getEgoUnlockedEvents();
    if (
      loreDisplay &&
      !egoUnlockedEvents.has(EGO_EVENT.SHARD_RECALL) &&
      !loreDisplay.isActive
    ) {
      egoUnlockedEvents.add(EGO_EVENT.SHARD_RECALL);
      void loreDisplay.showDialogue(EGO_SHARD_RECALL, false);
    }
  }
}
