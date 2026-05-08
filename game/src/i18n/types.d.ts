/**
 * Ambient declaration for the Vite-aliased active locale module.
 *
 * `@i18n/active` is resolved by Vite (vite.config.ts) to either
 *   src/i18n/locales/en.json  (default / `--mode en`)
 *   src/i18n/locales/ko.json  (`--mode ko`)
 *
 * tsc cannot follow the alias at compile time, so this declaration provides a
 * stable type. The shape matches the JSON bundles produced by csv_to_locale.mjs.
 */
declare module '@i18n/active' {
  const bundle: Record<string, string>;
  export default bundle;
}
