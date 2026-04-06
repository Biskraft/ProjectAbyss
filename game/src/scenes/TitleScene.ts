/**
 * TitleScene.ts — Title screen.
 *
 * Shows ECHORIS logo (image or placeholder), then "PRESS ANY KEY".
 * Any key press transitions to LdtkWorldScene.
 */

import { BitmapText, Sprite, Texture, Assets, Container, Graphics } from 'pixi.js';
import { Scene } from '@core/Scene';
import { PIXEL_FONT } from '@ui/fonts';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { LdtkWorldScene } from './LdtkWorldScene';
import type { Game } from '../Game';

const LOGO_PATH = 'assets/ui/title_logo.png';

export class TitleScene extends Scene {
  private canProceed = false;
  private hint!: BitmapText;
  private elapsed = 0;

  constructor(game: Game) {
    super(game);
  }

  async init(): Promise<void> {
    const cx = GAME_WIDTH / 2;

    // Try loading logo image, fall back to text placeholder
    let logoLoaded = false;
    try {
      const tex = await Assets.load(LOGO_PATH);
      if (tex && tex.width > 1) {
        const logo = new Sprite(tex);
        logo.anchor.set(0.5);
        logo.x = cx;
        logo.y = GAME_HEIGHT / 2 - 30;
        this.container.addChild(logo);
        logoLoaded = true;
      }
    } catch {
      // No logo file — use placeholder
    }

    if (!logoLoaded) {
      // Placeholder: styled text logo
      const logoText = new BitmapText({
        text: 'ECHORIS',
        style: { fontFamily: PIXEL_FONT, fontSize: 24, fill: 0xdddddd },
      });
      logoText.anchor.set(0.5);
      logoText.x = cx;
      logoText.y = GAME_HEIGHT / 2 - 30;
      this.container.addChild(logoText);

      // Subtle underline accent
      const line = new Graphics();
      line.rect(cx - 60, GAME_HEIGHT / 2 - 8, 120, 1)
        .fill({ color: 0x556677, alpha: 0.6 });
      this.container.addChild(line);
    }

    // Press any key hint
    this.hint = new BitmapText({
      text: 'PRESS ANY KEY',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x666666 },
    });
    this.hint.anchor.set(0.5);
    this.hint.x = cx;
    this.hint.y = GAME_HEIGHT / 2 + 40;
    this.hint.visible = false;
    this.container.addChild(this.hint);
  }

  enter(): void {
    this.container.visible = true;
    this.game.camera.snap(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.game.camera.target = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
  }

  update(dt: number): void {
    this.elapsed += dt;

    if (!this.canProceed && this.elapsed >= 1500) {
      this.hint.visible = true;
      this.canProceed = true;
    }

    if (this.hint.visible) {
      this.hint.alpha = 0.5 + Math.sin(this.elapsed / 400) * 0.5;
    }

    if (this.canProceed && this.game.input.anyKeyJustPressed()) {
      this.game.sceneManager.replace(new LdtkWorldScene(this.game));
    }
  }

  render(_alpha: number): void {}

  exit(): void {}
}
