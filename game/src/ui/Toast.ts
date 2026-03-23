import { Container, Text, TextStyle, Graphics } from 'pixi.js';
import { PIXEL_FONT } from './fonts';

const TOAST_DURATION = 2000;
const FADE_START = 1500;

interface ToastEntry {
  container: Container;
  timer: number;
}

const style = new TextStyle({
  fontSize: 8,
  fill: 0xffffff,
  fontFamily: PIXEL_FONT,
  dropShadow: {
    color: 0x000000,
    blur: 2,
    distance: 1,
  },
});

export class ToastManager {
  private parent: Container;
  private toasts: ToastEntry[] = [];

  constructor(parent: Container) {
    this.parent = parent;
  }

  show(message: string, color = 0xffffff): void {
    const container = new Container();

    const text = new Text({ text: message, style: { ...style, fill: color } });
    text.anchor.set(0.5, 0);
    text.x = 240; // center of 480
    container.addChild(text);

    // Stack below existing toasts
    container.y = 40 + this.toasts.length * 14;

    this.parent.addChild(container);
    this.toasts.push({ container, timer: TOAST_DURATION });
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
}
