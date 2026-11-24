# ADR 0006 — The preview frame is an exception

Status: accepted (2026-11-24)

## Context

The Preview panel shows the user's app in an `<iframe>` served from the preview origin. UI8Kit has no frame primitive,
and the frame needs `allow="clipboard-read *; clipboard-write *"` (Permissions-Policy delegation) or paste and copy
inside the app fail.

## Decision

The frame lives in the exceptions zone of ADR 0004 as `src/vendor-ui/PreviewFrame.tsx`, the only `<iframe>` of the
Studio. Its props are the title, the class, the ref (the panel arms the grant URL on it once) and the load event.

## Consequences

`rules:check` reports no raw tag for the preview; a second frame would need this ADR amended.
