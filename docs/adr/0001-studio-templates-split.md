# ADR 0001 — Studio and templates leave vibecode; the boundary with desktop and cloud

Status: accepted (2026-11-24, owner t150u/t151u)

## Context

The Studio (Solid app), the agent and seam contracts and ten templates lived in the private `buildytech/vibecode`
monorepo, together with a TypeScript reference host, Docker runners and template tooling. The public desktop host
(`vibechat-desktop`) took the whole repo as a submodule, used three parts of it (the built Studio, `host-seam.json`,
two templates) and its CI could not clone the private submodule. The owner wants one UI for desktop and the future
cloud, refactored by the UI8Kit contract.

## Decision

- `buildytech/studio` (public, Apache-2.0): `apps/studio`, `packages/agent-contract` (Agent Contract v1 + the host
  seam), `packages/studio-panel-contract`, the seam generator and drift test. Copied from vibecode `f0546ed` with a
  clean history (the cloud code removed in vibecode `27be9c0` stays out of the public history).
- `buildytech/templates` (public, MIT): `vite-svelte-bun` and `vite-react-bun` only.
- Hosts take both as git submodules pinned by commit and never edit them:

| Owner | Holds |
| --- | --- |
| studio | screens, stores and services, `HostClient`, styles and tokens, the dictionary, the seam contract |
| templates | the project starters a host copies into a new project |
| vibechat-desktop (Go) | the seam implementation, Cursor bridge + mandatory SDK sandbox + hooks, keychain, worktrees, preview proxy, process groups / Job Objects, packaging |
| cloud host (future, private) | the same seam over HTTP with its own auth; preview in containers; declares what it lacks through `capabilities` |

## Consequences

- Desktop CI needs no token. A Studio change reaches a host only by moving its pin.
- vibecode is not deleted or archived (owner's call); `host-core` there is the starting point for the cloud host.
- The vendored UI8Kit snapshot comes along as legacy and is replaced in the refactor (ADR 0003).
