import {
  sacredSave,
  isLowHpHealToastFired,
  markLowHpHealToastFired,
} from '@save/PlayerSave';

export interface WorldSceneSaveAccess {
  isFirstItemWorldBossDefeated: () => boolean;
  isFirstDiveDone: () => boolean;
  isLowHpHealToastFired: () => boolean;
  markLowHpHealToastFired: () => void;
}

export interface LdtkSceneSaveAccess extends WorldSceneSaveAccess {
  isPrologueScene: () => boolean;
  getScene: () => string;
  setScene: (scene: string) => void;
  markFirstItemWorldBossDefeated: () => void;
  markFirstDiveDone: () => void;
  incrementDive: (itemDefId: string) => void;
  isFirstPickupDone: () => boolean;
  markFirstPickupDone: () => void;
  hasSeenItem: (itemDefId: string) => boolean;
  markItemSeen: (itemDefId: string) => void;
  shouldAlwaysShowLore: () => boolean;
  isLowHpHealToastFired: () => boolean;
  markLowHpHealToastFired: () => void;
}

export interface ItemWorldSceneSaveAccess {
  isPrologue: () => boolean;
  isFirstItemWorldBossDefeated: () => boolean;
  markFirstItemWorldBossDefeated: () => void;
  isLowHpHealToastFired: () => boolean;
  markLowHpHealToastFired: () => void;
}

export const createWorldSceneSaveAccess = (): WorldSceneSaveAccess => ({
  isFirstItemWorldBossDefeated: () => sacredSave.isFirstItemWorldBossDefeated(),
  isFirstDiveDone: () => sacredSave.isFirstDiveDone(),
  isLowHpHealToastFired: () => isLowHpHealToastFired(),
  markLowHpHealToastFired: () => markLowHpHealToastFired(),
});

export const createLdtkSceneSaveAccess = (): LdtkSceneSaveAccess => ({
  isPrologueScene: () => sacredSave.getScene() === 'prologue',
  getScene: () => sacredSave.getScene(),
  setScene: (scene) => sacredSave.setScene(scene),
  isFirstItemWorldBossDefeated: () => sacredSave.isFirstItemWorldBossDefeated(),
  isFirstDiveDone: () => sacredSave.isFirstDiveDone(),
  markFirstItemWorldBossDefeated: () => sacredSave.markFirstItemWorldBossDefeated(),
  markFirstDiveDone: () => sacredSave.markFirstDiveDone(),
  incrementDive: (itemDefId) => sacredSave.incrementDive(itemDefId),
  isFirstPickupDone: () => sacredSave.isFirstPickupDone(),
  markFirstPickupDone: () => sacredSave.markFirstPickupDone(),
  hasSeenItem: (itemDefId) => sacredSave.hasSeenItem(itemDefId),
  markItemSeen: (itemDefId) => sacredSave.markItemSeen(itemDefId),
  shouldAlwaysShowLore: () => sacredSave.getSettings().alwaysShowLore,
  isLowHpHealToastFired: () => isLowHpHealToastFired(),
  markLowHpHealToastFired: () => markLowHpHealToastFired(),
});

export const createLegacyItemWorldSceneSaveAccess = (
  saveAccess: Pick<WorldSceneSaveAccess, 'isLowHpHealToastFired' | 'markLowHpHealToastFired'>,
): ItemWorldSceneSaveAccess => ({
  isPrologue: () => false,
  isFirstItemWorldBossDefeated: () => false,
  markFirstItemWorldBossDefeated: () => {},
  isLowHpHealToastFired: () => saveAccess.isLowHpHealToastFired(),
  markLowHpHealToastFired: () => saveAccess.markLowHpHealToastFired(),
});

export const createLdtkItemWorldSceneSaveAccess = (
  saveAccess: Pick<
    LdtkSceneSaveAccess,
    | 'isPrologueScene'
    | 'isFirstItemWorldBossDefeated'
    | 'markFirstItemWorldBossDefeated'
    | 'isLowHpHealToastFired'
    | 'markLowHpHealToastFired'
  >,
): ItemWorldSceneSaveAccess => ({
  isPrologue: () => saveAccess.isPrologueScene(),
  isFirstItemWorldBossDefeated: () => saveAccess.isFirstItemWorldBossDefeated(),
  markFirstItemWorldBossDefeated: () => saveAccess.markFirstItemWorldBossDefeated(),
  isLowHpHealToastFired: () => saveAccess.isLowHpHealToastFired(),
  markLowHpHealToastFired: () => saveAccess.markLowHpHealToastFired(),
});
