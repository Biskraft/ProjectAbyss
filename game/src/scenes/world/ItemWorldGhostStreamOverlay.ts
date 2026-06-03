import type { LdtkLevel } from '@level/LdtkLoader';
import type { ItemInstance } from '@items/ItemInstance';
import { ItemWorldGhostOverlay } from '@effects/ItemWorldGhostOverlay';
import type { ItemDeploymentTunnelOpenOptions } from '@effects/ItemDeploymentTypes';
import type { ItemWorldEntryStreamRuntime } from './ItemWorldEntryStreamRuntime';

type GhostBirthOptions = NonNullable<ItemDeploymentTunnelOpenOptions['ghostBirth']>;

export interface ItemWorldGhostStreamBuildOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  item: ItemInstance;
  level: LdtkLevel | null | undefined;
  streamRuntime: ItemWorldEntryStreamRuntime;
  ghostBirth?: GhostBirthOptions | null;
  streamReady?: boolean;
  shardSource?: { x: number; y: number } | null;
}

export interface ItemWorldGhostStreamBuildResult {
  ghost: ItemWorldGhostOverlay;
  entranceAabb: { x: number; y: number; width: number; height: number };
}

export function buildItemWorldGhostStreamOverlay(
  options: ItemWorldGhostStreamBuildOptions,
): ItemWorldGhostStreamBuildResult {
  const { x, y, w, h, item, level, streamRuntime, ghostBirth, streamReady = false, shardSource } = options;
  const ghost = new ItemWorldGhostOverlay();

  if (level) {
    ghost.buildFromGrid(level.collisionGrid, level.gridW, level.gridH);
    const displayEnt = level.entities.find(ent => ent.type === 'ItemDisplay');
    if (displayEnt && !streamReady) {
      const sizeRaw = (displayEnt.fields['Size'] ?? displayEnt.fields['size']) as number | undefined;
      const scaleFactor = (typeof sizeRaw === 'number' && sizeRaw > 0) ? sizeRaw : 4;
      const rotate = ((displayEnt.fields['Rotate'] ?? displayEnt.fields['rotate']) as boolean | undefined) ?? false;
      ghost.addItemDisplay(displayEnt.px[0], displayEnt.px[1], item, scaleFactor, rotate);
    }
  } else {
    ghost.build(item, 0);
  }

  if (ghostBirth) {
    const pos = streamRuntime.resolveGhostPositionForSize(
      ghost.builtPxW,
      ghost.builtPxH,
      ghostBirth,
    );
    ghost.container.x = pos.x;
    ghost.container.y = pos.y;
  } else {
    ghost.container.x = x + w * 0.5 - ghost.builtPxW * 0.5 + 256;
    ghost.container.y = y + h * 0.5 - ghost.builtPxH * 0.5 - 48;
  }

  ghost.itemContainer.x = ghost.container.x;
  ghost.itemContainer.y = ghost.container.y;
  ghost.setShardSourceWorld(shardSource?.x ?? x + 48, shardSource?.y ?? y + h * 0.5);

  const triggerX = ghostBirth?.entranceAtEnd
    ? ghost.container.x + ghost.builtPxW - 32
    : ghost.container.x + ghost.builtPxW * 0.68;

  return {
    ghost,
    entranceAabb: {
      x: triggerX - 24,
      y: ghost.container.y,
      width: 48,
      height: ghost.builtPxH,
    },
  };
}
