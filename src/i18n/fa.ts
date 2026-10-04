import type { Overrides } from "@astryxdesign/core/i18n";

/**
 * Persian strings for the stock Astryx components the app has migrated.
 *
 * Astryx ships no `fa` catalog, so components inside the app-wide
 * `InternationalizationProvider locale="fa"` subtree fall back to English
 * defaults unless a key is overridden here. Every Astryx component the app
 * actually renders must have its keys listed below — an untranslated key is
 * English text inside a Persian-first UI.
 *
 * Grow this file as components are migrated: the keys are the `@astryx.*`
 * message ids those components resolve (see `node_modules/@astryxdesign/core/locales/en.json`).
 */
export const faOverrides: Overrides = {
  fa: {
    // Button / IconButton — spinner live-region announcement while an action runs.
    "@astryx.button.loading": "در حال انجام",
    // Field — the required/optional indicator next to a label.
    "@astryx.field.required": "الزامی",
    "@astryx.field.optional": "اختیاری",
    // TextInput — screen-reader label on the clear (×) button. `{label}` must stay.
    "@astryx.textInput.clearLabel": "پاک کردن {label}",
  },
};