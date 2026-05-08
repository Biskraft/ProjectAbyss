/**
 * factories.ts — locale-aware PIXI display object factories.
 *
 * UI text is rendered via two backends:
 *  - EN: BitmapText with the bundled PIXEL_FONT (Rajdhani pixel atlas).
 *        Crisp at integer uiScale, no glyph blowup.
 *  - KO: PIXI.Text with Noto Sans KR (CJK glyph coverage).
 *        Pixel-art crispness is sacrificed in exchange for full hangul.
 *
 * The branch is decided at module-load time via `getLocale()` (i18n is
 * build-time fixed in Phase 2). For Phase 3 runtime locale switching,
 * existing nodes will need to be recreated — see System_Localization_Core.md
 * §3.3.
 *
 * Spec: System_Localization_Core.md §4.9
 */

import { BitmapText, Text, type TextStyleOptions } from 'pixi.js';
import { getLocale } from '@i18n';
import { PIXEL_FONT } from './fonts';

/**
 * KR fallback chain. IBM Plex Sans KR is listed as a near-tone alternative
 * (matches Rajdhani-ish weight). Press Start 2P at the tail handles latin
 * fallback if Noto Sans KR fails to load. sans-serif catches everything else.
 */
const KO_FONT_FAMILY = '"Noto Sans KR", "IBM Plex Sans KR", "Press Start 2P", sans-serif';

/**
 * KO render size adjustment relative to caller's fontSize. Originally bumped
 * +2 to compensate for hangul x-height vs latin pixel atlas, but that pushed
 * KO text well past BitmapText layout assumptions (slot labels overlapping,
 * DIVE/CANCEL pills overflowing, equipment grid stacking). Set to 0 so KO
 * Text sits inside the same pixel budget as the original EN BitmapText
 * layout — Korean glyphs read as slightly thinner but layouts hold.
 *
 * Tuned 2026-05-08 against InventoryUI/Forge mode (Victor full-screen
 * audit).
 */
const KO_FONT_SIZE_BOOST = 0;

/**
 * Default texture resolution for KO PIXI.Text nodes.
 *
 * Almost every UI container in ECHORIS does `container.scale.set(uiScale)` so
 * a fontSize=8 node ends up rendered at `8 * uiScale` device pixels. PIXI.Text
 * defaults to resolution=1, which makes the canvas-backed glyph texture only
 * 8 px tall — bilinearly stretched 3× by the container, so KO text looks
 * blurry while latin BitmapText (atlas-backed, already crisp) stays sharp.
 *
 * Game.init() calls setDefaultUiScale(this.uiScale) once at boot so every
 * KO text node downstream picks up a 3× density texture and renders 1:1.
 * Callers that already pass an explicit `resolution` argument to createUiText
 * (e.g. LoreDisplay) override this default.
 */
let defaultUiScale = 1;

export function setDefaultUiScale(scale: number): void {
  defaultUiScale = Math.max(1, scale);
}

/**
 * Locale-aware font-family substitution for `PIXI.Text` styles that already use
 * a custom latin family (Cinzel, Rajdhani). KO builds need a CJK-capable font
 * regardless of which latin family the caller intended.
 *
 * Use this when you keep `new Text({...})` directly (e.g. TitleScene which has
 * its own Cinzel/Rajdhani styling) instead of going through `createUiText`.
 */
export function localizeFontFamily(latinFamily: string): string {
  return getLocale() === 'ko' ? KO_FONT_FAMILY : latinFamily;
}

/**
 * Create a locale-appropriate UI text node.
 *
 *  - EN locale → BitmapText with PIXEL_FONT (atlas glyphs, pixel-perfect at
 *    integer scale).
 *  - KO locale → PIXI.Text with Noto Sans KR (CJK glyph coverage).
 *
 * The caller can pass `resolution` to force higher-density rasterization for
 * KO text inside an upscaled container — e.g. `resolution: uiScale` so a
 * scale-3 container does not bilinearly stretch a 1x texture.
 *
 * Style is forwarded with the locale-appropriate font family override; all
 * other style fields (fontSize, fill, letterSpacing, etc.) flow through.
 */
export function createUiText(
  text: string,
  style: TextStyleOptions,
  resolution?: number,
  latinFont: string = PIXEL_FONT,
): BitmapText | Text {
  const effectiveResolution = resolution ?? defaultUiScale;
  if (getLocale() === 'ko') {
    const enSize = typeof style.fontSize === 'number' ? style.fontSize : 8;
    const koSize = enSize + KO_FONT_SIZE_BOOST;
    const node = new Text({
      text,
      style: {
        ...style,
        fontFamily: KO_FONT_FAMILY,
        fontSize: koSize,
        // Hangul 받침 (jongsung) extends below the alphabetic baseline. PIXI's
        // default texture bounds clip these descenders, so widen via padding.
        // lineHeight ratio kept tight (1.15) so vertical row pitch stays close
        // to BitmapText layouts that callers tuned for fontSize 8 / 10 / 12.
        padding: Math.max(2, Math.round(koSize * 0.25)),
        lineHeight: Math.round(koSize * 1.15),
      },
    });
    if (effectiveResolution > 1) node.resolution = effectiveResolution;
    return node;
  }
  // EN branch — caller picks the latin BitmapFont (PIXEL_FONT default,
  // TITLE_FONT for AreaTitle, etc.).
  return new BitmapText({
    text,
    style: { ...style, fontFamily: latinFont },
  });
}
