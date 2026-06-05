import type { Enemy } from './Enemy';

export interface EnemyMetadata {
  _isBoss?: boolean;
  _bossKey?: string;
  _unlockTargetIids?: string[];
  _portalSpawned?: boolean;
  _bossBarShown?: boolean;
  _roomKey?: string;
  _postDefeatHandled?: boolean;
}

export type EnemyWithMetadata = Enemy<string> & EnemyMetadata;

const withMetadata = (enemy: Enemy<string>): EnemyWithMetadata => enemy as EnemyWithMetadata;

export const isBossEnemy = (enemy: Enemy<string>): boolean => withMetadata(enemy)._isBoss === true;

export const markBossEnemy = (enemy: Enemy<string>): void => {
  withMetadata(enemy)._isBoss = true;
};

export const setBossKey = (enemy: Enemy<string>, bossKey: string | null | undefined): void => {
  if (bossKey) {
    withMetadata(enemy)._bossKey = bossKey;
  } else {
    withMetadata(enemy)._bossKey = undefined;
  }
};

export const setUnlockTargetIids = (enemy: Enemy<string>, targetRefs: string[]): void => {
  withMetadata(enemy)._unlockTargetIids = targetRefs;
};

export const getUnlockTargetIids = (enemy: Enemy<string>): string[] =>
  withMetadata(enemy)._unlockTargetIids ?? [];

export const getBossKey = (enemy: Enemy<string>): string | undefined => withMetadata(enemy)._bossKey;

export const clearBossMetadata = (enemy: Enemy<string>): void => {
  const metadata = withMetadata(enemy);
  metadata._isBoss = undefined;
  metadata._bossKey = undefined;
  metadata._unlockTargetIids = undefined;
  metadata._portalSpawned = undefined;
  metadata._bossBarShown = undefined;
};

export const setPortalSpawned = (enemy: Enemy<string>): void => {
  withMetadata(enemy)._portalSpawned = true;
};

export const wasPortalSpawned = (enemy: Enemy<string>): boolean => withMetadata(enemy)._portalSpawned === true;

export const wasBossBarShown = (enemy: Enemy<string>): boolean =>
  withMetadata(enemy)._bossBarShown === true;

export const markBossBarShown = (enemy: Enemy<string>): void => {
  withMetadata(enemy)._bossBarShown = true;
};

export const setEnemyRoomKey = (enemy: Enemy<string>, roomKey: string): void => {
  withMetadata(enemy)._roomKey = roomKey;
};

export const getEnemyRoomKey = (enemy: Enemy<string>): string | undefined => {
  return withMetadata(enemy)._roomKey;
};

export const clearEnemyRoomMetadata = (enemy: Enemy<string>): void => {
  withMetadata(enemy)._roomKey = undefined;
};

export const isEnemyPostDefeatHandled = (enemy: Enemy<string>): boolean =>
  withMetadata(enemy)._postDefeatHandled === true;

export const markEnemyPostDefeatHandled = (enemy: Enemy<string>): void => {
  withMetadata(enemy)._postDefeatHandled = true;
};
