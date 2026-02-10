# AI Agent Rules for GymProgress

These are rules for any AI agent creating or editing code in this repository.

1. Localization (required)
   - Always use the `GN_I18N` helper for user-facing strings. Prefer `GN_I18N.t('key')` rather than hard-coded text.
   - When adding placeholders or attributes in the DOM, use `data-i18n` or `GN_I18N.t()` consistently.
   - Use the helper functions exposed in `gn-i18n.js`: `GN_I18N.t(key)`, `GN_I18N.getLang()`, `GN_I18N.applyTranslations(root)` and `GN_I18N.localizeExerciseType(type)`.
   - Prefer `GN_I18N.t` for translations and `GN_I18N.applyTranslations(document)` to auto-apply `data-i18n` attributes.

2. Exercise name selection (required)
   - When displaying exercise names, select the localized Portuguese name when the app language is Portuguese.
   - Use `exercise.namePT` for Portuguese display; fall back to `exercise.name` when not available.
   - Example pattern to use in JS:

```javascript
const lang = (window.GN_I18N && GN_I18N.getLang) ? GN_I18N.getLang() : 'en';
const displayName = (lang === 'pt' && exercise.namePT) ? exercise.namePT : (exercise.name || `#${exercise.id}`);
// or use GN_I18N helpers directly
const displayName2 = (GN_I18N.getLang() === 'pt' && exercise.namePT) ? exercise.namePT : (exercise.name || `#${exercise.id}`);
// use GN_I18N.t for other strings and GN_I18N.applyTranslations(document) to apply data-i18n attributes
```

3. When creating or editing UI/HTML
   - Never hard-code visible text. Use `GN_I18N.t('key')` for all labels, button text, placeholders and messages.
   - Add `data-i18n` attributes to static HTML where appropriate so `gn-i18n.js` can translate automatically.


4. Review checklist for edits
   - All user-visible strings use `GN_I18N.t` or `data-i18n`.
   - Portuguese name (`namePT`) used when `GN_I18N.getLang()` returns `pt`.

---