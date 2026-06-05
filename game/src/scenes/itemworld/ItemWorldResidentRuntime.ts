import type { Container } from 'pixi.js';
import { MemoryResident } from '@entities/MemoryResident';
import type { Player } from '@entities/Player';
import type { LoreDisplay } from '@ui/LoreDisplay';
import {
  EGO_ARCHIVIST_FAMILIAR,
  EGO_ARCHIVIST_FIRST,
  EGO_GATEKEEPER_FAMILIAR,
  EGO_GATEKEEPER_FIRST,
  EGO_EVENT,
} from '@data/EgoDialogue';
import {
  addEntityToLayer,
  destroyAndClearEntities,
  updateEntities,
} from '@scenes/shared/EntityLifecycleHelpers';

interface ItemWorldResidentRuntimeDeps {
  getResidentsLayer: () => Container;
  getPlayer: () => Player;
  getLoreDisplay: () => LoreDisplay | null;
  getEgoFlags: () => Set<string>;
  getEgoUnlockedEvents: () => Set<string>;
}

export class ItemWorldResidentRuntime {
  private residents: MemoryResident[] = [];

  constructor(private readonly deps: ItemWorldResidentRuntimeDeps) {}

  spawnAmbient(x: number, y: number, variant: number): void {
    const resident = new MemoryResident(x, y, 'ambient', variant);
    addEntityToLayer(this.residents, resident, this.deps.getResidentsLayer());
  }

  update(dtMs: number): void {
    updateEntities(this.residents, dtMs);
    this.updateEgoTriggers();
  }

  clear(): void {
    destroyAndClearEntities(this.residents);
  }

  private updateEgoTriggers(): void {
    const loreDisplay = this.deps.getLoreDisplay();
    if (!loreDisplay || loreDisplay.isActive || this.residents.length === 0) return;

    const player = this.deps.getPlayer();
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    const egoFlags = this.deps.getEgoFlags();
    const egoUnlockedEvents = this.deps.getEgoUnlockedEvents();

    for (const resident of this.residents) {
      if (resident.type === 'ambient') continue;
      const flagKey = resident.type === 'gatekeeper' ? '__town_gk_fired' : '__town_arc_fired';
      if (egoFlags.has(flagKey)) continue;
      if (!resident.isPlayerNear(px, py)) continue;

      const seenKey = resident.type === 'gatekeeper'
        ? EGO_EVENT.GATEKEEPER_SEEN
        : EGO_EVENT.ARCHIVIST_SEEN;
      const isFirst = !egoUnlockedEvents.has(seenKey);
      const lines = resident.type === 'gatekeeper'
        ? (isFirst ? EGO_GATEKEEPER_FIRST : EGO_GATEKEEPER_FAMILIAR)
        : (isFirst ? EGO_ARCHIVIST_FIRST : EGO_ARCHIVIST_FAMILIAR);

      if (isFirst) egoUnlockedEvents.add(seenKey);
      egoFlags.add(flagKey);
      loreDisplay.showDialogue(lines, false);
      return;
    }
  }
}
