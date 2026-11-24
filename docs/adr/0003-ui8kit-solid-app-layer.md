# ADR 0003 — UI8Kit 3 for Solid and the contract rules for the app layer

Status: accepted (2026-11-24, owner t152u)

## Context

[ui8kit/contract](https://github.com/ui8kit/contract) (`5611b44`) defines three layers. The Studio is the **apps**
layer: brand style is free (no 8+4, no ui8px, no spacing group), but the retag rule (primitives with `tag`, no bare
tags), ARIA through primitive props, colors via tokens, Lucide icons, no inline `style` and texts from the dictionary
apply to every screen. The Studio came with a vendored `@ui8kit/codegen` snapshot (`src/ui`, 107 files) whose
manifest no longer matched, 305 bare tags in 19 TSX files, about 260 literal strings, 222 app-only CSS classes and
103 hard-coded colors (measured on `5e41766`, see `docs/ux-review.md`).

## Decision

- The kit comes from `npx ui8kit@3 init --yes --framework solid` + `add` (registry, `ui8kit.lock.json`,
  `ui8kit check`); kit files are never edited by hand.
- Zones: kit and vendor wrappers are not scanned; every other `src` file is the composition zone of the app layer.
  `bun run rules:check` runs the detectors `raw-native-tag`, `raw-html`, `dynamic-tag`, `inline-style`,
  `literal-text`, `hardcoded-color`, `svg-outside-icon` over it.
- New code has a zero baseline. Files not yet refactored are listed in `rules/baseline.json` with their counts; the
  gate fails when a count grows and asks to re-record when it shrinks, so the list only goes down.
- Words live in `src/i18n/ui.en.json` (DictionaryV04 shape `{ locale, messages }`); components call `t("key")`.
- Colors and type sizes are tokens (`src/styles/tokens.css`); layout utilities are Tailwind classes; the brand theme
  keeps the existing dark palette.

## Consequences

- The refactor runs file by file; each step shrinks the baseline and keeps the 62 tests green.
- 8+4 is not enforced on the Studio (app layer); blocks taken from the registry keep their own 8+4.
