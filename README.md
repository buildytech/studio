# BuildY Studio

The Studio interface of BuildY (SolidJS + UI8Kit), shared by every host through a git submodule:
[vibechat-desktop](https://github.com/buildytech/vibechat-desktop) (Wails 3 / Go) today, the cloud host later. The
hosts serve the built Studio and answer the host seam under `/runtime/v1`.

| Path | What |
| --- | --- |
| `apps/studio` | the Studio app: screens, stores, the `/runtime/v1` client, styles, tests |
| `packages/agent-contract` | Agent Contract v1 and the host seam: `src/host.ts` → generated `host-seam.json` (one source of truth) |
| `packages/studio-panel-contract` | the Studio side-panel registry contract |
| `scripts/gen-host-seam.ts` | regenerates `host-seam.json`; `scripts/lib/host-seam.test.ts` fails on drift |

```bash
bun install --frozen-lockfile
bun run verify          # typecheck + tests + desktop build
bun run build:desktop   # apps/studio/dist with VITE_API_URL=/runtime/v1 (what the desktop host embeds)
```

Project templates live in [buildytech/templates](https://github.com/buildytech/templates).
