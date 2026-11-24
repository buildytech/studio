import { describe, expect, test } from "bun:test"
import { HEAVY, entryAssets, staticImports } from "./check-budgets"

describe("check-budgets (SLO 1–3)", () => {
  test("finds the entry script, stylesheet and preloads in index.html", () => {
    const html = `<script type="module" crossorigin src="/assets/index-A.js"></script>
<link rel="modulepreload" crossorigin href="/assets/vendor-B.js">
<link rel="stylesheet" crossorigin href="/assets/index-C.css">`
    expect(entryAssets(html)).toEqual({ js: ["assets/index-A.js", "assets/vendor-B.js"], css: ["assets/index-C.css"] })
  })

  test("static imports count, dynamic import() does not", () => {
    const code = `import{a as b}from"./solid-X.js";import"./side-Y.js";const m=()=>import("./mermaid-Z.js");`
    expect(staticImports(code)).toEqual(["./solid-X.js", "./side-Y.js"])
  })

  test("heavy library chunk names are recognised", () => {
    expect(HEAVY.test("assets/cytoscape.esm-Bw5.js")).toBe(true)
    expect(HEAVY.test("assets/CodePanel-A71.js")).toBe(false)
  })
})
