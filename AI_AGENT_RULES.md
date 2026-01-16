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

4. Backwards compatibility
   - Logs (`db.logs`) may contain older entries without `exerciseName` or `isCustom`. When rendering history or logs, resolve names by looking up `db.custom_exercises` and `db.catalog_exercises` using `exerciseId`.

5. Images
   - Resolve images via `db.custom_images` or `db.catalog_images`. Use a `defaultImage` fallback when missing.

6. Error handling & fallbacks
   - If a localized string is missing, fall back to an English key or a safe default.
   - If an exercise name cannot be resolved, display `#<exerciseId>` rather than `undefined`.

7. Examples for usage in History rendering

- Localize strings:
```javascript
const setsText = (window.GN_I18N && typeof GN_I18N.t === 'function') ? GN_I18N.t('history_fmt_sets_short') : 'sets';
```
 - Localize strings with the helper:
 -```javascript
 +const setsText = GN_I18N.t('history_fmt_sets_short');
 +// or safely:
 +const setsTextSafe = (window.GN_I18N && typeof GN_I18N.t === 'function') ? GN_I18N.t('history_fmt_sets_short') : 'sets';
 -```

- Choose name based on language:
```javascript
const lang = (window.GN_I18N && GN_I18N.getLang) ? GN_I18N.getLang() : 'en';
const displayName = (lang === 'pt' && exercise.namePT) ? exercise.namePT : (exercise.name || `#${exercise.id}`);
```
 - Choose name based on language (use `GN_I18N.getLang()`):
 -```javascript
 +const displayName = (GN_I18N.getLang() === 'pt' && exercise.namePT) ? exercise.namePT : (exercise.name || `#${exercise.id}`);
 +// when rendering many elements, use GN_I18N.applyTranslations(document) after inserting nodes
 -```

8. Review checklist for edits
   - All user-visible strings use `GN_I18N.t` or `data-i18n`.
   - Portuguese name (`namePT`) used when `GN_I18N.getLang()` returns `pt`.
   - Fallbacks present for missing exercise names/images/strings.
   - Tests or manual verification steps described in PR or commit message.

---