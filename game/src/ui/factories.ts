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
 * Hangul x-height runs visibly smaller than the latin pixel atlas at the same
 * point size. We bump KO render size globally so perceived weight matches the
 * EN BitmapText baseline. Tuned 2026-05-08 against LoreDisplay (Victor visual).
 */
const KO_FONT_SIZE_BOOST = 2;

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
  resolution: number = 1,
  latinFont: string = PIXEL_FONT,
): BitmapText | Text {
  if (getLocale() === 'ko') {
    const enSize = typeof style.fontSize === 'number' ? style.fontSize : 8;
    const koSize = enSize + KO_FONT_SIZE_BOOST;
    const node = new Text({
      text,
      style: {
        ...style,
        fontFamily: KO_FONT_FAMILY,
        fontSize: koSize,
        // Hangul 받침 (jongsung) extends well below the alphabetic baseline.
        // PIXI.Text's default texture bounds clip these descenders, so add
        // padding sized to the font. lineHeight 1.3 also gives the glyph room
        // to breathe without the texture trimming the bottom row.
        padding: Math.max(2, Math.round(koSize * 0.25)),
        lineHeight: Math.round(koSize * 1.3),
      },
    });
    if (resolution > 1) node.resolution = resolution;
    return node;
  }
  // EN branch — caller picks the latin BitmapFont (PIXEL_FONT default,
  // TITLE_FONT for AreaTitle, etc.).
  return new BitmapText({
    text,
    style: { ...style, fontFamily: latinFont },
  });
}
