/**
 * rules:check (ADR 0003): UI8Kit app-layer detectors over the Studio's composition zone, gated by a
 * shrink-only baseline.
 *
 *   bun scripts/rules-check.ts            gate: fail on any count above rules/baseline.json, or below it (stale)
 *   bun scripts/rules-check.ts --list     print every finding
 *   bun scripts/rules-check.ts --write    record the current counts (only after a count went down)
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import path from "node:path"
import ts from "typescript"

export const DETECTORS = [
  "raw-native-tag",
  "raw-html",
  "dynamic-tag",
  "inline-style",
  "literal-text",
  "hardcoded-color",
  "svg-outside-icon",
] as const
export type Detector = (typeof DETECTORS)[number]
export type Finding = { detector: Detector; line: number; text: string }

/** Not scanned: generated kit (ui8kit add), the theme token source, the vendor-wrapper zone (ADR 0004), the icon zone, tests. */
export const SKIP = [
  /^src\/(kit|compose|icons|utils|presets|components|blocks|styles)\//,
  /^src\/vendor-ui\//,
  /^src\/app-icons\//,
  /\.test\.tsx?$/,
  /\/fixtures\//,
]

const COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch)\(/g
/** Attributes whose string value is read or announced to the user. */
const TEXT_ATTRS = new Set(["aria-label", "title", "placeholder", "alt", "aria-description", "label"])
const SVG_TAGS = new Set(["svg", "path", "circle", "rect", "line", "polyline", "polygon", "g", "defs", "use"])

const hasWords = (s: string) => /\p{L}{2,}/u.test(s)

export function scanSource(file: string, source: string): Finding[] {
  if (file.endsWith(".css")) return scanCss(source)
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const out: Finding[] = []
  const add = (detector: Detector, node: ts.Node, text = node.getText(sf)) =>
    out.push({ detector, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, text: text.trim().slice(0, 80) })

  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sf)
      if (tag === "Dynamic") add("dynamic-tag", node.tagName)
      else if (/^[a-z]/.test(tag)) {
        if (SVG_TAGS.has(tag)) {
          if (tag === "svg") add("svg-outside-icon", node.tagName, `<${tag}>`)
        } else add("raw-native-tag", node.tagName, `<${tag}>`)
      }
      for (const attr of node.attributes.properties) {
        if (!ts.isJsxAttribute(attr)) continue
        const name = attr.name.getText(sf)
        if (name === "style") add("inline-style", attr)
        if (name === "innerHTML" || name === "outerHTML") add("raw-html", attr)
        const init = attr.initializer
        const literal =
          init && ts.isStringLiteral(init)
            ? init.text
            : init && ts.isJsxExpression(init) && init.expression && ts.isStringLiteralLike(init.expression)
              ? init.expression.text
              : undefined
        if (literal !== undefined && TEXT_ATTRS.has(name) && hasWords(literal)) add("literal-text", attr)
      }
    } else if (ts.isJsxText(node)) {
      if (hasWords(node.getText(sf))) add("literal-text", node)
    } else if (ts.isPropertyAccessExpression(node) && ["innerHTML", "outerHTML", "insertAdjacentHTML"].includes(node.name.text)) {
      add("raw-html", node)
    } else if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      for (const m of node.getText(sf).matchAll(COLOR)) add("hardcoded-color", node, m[0])
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return out
}

function scanCss(source: string): Finding[] {
  const out: Finding[] = []
  source.split("\n").forEach((text, i) => {
    if (/^\s*(\/\*|\*)/.test(text)) return
    for (const m of text.matchAll(COLOR)) out.push({ detector: "hardcoded-color", line: i + 1, text: m[0] })
  })
  return out
}

export type Counts = Record<string, Partial<Record<Detector, number>>>

export function countFindings(findings: Record<string, Finding[]>): Counts {
  const counts: Counts = {}
  for (const [file, list] of Object.entries(findings)) {
    for (const f of list) {
      const c = (counts[file] ??= {})
      c[f.detector] = (c[f.detector] ?? 0) + 1
    }
  }
  return counts
}

/** Gate: every (file, detector) count must equal the baseline; above is a new finding, below is a stale baseline. */
export function compare(baseline: Counts, current: Counts): { grown: string[]; shrunk: string[] } {
  const grown: string[] = []
  const shrunk: string[] = []
  for (const file of new Set([...Object.keys(baseline), ...Object.keys(current)])) {
    for (const d of DETECTORS) {
      const was = baseline[file]?.[d] ?? 0
      const now = current[file]?.[d] ?? 0
      if (now > was) grown.push(`${file} ${d}: ${was} → ${now}`)
      else if (now < was) shrunk.push(`${file} ${d}: ${was} → ${now}`)
    }
  }
  return { grown, shrunk }
}

function walk(dir: string, root: string, out: string[]) {
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name)
    if (statSync(abs).isDirectory()) walk(abs, root, out)
    else if (/\.(tsx?|css)$/.test(name)) out.push(path.relative(root, abs).split(path.sep).join("/"))
  }
}

export function scanApp(root: string): Record<string, Finding[]> {
  const files: string[] = []
  walk(path.join(root, "src"), root, files)
  const out: Record<string, Finding[]> = {}
  for (const file of files.sort()) {
    if (SKIP.some((re) => re.test(file))) continue
    const list = scanSource(file, readFileSync(path.join(root, file), "utf8"))
    if (list.length) out[file] = list
  }
  return out
}

function sortCounts(c: Counts): Counts {
  return Object.fromEntries(Object.keys(c).sort().map((f) => [f, Object.fromEntries(DETECTORS.filter((d) => c[f]![d]).map((d) => [d, c[f]![d]]))]))
}

if (import.meta.main) {
  const root = path.resolve(import.meta.dir, "..")
  const baselinePath = path.join(root, "rules", "baseline.json")
  const findings = scanApp(root)
  const current = sortCounts(countFindings(findings))
  const args = new Set(process.argv.slice(2))
  if (args.has("--list")) {
    for (const [file, list] of Object.entries(findings)) for (const f of list) console.log(`${file}:${f.line} ${f.detector} ${f.text}`)
  }
  const totals = Object.fromEntries(DETECTORS.map((d) => [d, Object.values(current).reduce((n, c) => n + (c[d] ?? 0), 0)]))
  if (args.has("--write")) {
    writeFileSync(baselinePath, JSON.stringify(current, null, 2) + "\n")
    console.log("rules:check: baseline written", JSON.stringify(totals))
    process.exit(0)
  }
  const baseline: Counts = JSON.parse(readFileSync(baselinePath, "utf8"))
  const { grown, shrunk } = compare(baseline, current)
  if (grown.length) console.error("rules:check: new findings (fix them; the baseline only shrinks):\n  " + grown.join("\n  "))
  if (shrunk.length) console.error("rules:check: counts went down, record them with `bun run rules:baseline`:\n  " + shrunk.join("\n  "))
  if (grown.length || shrunk.length) process.exit(1)
  console.log("rules:check: ok", JSON.stringify(totals))
}
