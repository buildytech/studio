# ADR 0005 — Tool calls in the chat: one normalized model, a composite view, a renderer registry

Status: accepted (2026-11-24, owner t154u)

## Context

The seam streams `tool.started`, `tool.delta` and `tool.finished` (Agent Contract v1), correlated by `callId`. The
Studio folded them in two places (`chat/event-reduce.ts` for tests, a second copy inside `ChatPanel.tsx`), showed
every call as its own row (a 30-tool run is 30 rows of «FILE read … done»), kept shell output without a bound and
had no live status for screen readers.

## Decision

1. **Model.** `src/chat/tools/model.ts`: `ToolCall { id, tool, kind, status: running | done | error | cancelled,
   summary, output, truncated, startedAt, endedAt }` and a pure reducer `reduceToolEvent(calls, event)` over
   `started | delta | finished` plus `cancel(runId)` when the run is aborted or the session goes idle with calls
   still running. Output keeps the last `TOOL_OUTPUT_MAX` characters and marks `truncated`.
2. **Composite view.** `ToolCall.Root / Header / Status / Body / Actions` (`src/chat/tools/ToolCall.tsx`), all built
   from UI8Kit primitives. A renderer composes the slots; it never re-implements the frame.
3. **Registry (open/closed).** `src/chat/tools/registry.ts` maps a kind to a renderer: `shell`, `edit`, `read`,
   `search`, `preview`, `fallback`. A new tool kind is one `register()` call; the core does not change.
4. **Grouping.** Consecutive finished calls of the same kind collapse into one group row («read 12 files») that
   expands on demand; a running or failed call is never hidden.
5. **Long streams.** The message list renders the last `CHAT_RENDER_WINDOW` items and a «show earlier» control;
   tool output is clipped per call (point 1).
6. **Accessibility.** One `aria-live="polite"` status region per run announces «running tool / done / failed»
   changes, not every delta. Status is text + icon, never color only.
7. **TDD.** JSON fixtures of real event streams (`src/chat/tools/fixtures/*.json`) drive reducer tests and DOM/ARIA
   tests of the composite view (jsdom).

## Consequences

- The chat panel consumes one reducer; the duplicate fold goes.
- Adding e.g. a «deploy» tool is a renderer file and a registry line.

## Implementation (2026-11-24)

- `model.ts` (reducer, grouping), `registry.ts`, `ToolCall.tsx` (composite), `renderers.tsx` (registry entries,
  `ToolCallView`, `ToolGroupView`, `ToolLiveRegion`), `rows.ts` (chat rows ↔ calls, `createChatItems`,
  `CHAT_RENDER_WINDOW`).
- `ChatPanel` keeps one `ToolState` per session and applies every `tool.*` event and the run end through
  `reduceToolEvent`; the old `event-reduce.ts` fold is gone. Tool rows are still not persisted (behaviour unchanged).
- Tests: reducer and rows on the fixtures (`bun run test:unit`), DOM/ARIA of the composite, groups and the live region
  in happy-dom (`bun run test:dom`, `*.dom.test.tsx`, preload `test/dom-setup.ts`, `--conditions browser`).
- Screens: `after-tools-stream.png`, `after-tools-group.png` (fixture replayed into the real Studio, dark).
