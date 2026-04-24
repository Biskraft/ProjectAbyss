/**
 * TitleScene.ts — Cinematic title screen matching ECHORIS presentation tone.
 *
 * Renders entirely in uiContainer (native resolution) for crisp text.
 *
 * Design reference: ECHORIS_AIHobbyDev_Presentation.html
 * - Background: #0a0a0a (void black)
 * - Title: Cinzel serif, uppercase, wide tracking
 * - Accent: #e87830 (forge orange)
 * - Secondary: #4a8a8a (teal)
 */

import { BitmapText, Text, TextStyle, Sprite, Assets, Container, Graphics } from 'pixi.js';
import { Scene } from '@core/Scene';
import { PIXEL_FONT } from '@ui/fonts';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { LdtkWorldScene } from './LdtkWorldScene';
import type { Game } from '../Game';
import { assetPath } from '@core/AssetLoader';

const LOGO_PATH = assetPath('assets/ui/title_logo.png');

// Presentation palette
const COL_VOID = 0x0a0a0a;
const COL_ACCENT = 0xe87830;
const COL_TEAL = 0x4a8a8a;
const COL_WHITE = 0xf0f0f0;
const COL_DIM = 0x3a3a48;

export class TitleScene extends Scene {
  private canProceed = false;
  private transitioning = false;
  private hint!: Text;
  private elapsed = 0;
  private pulseGfx!: Graphics;
  private accentLine!: Graphics;
  private uiRoot!: Container; // rendered at native res

  constructor(game: Game) {
    super(game);
  }

  async init(): Promise<void> {
    const s = this.game.uiScale;
    const sw = GAME_WIDTH * s;
    const sh = GAME_HEIGHT * s;
    const cx = sw / 2;
    const cy = sh / 2;

    // UI root — added to uiContainer for native-res rendering
    this.uiRoot = new Container();
    this.game.uiContainer.addChild(this.uiRoot);

    // Background fill (void black) — covers entire native canvas
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill(COL_VOID);
    this.uiRoot.addChild(bg);

    // Subtle horizontal grid lines (presentation aesthetic)
    const gridGfx = new Graphics();
    for (let ly = 0; ly < sh; ly += 80 * s) {
      gridGfx.rect(0, ly, sw, s).fill({ color: 0x1a3a3a, alpha: 0.15 });
    }
    this.uiRoot.addChild(gridGfx);

    // Pulsing radial glow behind title
    this.pulseGfx = new Graphics();
    this.uiRoot.addChild(this.pulseGfx);

    // Try loading logo image
    let logoLoaded = false;
    try {
      const tex = await Assets.load(LOGO_PATH);
      if (tex && tex.width > 1) {
        const logo = new Sprite(tex);
        logo.anchor.set(0.5);
        logo.scale.set(s);
        logo.x = cx;
        logo.y = cy - 30 * s;
        this.uiRoot.addChild(logo);
        logoLoaded = true;
      }
    } catch {
      // No logo file
    }

    if (!logoLoaded) {
      // Title text — Canvas2D Text for perfect clarity
      const titleText = new Text({
        text: 'ECHORIS',
        style: new TextStyle({
          fontFamily: '"Cinzel", serif',
          fontSize: 48 * s,
          fontWeight: '900',
          fill: COL_WHITE,
          letterSpacing: 12 * s,
        }),
      });
      titleText.anchor.set(0.5);
      titleText.x = cx;
      titleText.y = cy - 35 * s;
      this.uiRoot.addChild(titleText);
    }

    // Accent underline (forge orange)
    this.accentLine = new Graphics();
    this.accentLine.rect(cx - 80 * s, cy - 5 * s, 160 * s, s).fill({ color: COL_ACCENT, alpha: 0.7 });
    this.uiRoot.addChild(this.accentLine);

    // Subtitle — Canvas2D Text
    const subtitle = new Text({
      text: 'MEMORY BECOMES DUNGEON',
      style: new TextStyle({
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: 10 * s,
        fontWeight: '600',
        fill: COL_TEAL,
        letterSpacing: 4 * s,
      }),
    });
    subtitle.anchor.set(0.5);
    subtitle.x = cx;
    subtitle.y = cy + 10 * s;
    this.uiRoot.addChild(subtitle);

    // Press any key hint — Canvas2D Text
    const hintText = new Text({
      text: 'PRESS ANY KEY',
      style: new TextStyle({
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: 9 * s,
        fontWeight: '700',
        fill: COL_DIM,
        letterSpacing: 3 * s,
      }),
    });
    hintText.anchor.set(0.5);
    hintText.x = cx;
    hintText.y = cy + 50 * s;
    hintText.visible = false;
    this.hint = hintText;
    this.uiRoot.addChild(hintText);
  }

  enter(): void {
    if (this.uiRoot) this.uiRoot.visible = true;
    this.game.camera.snap(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.game.camera.target = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
  }

  update(dt: number): void {
    if (!this.hint) return;
    this.elapsed += dt;

    const s = this.game.uiScale;
    const cx = (GAME_WIDTH / 2) * s;
    const cy = (GAME_HEIGHT / 2) * s;

    // Pulsing radial glow
    if (this.pulseGfx) {
      this.pulseGfx.clear();
      const pulse = 0.3 + Math.sin(this.elapsed / 3000 * Math.PI * 2) * 0.15;
      const radius = (120 + Math.sin(this.elapsed / 3000 * Math.PI * 2) * 15) * s;
      this.pulseGfx.circle(cx, cy - 20 * s, radius).fill({ color: COL_ACCENT, alpha: pulse * 0.08 });
      this.pulseGfx.circle(cx, cy - 20 * s, radius * 0.6).fill({ color: COL_ACCENT, alpha: pulse * 0.12 });
    }

    // Accent line pulse
    if (this.accentLine) {
      this.accentLine.alpha = 0.5 + Math.sin(this.elapsed / 2000 * Math.PI * 2) * 0.3;
    }

    // Show hint after 1.5s
    if (!this.canProceed && this.elapsed >= 1500) {
      this.hint.visible = true;
      this.canProceed = true;
    }

    if (this.hint.visible) {
      this.hint.alpha = 0.3 + Math.sin(this.elapsed / 500) * 0.4;
    }

    if (this.canProceed && !this.transitioning && this.game.input.anyKeyJustPressed()) {
      this.transitioning = true;
      this.game.sceneManager.replace(new LdtkWorldScene(this.game));
    }
  }

  render(_alpha: number): void {}

  exit(): void {
    // uiRoot lives outside scene.container, so it must be explicitly destroyed here.
    if (this.uiRoot) {
      if (this.uiRoot.parent) {
        this.uiRoot.parent.removeChild(this.uiRoot);
      }
      this.uiRoot.destroy({ children: true });
    }
  }
}
