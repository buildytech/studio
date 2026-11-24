# ADR 0004 — Exceptions: markdown, CodeMirror, mermaid

Status: accepted (2026-11-24, owner t151u: «маркдаун пока не нужен»)

## Context

Three parts of the Studio render DOM that no UI8Kit primitive can produce: assistant markdown (`marked` +
`DOMPurify`, written with `innerHTML`), the CodeMirror 6 editor, and mermaid diagrams (SVG generated at runtime).

## Decision

- They live in a declared **vendor-wrapper zone** (`src/vendor-ui/`: `markdown.ts`, `CodeEditor.tsx`, the markdown
  host element) that `rules:check` skips, with this ADR as the written reason (contract rule 05: explicit opt-out
  with a reason).
- The wrappers are not rewritten. Their host element is a kit primitive (`Box`), the HTML stays sanitized by
  DOMPurify, mermaid runs only after sanitizing.
- No new code enters the zone without a new ADR.

## Consequences

- Two `innerHTML` writes remain, both behind DOMPurify. A markdown-to-primitives renderer is a later, separate
  decision.
