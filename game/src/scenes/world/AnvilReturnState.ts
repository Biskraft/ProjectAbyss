import type { Anvil } from '@entities/Anvil';
import type { LdtkLevel } from '@level/LdtkLoader';
import type { Player } from '@entities/Player';
import type { ItemInstance } from '@items/ItemInstance';
import { placePlayerAt } from '@scenes/shared/PlayerPlacementHelpers';

export interface AnvilSnapshot {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function snapshotAnvil(anvil: Anvil): AnvilSnapshot {
  return {
    x: anvil.x,
    y: anvil.y,
    width: anvil.width,
    height: anvil.height,
  };
}

export function resolveAnvilTargetPoint(
  anvil: Anvil | null,
  currentLevel: LdtkLevel | null,
  lastSnapshot: AnvilSnapshot | null,
  fromX: number,
  fromY: number,
): { x: number; y: number } | null {
  if (anvil) {
    return { x: anvil.x, y: anvil.y - anvil.height };
  }

  if (currentLevel?.entities) {
    let best: { d: number; x: number; y: number } | null = null;
    for (const ent of currentLevel.entities) {
      if (ent.type !== 'Anvil') continue;
      const ex = ent.px[0];
      const ey = ent.px[1] - ent.height;
      const d = (ex - fromX) * (ex - fromX) + (ey - fromY) * (ey - fromY);
      if (!best || d < best.d) best = { d, x: ex, y: ey };
    }
    if (best) return { x: best.x, y: best.y };
  }

  if (lastSnapshot) {
    return {
      x: lastSnapshot.x,
      y: lastSnapshot.y - lastSnapshot.height,
    };
  }

  return null;
}

export function placePlayerAtAnvilReturnPoint(
  player: Player,
  snapshot: AnvilSnapshot | null,
  anvil: Anvil | null,
  snapCamera: (x: number, y: number) => void,
): void {
  const snap = snapshot ?? (anvil ? snapshotAnvil(anvil) : null);
  if (!snap) return;

  placePlayerAt(player, snap.x + snap.width / 2 + 8, snap.y - player.height, {
    resetVelocity: true,
    savePreviousPosition: true,
  });
  snapCamera(player.x, player.y);
}

export class AnvilItemWorldReturnState {
  private snapshot: AnvilSnapshot | null = null;
  private levelId: string | null = null;
  private item: ItemInstance | null = null;
  private retireAfterBoss = false;

  get currentItem(): ItemInstance | null {
    return this.item;
  }

  get returnLevelId(): string | null {
    return this.levelId;
  }

  get retireAfterFirstBoss(): boolean {
    return this.retireAfterBoss;
  }

  get hasItem(): boolean {
    return this.item !== null;
  }

  record(anvil: Anvil, levelId: string | null, item: ItemInstance | null): void {
    this.snapshot = snapshotAnvil(anvil);
    this.levelId = levelId;
    this.item = item;
    this.retireAfterBoss = anvil.retireAfterFirstBoss;
  }

  setItem(item: ItemInstance | null): void {
    this.item = item;
  }

  getPreservedItem(anvil: Anvil | null, fallback: ItemInstance | null): ItemInstance | null {
    return anvil?.item ?? this.item ?? fallback;
  }

  resolveTarget(
    anvil: Anvil | null,
    currentLevel: LdtkLevel | null,
    fromX: number,
    fromY: number,
  ): { x: number; y: number } | null {
    return resolveAnvilTargetPoint(anvil, currentLevel, this.snapshot, fromX, fromY);
  }

  placePlayer(player: Player, anvil: Anvil | null, snapCamera: (x: number, y: number) => void): void {
    placePlayerAtAnvilReturnPoint(player, this.snapshot, anvil, snapCamera);
  }
}
