import { Container, Graphics } from 'pixi.js';
import { FLASK_PULSE_PERIOD, FLASK_LOW_HP_THRESHOLD } from './HudConstants';
import { shouldPulseFlask } from './HudVitals';
import { drawHudPulseGlow } from './HudPulseGlowDisplay';

export interface HudFlaskPulseState {
  timer: number;
}

export interface HudFlaskPulseContext {
  dt: number;
  currentHp: number;
  maxHp: number;
  flaskCurrent: number;
  state: HudFlaskPulseState;
  pulseGlow: Graphics;
  keyLabel: Container;
  hasSkin: boolean;
  hpX: number;
  flaskY: number;
  flaskSize: number;
  skinFlaskCx: number;
  skinFlaskCy: number;
  skinFlaskR: number;
}

export interface HudItemKeyPulseState {
  timer: number;
}

export interface HudItemKeyPulseContext {
  dt: number;
  active: boolean;
  state: HudItemKeyPulseState;
  pulseGlow: Graphics;
  itemKeyIcon: Container | null;
  itemKeyCenterX: number;
  itemKeyCenterY: number;
  itemKeySize: number;
  hasSkin: boolean;
}

export function advanceHudFlaskPulse(context: HudFlaskPulseContext): void {
  if (shouldPulseFlask(context.currentHp, context.maxHp, context.flaskCurrent, FLASK_LOW_HP_THRESHOLD)) {
    context.state.timer = (context.state.timer + context.dt) % FLASK_PULSE_PERIOD;
    const phase = (context.state.timer / FLASK_PULSE_PERIOD) * Math.PI * 2;
    const pulse = 0.5 + 0.5 * Math.sin(phase);
    const scale = 1.0 + pulse * 1.8;
    context.keyLabel.scale.set(scale);

    const cx = context.hasSkin ? context.skinFlaskCx : (context.hpX + context.flaskSize / 2);
    const cy = context.hasSkin ? context.skinFlaskCy : (context.flaskY + context.flaskSize / 2);
    const glowSize = context.hasSkin ? context.skinFlaskR : context.flaskSize;

    drawHudPulseGlow(context.pulseGlow, {
      cx,
      cy,
      baseSize: glowSize,
      pulse,
      radiusBaseScale: 0.7,
      radiusPulseScale: 3.2,
      outerColor: 0xff4444,
      outerAlphaBase: 0.25,
      outerAlphaPulse: 0.35,
      innerColor: 0xffaa66,
      innerAlphaBase: 0.35,
      innerAlphaPulse: 0.35,
    });
    return;
  }

  if (context.state.timer !== 0 || context.keyLabel.scale.x !== 1) {
    context.state.timer = 0;
    context.keyLabel.scale.set(1);
    context.pulseGlow.clear();
    context.pulseGlow.alpha = 0;
  }
}

export function advanceHudItemKeyPulse(context: HudItemKeyPulseContext): void {
  if (context.active) {
    context.state.timer = (context.state.timer + context.dt) % FLASK_PULSE_PERIOD;
    const phase = (context.state.timer / FLASK_PULSE_PERIOD) * Math.PI * 2;
    const pulse = 0.5 + 0.5 * Math.sin(phase);

    if (context.itemKeyIcon && !context.hasSkin) {
      context.itemKeyIcon.scale.set(1.0 + pulse * 0.45);
    }

    drawHudPulseGlow(context.pulseGlow, {
      cx: context.itemKeyCenterX,
      cy: context.itemKeyCenterY,
      baseSize: context.itemKeySize,
      pulse,
      radiusBaseScale: 0.7,
      radiusPulseScale: 0.8,
      outerColor: 0xffaa44,
      outerAlphaBase: 0.18,
      outerAlphaPulse: 0.22,
      innerColor: 0xffee88,
      innerAlphaBase: 0.25,
      innerAlphaPulse: 0.25,
    });
    return;
  }

  if (context.state.timer !== 0) {
    context.state.timer = 0;
    if (context.itemKeyIcon) context.itemKeyIcon.scale.set(1);
    context.pulseGlow.clear();
    context.pulseGlow.alpha = 0;
  }
}
