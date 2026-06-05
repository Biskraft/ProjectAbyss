import type { ScreenFlash } from '@effects/ScreenFlash';

interface StaticEntityFeedbackGame {
  hitstopFrames: number;
  camera: {
    shake: (amount: number) => void;
  };
}

interface ApplyCrackedFloorShatterFeedbackInput {
  game: StaticEntityFeedbackGame;
  screenFlash: ScreenFlash;
  cameraShake: number;
  showToast?: () => void;
}

export function applyCrackedFloorShatterFeedback(input: ApplyCrackedFloorShatterFeedbackInput): void {
  input.game.hitstopFrames += 4;
  input.screenFlash.flash(0xffffff, 0.4, 150);
  input.game.camera.shake(input.cameraShake);
  input.showToast?.();
}

interface ApplySwitchActivationFeedbackInput {
  game: StaticEntityFeedbackGame;
  screenFlash: ScreenFlash;
  showToast?: () => void;
}

export function applySwitchActivationFeedback(input: ApplySwitchActivationFeedbackInput): void {
  input.game.camera.shake(3);
  input.screenFlash.flashHit(false);
  input.showToast?.();
}

interface ApplyGateUnlockFeedbackInput {
  game: StaticEntityFeedbackGame;
  screenFlash: ScreenFlash;
  onRumble?: () => void;
  showToast?: () => void;
}

export function applyGateUnlockFeedback(input: ApplyGateUnlockFeedbackInput): void {
  input.game.camera.shake(6);
  input.onRumble?.();
  input.screenFlash.flashHit(true);
  input.showToast?.();
}
