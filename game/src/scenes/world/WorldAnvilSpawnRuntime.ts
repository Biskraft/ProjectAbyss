import { Container } from 'pixi.js';
import { Anvil } from '@entities/Anvil';
import type { GiantBuilder } from '@entities/GiantBuilder';
import type { LdtkEntity, LdtkLevel } from '@level/LdtkLoader';
import type { AnvilPromptController } from './AnvilPromptController';
import type { WorldBuilderAttachmentRuntime } from './WorldBuilderAttachmentRuntime';

interface WorldAnvilSpawnRuntimeDeps {
  getAnvil: () => Anvil | null;
  setAnvil: (anvil: Anvil | null) => void;
  getEntityLayer: () => Container;
  getPrompts: () => AnvilPromptController | null;
  readRetireAfterBossFlag: (ent: LdtkEntity) => boolean;
  shouldSpawnDisabled: (retireAfterFirstBoss: boolean) => boolean;
}

export class WorldAnvilSpawnRuntime {
  constructor(private readonly deps: WorldAnvilSpawnRuntimeDeps) {}

  spawnFromLdtk(level: LdtkLevel): void {
    const current = this.deps.getAnvil();
    if (current) {
      current.destroy();
      this.deps.setAnvil(null);
    }
    this.deps.getPrompts()?.destroy();

    const anvilEnt = level.entities.find(e => e.type === 'Anvil');
    if (anvilEnt) {
      const retireFlag = this.deps.readRetireAfterBossFlag(anvilEnt);
      const anvil = new Anvil(
        anvilEnt.px[0],
        anvilEnt.px[1],
        this.deps.shouldSpawnDisabled(retireFlag),
      );
      anvil.retireAfterFirstBoss = retireFlag;
      this.deps.setAnvil(anvil);
      this.deps.getEntityLayer().addChildAt(anvil.container, 0);
      return;
    }

    const altarEnt = level.entities.find(e => e.type === 'Altar');
    if (!altarEnt) return;

    console.warn(`[LdtkWorldScene] No Anvil entity in "${level.identifier}" - using first Altar position as fallback`);
    const fallbackAnvil = new Anvil(altarEnt.px[0], altarEnt.px[1], false);
    this.deps.setAnvil(fallbackAnvil);
    this.deps.getEntityLayer().addChildAt(fallbackAnvil.container, 0);
    return;
  }

  spawnBuilderMounted(
    builder: GiantBuilder,
    ent: LdtkEntity,
    attachments: WorldBuilderAttachmentRuntime,
  ): boolean {
    if (ent.type !== 'Anvil') return false;

    if (this.deps.getAnvil()) return true;

    const localX = ent.px[0];
    const localY = ent.px[1];
    const retireFlag = this.deps.readRetireAfterBossFlag(ent);
    const anvil = new Anvil(
      builder.container.x + localX,
      builder.container.y + localY,
      this.deps.shouldSpawnDisabled(retireFlag),
    );
    anvil.retireAfterFirstBoss = retireFlag;
    this.deps.setAnvil(anvil);
    attachments.attach(builder, anvil, localX, localY, () => this.deps.getAnvil() === anvil);
    return true;
  }
}
