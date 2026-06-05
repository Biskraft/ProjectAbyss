/**
 * EndingScene — Phase C "Demo End" static UI.
 *
 * Lives on `game.uiContainer` (native-resolution layer) following the
 * TitleScene pattern, so text stays sharp and *uiScale only applies once.
 * (The base Scene.container hangs off gameContainer which is rendered to a
 * 640×360 RT then upscaled — adding the UI there would double-scale it.)
 *
 * Per user direction 2026-05-17:
 *   - Wishlist primary CTA + "Wishlist on Steam" line omitted.
 *   - Three clickable CTAs: Steam Page + Community Discord + Follow on X.
 *   - Any keyboard key returns to the title (CTA clicks fire external links
 *     and do *not* leave this scene).
 *
 * Spec: game/docs/ui-components.html §ending-scene Phase C.
 */

import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import { Scene } from '@core/Scene';
import { localizeFontFamily } from '@ui/factories';
import { t } from '@i18n';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { TitleScene } from './TitleScene';
import type { Game } from '../Game';
import { destroyDisplayObject } from './shared/DisplayObjectLifecycleHelpers';

const STEAM_URL   = 'https://store.steampowered.com/app/4756940/ECHORIS/';
const DISCORD_URL = 'https://discord.gg/nqEcnZbS2c';
const X_URL       = 'https://x.com/Strata_Forge';

const COL_BG       = 0x000000;
const COL_TITLE    = 0xf0f0f0;
const COL_TITLE_SUB = 0x7c7c95;
const COL_SUB      = 0xb0b0b0;
const COL_CTA_DIM  = 0xb0b0b0;
const COL_CTA_HI   = 0xf0f0f0;
const COL_BRD_DIM  = 0x2a8a8a;
const COL_BRD_HI   = 0x4a8a8a;
const COL_HINT     = 0x6a6a78;

const FADEIN_MS = 1000;
const INPUT_DELAY_MS = 1100;

interface Cta {
  hit: Graphics;
  border: Graphics;
  text: Text;
  rect: { x: number; y: number; w: number; h: number };
  hovered: boolean;
}

export class EndingScene extends Scene {
  private uiRoot!: Container;
  private fadeRoot!: Container;
  private ctas: Cta[] = [];
  private elapsed = 0;

  constructor(game: Game) { super(game); }

  init(): void {
    const s = this.game.uiScale;
    const sw = GAME_WIDTH * s;
    const sh = GAME_HEIGHT * s;
    const cx = sw / 2;
    const cy = sh / 2;

    this.uiRoot = new Container();
    this.game.uiContainer.addChild(this.uiRoot);

    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill(COL_BG);
    this.uiRoot.addChild(bg);

    this.fadeRoot = new Container();
    this.fadeRoot.alpha = 0;
    this.uiRoot.addChild(this.fadeRoot);

    const title = new Text({
      text: t('ending.demo_complete'),
      style: new TextStyle({
        fontFamily: localizeFontFamily('"Cinzel", serif'),
        fontSize: 30 * s,
        fontWeight: '900',
        fill: COL_TITLE,
        letterSpacing: 7 * s,
      }),
    });
    title.anchor.set(0.5);
    title.x = cx;
    title.y = cy - 50 * s;
    this.fadeRoot.addChild(title);

    // Sub-title is the *opposite* language of the main title (EN locale gets
    // a KR sub, KO locale gets an EN sub) so we can't lean on
    // `localizeFontFamily` here — it would pick a CJK-only family when
    // running EN and a latin-only family when running KO. Use an explicit
    // chain so each glyph falls through to a font that has it.
    const titleSub = new Text({
      text: t('ending.demo_complete_sub'),
      style: new TextStyle({
        fontFamily: '"Rajdhani", "Noto Sans KR", "IBM Plex Sans KR", sans-serif',
        fontSize: 10 * s,
        fontWeight: '600',
        fill: COL_TITLE_SUB,
        letterSpacing: 3.5 * s,
      }),
    });
    titleSub.anchor.set(0.5);
    titleSub.x = cx;
    titleSub.y = cy - 26 * s;
    this.fadeRoot.addChild(titleSub);

    const sub = new Text({
      text: t('ending.subtext'),
      style: new TextStyle({
        fontFamily: localizeFontFamily('"Rajdhani", sans-serif'),
        fontSize: 11 * s,
        fontWeight: '400',
        fill: COL_SUB,
        align: 'center',
      }),
    });
    sub.anchor.set(0.5);
    sub.x = cx;
    sub.y = cy - 4 * s;
    this.fadeRoot.addChild(sub);

    this.buildCtaRow(cx, cy + 32 * s, s);

    const hint = new Text({
      text: t('title.press_any'),
      style: new TextStyle({
        fontFamily: localizeFontFamily('"Rajdhani", sans-serif'),
        fontSize: 8 * s,
        fontWeight: '500',
        fill: COL_HINT,
        letterSpacing: 1.5 * s,
      }),
    });
    hint.anchor.set(0.5);
    hint.x = cx;
    hint.y = cy + 76 * s;
    this.fadeRoot.addChild(hint);
  }

