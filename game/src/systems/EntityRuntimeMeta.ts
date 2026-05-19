import type { Enemy } from '@entities/Enemy';

interface EnemyRuntimeMeta {
  boss?: boolean;
  bossKey?: string;
  bossBarShown?: boolean;
  portalSpawned?: boolean;
  expGranted?: boolean;
  killHandled?: boolean;
  roomKey?: string;
  unlockTargetIids?: string[];
}

const enemyMeta = new WeakMap<Enemy<string>, EnemyRuntimeMeta>();

function meta(enemy: Enemy<string>): EnemyRuntimeMeta {
  let current = enemyMeta.get(enemy);
  if (!current) {
    current = {};
    enemyMeta.set(enemy, current);
  }
  return current;
}

export function isEnemyKillHandled(enemy: Enemy<string>): boolean {
  return meta(enemy).killHandled === true;
}

export function markEnemyKillHandled(enemy: Enemy<string>): void {
  meta(enemy).killHandled = true;
}

export function isEnemyExpGranted(enemy: Enemy<string>): boolean {
  return meta(enemy).expGranted === true;
}

export function markEnemyExpGranted(enemy: Enemy<string>): void {
  meta(enemy).expGranted = true;
}

export function setEnemyRoomKey(enemy: Enemy<string>, roomKey: string): void {
  meta(enemy).roomKey = roomKey;
}

export function getEnemyRoomKey(enemy: Enemy<string>): string | undefined {
  return meta(enemy).roomKey;
}
