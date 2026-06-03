import type { Container } from 'pixi.js';
import type { GiantBuilder } from '@entities/GiantBuilder';

export interface BuilderAttachable {
  x: number;
  y: number;
  container: Container;
  baseY?: number;
}

export interface BuilderSizedAttachable extends BuilderAttachable {
  width: number;
  height: number;
}

interface BuilderAttachment {
  entity: BuilderAttachable;
  localX: number;
  localY: number;
  isAlive: () => boolean;
  sync?: (entity: BuilderAttachable, builderX: number, builderY: number, localX: number, localY: number) => void;
}

interface AttachOptions {
  reparent?: boolean;
  sync?: (entity: BuilderAttachable, builderX: number, builderY: number, localX: number, localY: number) => void;
}

export class WorldBuilderAttachmentRuntime {
  private attachments: BuilderAttachment[] = [];

  attach(
    builder: GiantBuilder,
    entity: BuilderAttachable,
    localX: number,
    localY: number,
    isAlive: () => boolean,
    options: AttachOptions = {},
  ): void {
    const reparent = options.reparent ?? true;
    if (reparent) {
      entity.container.parent?.removeChild(entity.container);
      builder.container.addChild(entity.container);
      entity.container.x = localX;
      entity.container.y = localY;
      if (typeof entity.baseY === 'number') {
        entity.baseY = localY;
      }
      this.attachments.push({ entity, localX, localY, isAlive, sync: options.sync });
      return;
    }

    options.sync?.(entity, builder.container.x, builder.container.y, localX, localY);
    this.attachments.push({ entity, localX, localY, isAlive, sync: options.sync });
  }

  attachWorldPositioned(
    builder: GiantBuilder,
    entity: BuilderAttachable,
    localX: number,
    localY: number,
    isAlive: () => boolean,
  ): void {
    this.attach(builder, entity, localX, localY, isAlive, {
      reparent: false,
      sync: (target, bx, by, lx, ly) => {
        this.syncWorldPosition(target, bx, by, lx, ly);
      },
    });
  }

  attachSizedWorldPositioned(
    builder: GiantBuilder,
    entity: BuilderSizedAttachable,
    localX: number,
    localY: number,
    isAlive: () => boolean,
  ): void {
    this.attach(builder, entity, localX, localY, isAlive, {
      reparent: false,
      sync: (target, bx, by, lx, ly) => {
        this.syncWorldPosition(target, bx, by, lx, ly);
        const sized = target as BuilderSizedAttachable;
        if (sized.width > 0) {
          sized.x = sized.container.x - sized.width / 2;
          sized.y = sized.container.y - sized.height;
        }
      },
    });
  }

  sync(builder: GiantBuilder | null): void {
    if (!builder || this.attachments.length === 0) return;

    const bx = builder.container.x;
    const by = builder.container.y;
    for (let i = this.attachments.length - 1; i >= 0; i--) {
      const attachment = this.attachments[i];
      if (!attachment.isAlive()) {
        this.attachments.splice(i, 1);
        continue;
      }
      if (attachment.sync) {
        attachment.sync(attachment.entity, bx, by, attachment.localX, attachment.localY);
      } else {
        attachment.entity.x = bx + attachment.localX;
        attachment.entity.y = by + attachment.localY;
      }
    }
  }

  clear(): void {
    this.attachments = [];
  }

  private syncWorldPosition(entity: BuilderAttachable, builderX: number, builderY: number, localX: number, localY: number): void {
    entity.x = builderX + localX;
    entity.y = builderY + localY;
    entity.container.x = entity.x;
    entity.container.y = entity.y;
  }
}
