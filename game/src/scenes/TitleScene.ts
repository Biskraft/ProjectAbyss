/**
 * TitleScene.ts — Screen 0: Commission note on black background.
 *
 * Shows commission text, then "PRESS ANY KEY" after 1.5s.
 * Any key press transitions to LdtkWorldScene.
 */

import { BitmapText } from 'pixi.js';
import { Scene } from '@core/Scene';
import { PIXEL_FONT } from '@ui/fonts';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { LdtkWorldScene } from './LdtkWorldScene';
import type { Game } from '../Game';

export class TitleScene extends Scene {
  private canProceed = false;
  private hint!: BitmapText;
  private elapsed = 0;

  constructor(game: Game) {
    super(game);
  }

  init(): void {
    const lines = [
      'Commission: Repair an old sword.',
      'Prepaid 30 coins.',
      'Location: Ben-Nacht forge, outer citadel.',
      'Client name: None.',
    ];

    let y = 100;
    for (const line of lines) {
      const text = new BitmapText({
        text: line,
        style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xcccccc },
      });
      text.anchor.set(0.5, 0);
      text.x = 240;
      text.y = y;
      this.container.addChild(text);
      y += 16;
    }

    this.hint = new BitmapText({
      text: 'PRESS ANY KEY',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x666666 },
    });
    this.hint.anchor.set(0.5, 0);
    this.hint.x = 240;
    this.hint.y = 200;
    this.hint.visible = false;
    this.container.addChild(this.hint);
  }

  enter(): void {
    this.container.visible = true;
    // Snap camera so gameContainer offset is (0,0)
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

  render(_alpha: number): void {
    // Static scene — nothing to interpolate
  }

  exit(): void {
    // Nothing to clean up
  }
}
