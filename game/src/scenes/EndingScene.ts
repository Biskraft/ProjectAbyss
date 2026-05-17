/**
 * EndingScene — Demo End UI (Phase C of `docs/ui-components.html` §ending-sequence).
 *
 * Per user direction 2026-05-17 the Steam wishlist primary CTA and the
 * "Wishlist on Steam to continue." line are intentionally omitted for this
 * pass. Layout reuses the spec's spacing/typography otherwise.
 *
 * Phase A/B (fade + ECHORIS title) are NOT included here — this scene is
 * the static Phase C card only. The caller (LdtkWorldScene) decides when
 * to swap to this scene.
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Scene } from '@core/Scene';
import { localizeFontFamily } from '@ui/factories';
import { t } from '@i18n';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { TitleScene } from './TitleScene';
import type { Game } from '../Game';

// Spec colors (ui-components.html §ending-sequence Phase C)
const COL_BG       = 0x000000;
const COL_TITLE    = 0xf0f0f0;
const COL_TITLE_KR = 0x7c7c95;
const COL_SUB      = 0xb0b0b0;
const COL_CTA_TEXT = 0xb0b0b0;
const COL_CTA_HI   = 0xf0f0f0;
const COL_CTA_BRD  = 0x2a8a8a;
const COL_CTA_BRD_HI = 0x4a8a8a;

export class EndingScene extends Scene {
  private root!: Container;
  private elapsed = 0;
  private canProceed = false;
  private ctaRects: Array<{ x: number; y: number; w: number; h: number }> = [];

  constructor(game: Game) { super(game); }

  init(): void {
    const s = this.game.uiScale;
    this.root = new Container();
    this.container.addChild(this.root);

    // Background — pure black stage.
    const bg = new Graphics();
    bg.rect(0, 0, GAME_WIDTH * s, GAME_HEIGHT * s).fill(COL_BG);
    this.root.addChild(bg);

    const cx = (GAME_WIDTH / 2) * s;
    const cy = (GAME_HEIGHT / 2) * s;

    // Title (English, primary per global persona)
    const title = new Text({
      text: t('ending.demo_complete'),
      style: new TextStyle({
        fontFamily: localizeFontFamily('"Cinzel", serif'),
        fontSize: 18 * s,
        fontWeight: '900',
        fill: COL_TITLE,
        letterSpacing: 6 * s,
      }),
    });
    title.anchor.set(0.5);
    title.x = cx;
    title.y = cy - 50 * s;
    this.root.addChild(title);

    // KR sub-title under the English title
    const titleKr = new Text({
      text: t('ending.demo_complete_kr'),
      style: new TextStyle({
        fontFamily: localizeFontFamily('"Rajdhani", sans-serif'),
        fontSize: 8 * s,
        fontWeight: '600',
        fill: COL_TITLE_KR,
        letterSpacing: 3 * s,
      }),
    });
    titleKr.anchor.set(0.5);
    titleKr.x = cx;
    titleKr.y = cy - 30 * s;
    this.root.addChild(titleKr);

    // Subtext (wishlist line intentionally omitted)
    const sub = new Text({
      text: t('ending.subtext'),
      style: new TextStyle({
        fontFamily: localizeFontFamily('"Rajdhani", sans-serif'),
        fontSize: 9 * s,
        fontWeight: '400',
        fill: COL_SUB,
        align: 'center',
      }),
    });
    sub.anchor.set(0.5);
    sub.x = cx;
    sub.y = cy - 10 * s;
    this.root.addChild(sub);

    // CTA secondary row (Restart Demo / Community Discord). Primary
    // wishlist CTA omitted per user direction.
    const ctaY = cy + 30 * s;
    const ctaPadX = 14 * s;
    const ctaH = 18 * s;
    const ctaGap = 12 * s;

    const restartLabel = t('ending.cta_restart');
    const discordLabel = t('ending.cta_discord');

    // Measure
    const restartText = this.makeCtaText(restartLabel, s);
    const discordText = this.makeCtaText(discordLabel, s);
    const restartW = restartText.width + ctaPadX * 2;
    const discordW = discordText.width + ctaPadX * 2;
    const totalW = restartW + discordW + ctaGap;
    const restartX = cx - totalW / 2;
    const discordX = restartX + restartW + ctaGap;

    this.drawCtaButton(restartX, ctaY, restartW, ctaH);
    restartText.x = restartX + ctaPadX;
    restartText.y = ctaY + (ctaH - restartText.height) / 2;
    this.root.addChild(restartText);

    this.drawCtaButton(discordX, ctaY, discordW, ctaH);
    discordText.x = discordX + ctaPadX;
    discordText.y = ctaY + (ctaH - discordText.height) / 2;
    this.root.addChild(discordText);

    this.ctaRects = [
      { x: restartX, y: ctaY, w: restartW, h: ctaH },
      { x: discordX, y: ctaY, w: discordW, h: ctaH },
    ];
    void COL_CTA_HI; void COL_CTA_BRD_HI;  // reserved for hover-state once input wiring lands
  }

  private makeCtaText(label: string, s: number): Text {
    return new Text({
      text: label,
      style: new TextStyle({
        fontFamily: localizeFontFamily('"Rajdhani", sans-serif'),
        fontSize: 8 * s,
        fontWeight: '600',
        fill: COL_CTA_TEXT,
        letterSpacing: 2 * s,
      }),
    });
  }

  private drawCtaButton(x: number, y: number, w: number, h: number): void {
    const g = new Graphics();
    g.rect(x, y, w, h)
      .stroke({ color: COL_CTA_BRD, width: 1, alignment: 0.5 });
    this.root.addChild(g);
  }

  enter(): void {
    this.container.visible = true;
    this.game.camera.snap(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.game.camera.target = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
  }

  update(dt: number): void {
    this.elapsed += dt;
    // Short delay so the previous-scene fade-out can complete before the
    // ending text is "claimable" by an accidental keypress.
    if (this.elapsed >= 800) this.canProceed = true;
    if (!this.canProceed) return;

    // For now any input returns to the title (Restart Demo equivalent).
    // CTA-specific routing (Discord link, etc.) is wired later when input
    // mapping for the secondary buttons is finalised.
    if (this.game.input.anyKeyJustPressed()) {
      this.game.sceneManager.replace(new TitleScene(this.game));
    }
    void this.ctaRects;
  }

  render(_alpha: number): void { /* static */ }

  exit(): void {
    if (this.root.parent) this.root.parent.removeChild(this.root);
    this.root.destroy({ children: true });
  }
}
