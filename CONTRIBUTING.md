# Contributing

- `bun install`, then `bun run verify` before every push: kit lock check, `rules:check` (baseline only shrinks),
  typecheck, unit + DOM tests, desktop build, bundle budgets (`docs/slo.md`).
- TDD: a behaviour change starts with a failing test. Stream logic is tested on JSON fixtures of real runs
  (`src/chat/tools/fixtures`); views get a `*.dom.test.tsx` (happy-dom, `bun run test:dom`).
- UI: primitives from `src/primitives.ts`, strings in `src/i18n/ui.en.json` and `ui.ru.json`, colours from tokens, icons from
  `src/app-icons`. Markdown and CodeMirror live in `src/vendor-ui` (the exceptions zone).
- Host access only through `HostClient` (`src/host`); the `/runtime/v1` seam is generated (`bun run gen:host-seam`).
- A decision that changes a contract or a budget is an ADR in `docs/adr`.
- Push to `main`; CI runs the same `verify` plus coverage.
