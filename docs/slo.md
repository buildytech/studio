# Service level objectives — Studio

Every number below comes from a measurement on `5e41766` (the moved Studio, before the refactor), 2026-11-24, on the
box (Linux x64, Chromium 1248 headless, desktop host `vibechat-desktop 5ff4251` built with `-tags server`). Budgets
leave headroom over the measurement; a budget only moves down without a new ADR.

| # | SLO | Measured | Budget | Checked by |
| --- | --- | --- | --- | --- |
| 1 | Entry bundle (`dist/assets/index-*.js`, gzip -9) | 110 433 B (`5e41766`) → 117 685 B (after the refactor and the tool view) | ≤ 125 000 B | CI `bun run check:budgets` |
| 2 | Entry CSS (`dist/assets/index-*.css`, gzip -9) | 12 059 B (`5e41766`) → 15 418 B (legacy `styles.css` + kit tokens + utilities) | ≤ 16 000 B | CI `bun run check:budgets` |
| 3 | Heavy libraries stay lazy: no mermaid / katex / cytoscape / CodeMirror code in the entry chunk | entry 347 630 B raw, mermaid etc. in separate chunks | 0 entry imports | CI `bun run check:budgets` (static import graph of the entry, chunk names) |
| 4 | Studio start: new browser context → «Your apps» list with one project rendered | median 86 ms, max 89 ms (10 runs) | median ≤ 300 ms | manual `bun run measure:start` against a running host (needs the Go host; not in Studio CI) |
| 5 | Seam latency on the desktop host, loopback, keep-alive, 300 requests | `/host/capabilities` p50 0.11 / p95 0.20 ms; `/templates` p50 0.09 / p95 0.17 ms; `/projects` p50 0.07 / p95 0.09 ms | p95 ≤ 5 ms for JSON reads | manual `scripts/measure-seam.py` (host repo concern) |
| 6 | UI8Kit app-layer rules: `rules:check` findings | baseline recorded per file in `rules/baseline.json` (start: 305 bare tags, 3 inline styles, 2 raw HTML in the vendor zone; now `{}` — zero findings) | new files 0; baseline only shrinks | CI `bun run rules:check` |
| 7 | Tests | 62 pass → 100 pass (93 unit + 7 DOM/ARIA), 0 fail; unit line coverage 89 % | 0 fail | CI `bun run verify`, coverage artifact `coverage-lcov` |
| 8 | Seam drift | `host-seam.json` = generated | 0 diff | CI drift step |

Notes

- (4) and (5) are not CI gates: the Studio CI has no host. They are re-measured before a release and the table is
  updated with the date and commit.
- Long chat streams: the message list renders at most `CHAT_RENDER_WINDOW` items and a tool keeps at most
  `TOOL_OUTPUT_MAX` characters of output (ADR 0005); both are unit-tested limits, not timing SLOs.