  private buildCtaRow(cx: number, ctaY: number, s: number): void {
    const ctaH = 22 * s;
    const ctaPadX = 14 * s;
    const ctaGap = 10 * s;

    const defs = [
      { label: t('ending.cta_steam'),   url: STEAM_URL },
      { label: t('ending.cta_discord'), url: DISCORD_URL },
      { label: t('ending.cta_x'),       url: X_URL },
    ];

    const items = defs.map(d => {
      const text = new Text({
        text: d.label,
        style: new TextStyle({
          fontFamily: localizeFontFamily('"Rajdhani", sans-serif'),
          fontSize: 9 * s,
          fontWeight: '600',
          fill: COL_CTA_DIM,
          letterSpacing: 2 * s,
        }),
      });
      return { text, url: d.url, w: text.width + ctaPadX * 2 };
    });

    const totalW = items.reduce((a, it) => a + it.w, 0) + ctaGap * (items.length - 1);
    let x = cx - totalW / 2;

    for (const it of items) {
      const rect = { x, y: ctaY, w: it.w, h: ctaH };

      // Invisible hit target — needs a fill so Pixi picks it up. Stays in
      // fadeRoot so it ignores clicks during the initial 600 ms fade.
      const hit = new Graphics();
      hit.rect(rect.x, rect.y, rect.w, rect.h).fill({ color: 0x000000, alpha: 0.001 });
      hit.eventMode = 'static';
      hit.cursor = 'pointer';
      hit.hitArea = new Rectangle(rect.x, rect.y, rect.w, rect.h);
      this.fadeRoot.addChild(hit);

      const border = new Graphics();
      this.fadeRoot.addChild(border);

      it.text.x = rect.x + ctaPadX;
      it.text.y = rect.y + (rect.h - it.text.height) / 2;
      this.fadeRoot.addChild(it.text);

      const cta: Cta = { hit, border, text: it.text, rect, hovered: false };
      this.ctas.push(cta);
      this.drawCta(cta);

      const url = it.url;
      hit.on('pointerover', () => { cta.hovered = true;  this.drawCta(cta); });
      hit.on('pointerout',  () => { cta.hovered = false; this.drawCta(cta); });
      hit.on('pointertap',  () => {
        if (this.elapsed < INPUT_DELAY_MS) return;
        window.open(url, '_blank', 'noopener,noreferrer');
      });

      x += rect.w + ctaGap;
    }
  }

  private drawCta(cta: Cta): void {
    const { rect, hovered } = cta;
    cta.border.clear();
    cta.border.rect(rect.x, rect.y, rect.w, rect.h)
      .stroke({ color: hovered ? COL_BRD_HI : COL_BRD_DIM, width: 1, alignment: 0.5 });
    cta.text.style.fill = hovered ? COL_CTA_HI : COL_CTA_DIM;
  }

  enter(): void {
    this.container.visible = true;
    if (this.uiRoot) this.uiRoot.visible = true;
    this.game.camera.snap(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.game.camera.target = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (this.elapsed >= FADEIN_MS) {
      this.fadeRoot.alpha = 1;
    } else {
      // ease-in cubic — start near-invisible, accelerate. Prevents the first
      // ~3 frames from already being at ~10 % opacity (which read as a flash
      // of bright text on the black backdrop).
      const t = this.elapsed / FADEIN_MS;
      this.fadeRoot.alpha = t * t * t;
    }

    if (this.elapsed < INPUT_DELAY_MS) return;

    if (this.game.input.anyKeyJustPressed()) {
      this.game.sceneManager.replace(new TitleScene(this.game));
    }
  }

  render(_alpha: number): void { /* static */ }

  exit(): void {
    if (this.uiRoot) destroyDisplayObject(this.uiRoot, { children: true });
  }
}
