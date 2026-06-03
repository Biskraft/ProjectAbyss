import type { GiantBuilder } from '@entities/GiantBuilder';
import type { LdtkEntity } from '@level/LdtkLoader';
import type { BuilderAttachable, WorldBuilderAttachmentRuntime } from './WorldBuilderAttachmentRuntime';
import type { WorldExitGlowRuntime } from './WorldExitGlowRuntime';

interface WorldBuilderEntranceRuntimeDeps {
  attachments: WorldBuilderAttachmentRuntime;
  exitGlowRuntime: WorldExitGlowRuntime;
}

export class WorldBuilderEntranceRuntime {
  constructor(private readonly deps: WorldBuilderEntranceRuntimeDeps) {}

  spawnIfEntrance(builder: GiantBuilder, entity: LdtkEntity): boolean {
    if (!this.deps.exitGlowRuntime.isEntranceVfxEntity(entity)) return false;

    const builderX = builder.container.x;
    const builderY = builder.container.y;
    const spec = this.deps.exitGlowRuntime.getEntranceGlowSpec(entity);
    const glow = this.deps.exitGlowRuntime.addBuilderEntranceGlow({
      dir: spec.dir,
      x: builderX + spec.x,
      y: builderY + spec.y,
      span: spec.span,
    });
    const attachedGlow: BuilderAttachable = {
      x: builderX + spec.x,
      y: builderY + spec.y,
      container: glow.container,
    };
    this.deps.attachments.attach(
      builder,
      attachedGlow,
      spec.x,
      spec.y,
      () => this.deps.exitGlowRuntime.includesBuilderEntranceGlow(glow),
      {
        reparent: false,
        sync: (entity, bx, by, lx, ly) => {
          const x = bx + lx;
          const y = by + ly;
          entity.x = x;
          entity.y = y;
          glow.setAnchor(x, y);
        },
      },
    );
    return true;
  }
}
