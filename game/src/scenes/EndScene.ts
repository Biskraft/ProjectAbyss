/**
 * EndScene.ts — Screen 22+: End credits with play statistics.
 *
 * 2s blackout → stats fade in → "The Abyss deepens..." → Press any key → TitleScene.
 */

import { BitmapText, Graphics } from 'pixi.js';
import { Scene } from '@core/Scene';
import { PIXEL_FONT } from '@ui/fonts';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { TitleScene } from './TitleScene';
import type { Game } from '../Game';

export class EndScene extends Scene {
  private elapsed = 0;
  private canProceed = false;
  private elements: BitmapText[] = [];

  constructor(game: Game) {
    super(game);
  }

  init(): void {
    // Black background
    const bg = new Graphics();
    bg.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(0x000000);
    this.container.addChild(bg);

    const s = this.game.stats;
    const mins = Math.floor(s.playTimeMs / 60000);
    const secs = Math.floor((s.playTimeMs % 60000) / 1000);
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const statLines = [
      `Enemies defeated: ${s.enemiesKilled}`,
      `Items collected: ${s.itemsCollected}`,
      `Gates broken: ${s.gatesBroken}`,
      `Play time: ${timeStr}`,
    ];

    // Stats (shown at 3s)
    let y = 80;
    for (const line of statLines) {
      const text = this.makeText(line, 0xaaaaaa, y);
      text.alpha = 0;
      this.elements.push(text);
      y += 16;
    }

    // "The Abyss deepens..." (shown at 5s)
    const abyssText = this.makeText('The Abyss deepens...', 0x8888ff, 170);
    abyssText.alpha = 0;
    this.elements.push(abyssText);

    // "PRESS ANY KEY" (shown at 8s)
    const hintText = this.makeText('PRESS ANY KEY TO RETURN TO TITLE', 0x666666, 220);
    hintText.alpha = 0;
    this.elements.push(hintText);
  }

  private makeText(content: string, color: number, y: number): BitmapText {
    const text = new BitmapText({
      text: content,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: color },
    });
    text.anchor.set(0.5, 0);
    text.x = 240;
    text.y = y;
    this.container.addChild(text);
    return text;
  }

  enter(): void {
    this.container.visible = true;
    this.game.camera.snap(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.game.camera.target = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
  }

  update(dt: number): void {
    this.elapsed += dt;

    // Fade in stats at 3s
    if (this.elapsed >= 3000) {
      for (let i = 0; i < 4; i++) {
        const el = this.elements[i];
        el.alpha = Math.min(1, (this.elapsed - 3000) / 1000);
      }
    }

    // Fade in "The Abyss deepens..." at 5s
    if (this.elapsed >= 5000) {
      this.elements[4].alpha = Math.min(1, (this.elapsed - 5000) / 1000);
    }

    // Show hint at 8s
    if (this.elapsed >= 8000) {
      const hint = this.elements[5];
      hint.alpha = 0.5 + Math.sin(this.elapsed / 400) * 0.5;
      this.canProceed = true;
    }

    if (this.canProceed && this.game.input.anyKeyJustPressed()) {
      this.game.sceneManager.replace(new TitleScene(this.game));
    }
  }

  render(_alpha: number): void {
    // Static scene
  }

  exit(): void {
    // Nothing to clean up
  }
}
