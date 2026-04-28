import { Container, BitmapText, Graphics } from 'pixi.js';
import { PIXEL_FONT } from './fonts';
import { HudConst } from '@data/constData';

const TOAST_DURATION = HudConst.Toast.DurationMs;
const FADE_START = HudConst.Toast.FadeStartMs;

interface ToastEntry {
  container: Container;
  timer: number;
}

export class ToastManager {
  private parent: Container;
  private toasts: ToastEntry[] = [];

  constructor(parent: Container) {
    this.parent = parent;
  }

  show(message: string, color = 0xffffff): void {
    const container = new Container();

    const text = new BitmapText({ text: message, style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: color } });
    text.anchor.set(0.5, 0);
    text.x = 320; // center of 640
    container.addChild(text);

    // Stack below existing toasts
    container.y = 40 + this.toasts.length * 14;

    this.parent.addChild(container);
    this.toasts.push({ container, timer: TOAST_DURATION });
  }

  /** Large centered text for boss clear rewards, level ups, etc. */
  showBig(message: string, color = 0xffd700, durationMs = HudConst.Toast.BigDurationMs): void {
    const container = new Container();

    const text = new BitmapText({ text: message, style: { fontFamily: PIXEL_FONT, fontSize: 16, fill: color } });
    text.anchor.set(0.5, 0.5);
    text.x = 320;
    text.y = 180; // center of 360
    container.addChild(text);

    this.parent.addChild(container);
    this.toasts.push({ container, timer: durationMs });
  }

  update(dt: number): void {
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const toast = this.toasts[i];
      toast.timer -= dt;

      // Fade out
      if (toast.timer < TOAST_DURATION - FADE_START) {
        toast.container.alpha = Math.max(0, toast.timer / (TOAST_DURATION - FADE_START));
      }

      // Float up
      toast.container.y -= dt * 0.01;

      if (toast.timer <= 0) {
        if (toast.container.parent) toast.container.parent.removeChild(toast.container);
        this.toasts.splice(i, 1);
      }
    }
  }

  /** Remove all active toasts (call on scene exit) */
  clear(): void {
    for (const toast of this.toasts) {
      if (toast.container.parent) toast.container.parent.removeChild(toast.container);
    }
    this.toasts = [];
  }
}
