/**
 * SLO 1–3 (docs/slo.md): entry JS / CSS gzip budgets and «heavy libraries stay lazy».
 * Reads the built `apps/studio/dist`; run after `build:desktop`.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { gzipSync } from "node:zlib"

export const BUDGETS = { entryJsGzip: 125_000, entryCssGzip: 16_000 } as const
export const HEAVY = /mermaid|katex|cytoscape|codemirror|@codemirror|lezer/i

/** Asset paths the page loads before any user action: entry script, its stylesheets and preloads. */
export function entryAssets(html: string): { js: string[]; css: string[] } {
  const js = [...html.matchAll(/<script[^>]+type="module"[^>]+src="\/?([^"]+)"/g)].map((m) => m[1]!)
  const css = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="\/?([^"]+)"/g)].map((m) => m[1]!)
  const preload = [...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="\/?([^"]+)"/g)].map((m) => m[1]!)
  return { js: [...js, ...preload], css }
}

/** Chunks a module pulls in statically (`import … from "./x.js"`, `import "./x.js"`); `import()` is lazy and skipped. */
export function staticImports(code: string): string[] {
  return [...code.matchAll(/(?:^|[;\n}])\s*import\s*(?:[\w$*{},\s]+?\s*from\s*)?["'](\.\/[^"']+)["']/g)].map((m) => m[1]!)
}

export type BudgetReport = { jsGzip: number; cssGzip: number; heavy: string[]; failures: string[] }

export function checkBudgets(dist: string): BudgetReport {
  const html = readFileSync(join(dist, "index.html"), "utf8")
  const { js, css } = entryAssets(html)
  const seen = new Set<string>()
  const queue = [...js]
  let jsGzip = 0
  while (queue.length) {
    const rel = queue.shift()!
    if (seen.has(rel)) continue
    seen.add(rel)
    const code = readFileSync(join(dist, rel), "utf8")
    jsGzip += gzipSync(code, { level: 9 }).length
    const dir = rel.slice(0, rel.lastIndexOf("/") + 1)
    for (const imp of staticImports(code)) queue.push(dir + imp.slice(2))
  }
  const cssGzip = css.reduce((n, rel) => n + gzipSync(readFileSync(join(dist, rel)), { level: 9 }).length, 0)
  const heavy = [...seen].filter((rel) => HEAVY.test(rel))
  const failures = [
    ...(jsGzip > BUDGETS.entryJsGzip ? [`entry JS ${jsGzip} B gz > ${BUDGETS.entryJsGzip} B`] : []),
    ...(cssGzip > BUDGETS.entryCssGzip ? [`entry CSS ${cssGzip} B gz > ${BUDGETS.entryCssGzip} B`] : []),
    ...heavy.map((rel) => `heavy chunk loaded eagerly: ${rel}`),
  ]
  return { jsGzip, cssGzip, heavy, failures }
}

if (import.meta.main) {
  const r = checkBudgets(process.argv[2] ?? "apps/studio/dist")
  console.log(`entry JS ${r.jsGzip} B gz (≤ ${BUDGETS.entryJsGzip}), entry CSS ${r.cssGzip} B gz (≤ ${BUDGETS.entryCssGzip}), eager heavy chunks: ${r.heavy.length}`)
  if (r.failures.length) {
    for (const f of r.failures) console.error(`budget: ${f}`)
    process.exit(1)
  }
}
