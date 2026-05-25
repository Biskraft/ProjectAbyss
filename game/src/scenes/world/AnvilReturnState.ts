import type { Anvil } from '@entities/Anvil';
import type { LdtkLevel } from '@level/LdtkLoader';
import type { Player } from '@entities/Player';

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

  player.x = snap.x + snap.width / 2 + 8;
  player.y = snap.y - player.height;
  player.vx = 0;
  player.vy = 0;
  player.savePrevPosition();
  snapCamera(player.x, player.y);
}
