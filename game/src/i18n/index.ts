/**
 * i18n/index.ts — ECHORIS localization runtime.
 *
 * Locale defaults to Vite `--mode en|ko`, but the settings menu can switch
 * between the bundled EN/KO dictionaries at runtime. Already-rendered PIXI
 * labels still need their owning UI to redraw.
 *
 * Source flow:
 *   Sheets/Content_Localization.csv (SSoT)
 *     → Sheets/tools/csv_to_locale.mjs (predev / prebuild step)
 *       → game/src/i18n/locales/{en,ko}.json
 *         → bundled via this module
 *
 * Spec: Documents/System/System_Localization_Core.md §3.2, §4.6
 */

import enLocale from './locales/en.json';
import koLocale from './locales/ko.json';
// `@i18n/active` is aliased by Vite to the active locale JSON. tsc resolves the
// type via the ambient module declaration in `types.d.ts`.
import activeLocale from '@i18n/active';

export type Locale = 'en' | 'ko';

declare const __LOCALE__: Locale | undefined;

const initial: Locale = (typeof __LOCALE__ === 'string' ? __LOCALE__ : 'en') as Locale;
let currentLocale: Locale = initial;

const fallbackBundle = enLocale as Record<string, string>;
const activeBundle = activeLocale as Record<string, string>;
const bundles: Record<Locale, Record<string, string>> = {
  en: fallbackBundle,
  ko: koLocale as Record<string, string>,
};

const VAR_TOKEN = /\{(\w+)\}/g;

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(loc: Locale): void {
  currentLocale = loc;
}

/**
 * Resolve a key to a display string.
 *  1. current runtime locale bundle
 *  2. en bundle (fallback)
 *  3. key itself (debug visibility, never empty)
 *
 * Variable interpolation: `{name}` tokens are replaced with `vars.name`.
 * Missing tokens are preserved as `{name}` (debug visibility).
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  const bundle = bundles[currentLocale] ?? activeBundle;
  let raw = bundle[key];
  if (raw == null) raw = fallbackBundle[key];
  if (raw == null) return key;
  if (!vars) return raw;
  return raw.replace(VAR_TOKEN, (match, name: string) => {
    const v = vars[name];
    return v != null ? String(v) : match;
  });
}
