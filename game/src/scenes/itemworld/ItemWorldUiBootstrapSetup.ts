import type { Game } from '../../Game';
import type { ItemWorldSceneSaveAccess } from '@scenes/shared/SceneSaveAccess';
import { SaveManager } from '@utils/SaveManager';
import { Debug } from '@core/Debug';
import { HUD } from '@ui/HUD';
import { AreaTitle } from '@ui/AreaTitle';
import { ToastManager } from '@ui/Toast';
import { TutorialHint } from '@ui/TutorialHint';
import { LowHpHealHintRuntime } from '@ui/LowHpHealHintRuntime';
import { LoreDisplay } from '@ui/LoreDisplay';
import { attachGamepadToast } from '@ui/GamepadToastBinding';
import type { UISkin } from '@ui/UISkin';
import { ItemWorldUiController } from './ItemWorldUiController';
import { ItemWorldProgressController } from './ItemWorldProgressController';
import { ItemWorldSpawnController } from './ItemWorldSpawnController';
import type { ItemWorldRunStats } from './ItemWorldRunStats';

export interface ItemWorldUiBootstrapResult {
  hud: HUD;
  areaTitle: AreaTitle;
  uiController: ItemWorldUiController;
  spawnController: ItemWorldSpawnController;
  progressController: ItemWorldProgressController;
  toast: ToastManager;
  gamepadToastUnsubscribe: (() => void) | null;
  tutorialHint: TutorialHint;
  lowHpHealHint: LowHpHealHintRuntime;
  loreDisplay: LoreDisplay;
}

export function setupItemWorldUiBootstrap(args: {
  game: Game;
  hudSkin: UISkin | null;
  itemDisplayName: string;
  runStats: ItemWorldRunStats;
  saveAccess: ItemWorldSceneSaveAccess;
  getHp: () => { hp: number; maxHp: number };
  showDamageIncreaseToast: (beforeAtk: number, afterAtk: number, toast: ToastManager) => void;
  continueToNextStratum: () => void;
  exitFromStratumClear: () => void;
}): ItemWorldUiBootstrapResult {
  args.game.hudReady = true;

  const hud = new HUD(args.game.uiScale);
  hud.setMinimapFrameVisible(false);
  hud.setDebugInfoVisible(Debug.infoVisible);
  args.game.uiContainer.addChild(hud.container);

  const savedData = SaveManager.load();
  args.runStats.setBaselineGold(savedData?.gold ?? 0);
  hud.updateGold(args.runStats.baselineGold);

  const areaTitle = new AreaTitle();
  args.game.legacyUIContainer.addChild(areaTitle.container);
  areaTitle.show(args.itemDisplayName);

  const uiController = new ItemWorldUiController(args.game);
  const spawnController = new ItemWorldSpawnController();
  const toast = new ToastManager(args.game.legacyUIContainer);
  const progressController = new ItemWorldProgressController({
    showA6DmgToast: (beforeAtk, afterAtk) => args.showDamageIncreaseToast(beforeAtk, afterAtk, toast),
    onContinueToNextStratum: args.continueToNextStratum,
    onExitFromStratumClear: args.exitFromStratumClear,
  });

  const gamepadToastUnsubscribe = attachGamepadToast(args.game, toast);

  const tutorialHint = new TutorialHint(args.game.input, args.game.legacyUIContainer, args.hudSkin);
  const lowHpHealHint = new LowHpHealHintRuntime({
    tutorialHint,
    getHp: args.getHp,
    saveAccess: {
      isLowHpHealToastFired: () => args.saveAccess.isLowHpHealToastFired(),
      markLowHpHealToastFired: () => args.saveAccess.markLowHpHealToastFired(),
    },
  });

  const loreDisplay = new LoreDisplay(args.game.input, args.game.uiScale);
  args.game.uiContainer.addChild(loreDisplay.container);

  return {
    hud,
    areaTitle,
    uiController,
    spawnController,
    progressController,
    toast,
    gamepadToastUnsubscribe,
    tutorialHint,
    lowHpHealHint,
    loreDisplay,
  };
}
