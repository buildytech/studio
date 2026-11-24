# ADR 0002 — The host seam `/runtime/v1` is a contract

Status: accepted (2026-11-24). Supersedes vibecode ADR-0027 for the seam part.

## Context

The Studio talks to its host only over HTTP under `/runtime/v1` (JSON + one SSE stream of Agent Contract v1 events).
The desktop host is Go; the cloud host will be TypeScript. Both must answer the same routes, and the UI must not
branch on which host it runs in.

## Decision

1. **One source of truth.** `packages/agent-contract/src/host.ts` holds `HOST_SEAM_VERSION`, `HOST_SEAM_PREFIX`,
   `HOST_SEAM_ROUTES` and `HostCapabilitiesSchema`. `bun run gen:host-seam` writes `host-seam.json`; a test fails
   when the JSON drifts. Hosts pin the commit and run their own contract test against the JSON (desktop: Go
   `TestHostSeamContract`, 31 routes).
2. **Additive only.** A route or capability is added, never renamed or removed inside seam `1`. A breaking change is a
   new seam version and a new ADR.
3. **HostClient.** The Studio reaches the seam only through the `HostClient` interface (`apps/studio/src/host/`).
   `HttpHostClient` implements it over a `HostTransport` (base URL, `fetch`, credentials). The desktop build uses the
   same origin (`VITE_API_URL=/runtime/v1`); a cloud build passes its base URL and an auth hook. Tests inject a fake
   transport. A contract test proves every `HostClient` call maps to a seam route and every seam route has a call.
4. **Capabilities are the only branch.** Screens read `HostCapabilities` (`local_folder`, `worktrees`,
   `preview_local`, `agent_sandbox`, `templates`) and show a host notice when a capability is off; no `if (desktop)`.
5. Errors are `{ error }` JSON with an HTTP status; a route a host cannot honour answers 404/501, never a blank page.

## Consequences

- Swapping hosts is configuration, not code. New routes start here and fail the host's contract test until served.
- The SSE parser has a frame cap (`SSE_MAX_BUFFER_BYTES`, 1 MiB) so a broken host cannot grow memory unbounded.
