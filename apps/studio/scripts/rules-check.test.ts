import { describe, expect, test } from "bun:test"
import { compare, scanSource } from "./rules-check"

const detectors = (file: string, src: string) => scanSource(file, src).map((f) => f.detector)

describe("rules:check detectors", () => {
  test("bare tags, svg, Dynamic, style and innerHTML are found; primitives are not", () => {
    const src = `const A = () => <Box><div style={{ color: "red" }} innerHTML={x} /><svg /><Dynamic component="p" /></Box>`
    expect(detectors("a.tsx", src).sort()).toEqual(["dynamic-tag", "inline-style", "raw-html", "raw-native-tag", "svg-outside-icon"])
  })

  test("words in JSX text and in read-out attributes are literal text; t() and class names are not", () => {
    expect(detectors("a.tsx", `const A = () => <Text aria-label="Close panel">Save</Text>`)).toEqual(["literal-text", "literal-text"])
    expect(detectors("a.tsx", `const A = () => <Text class="text-sm" aria-label={t("close")}>{t("save")}</Text>`)).toEqual([])
  })

  test("colors in code and CSS are found, outside comments", () => {
    expect(detectors("a.ts", `const c = "#fab283"; const d = \`rgb(1 2 3)\``)).toEqual(["hardcoded-color", "hardcoded-color"])
    expect(detectors("a.css", `/* #fff */\n.a { color: #707070; }`)).toEqual(["hardcoded-color"])
  })

  test("el.innerHTML = … in code is raw HTML", () => {
    expect(detectors("a.ts", `el.innerHTML = html`)).toEqual(["raw-html"])
  })
})

describe("rules:check gate", () => {
  test("a count above the baseline grows, below it is stale", () => {
    const r = compare({ "a.tsx": { "literal-text": 2 } }, { "a.tsx": { "literal-text": 1 }, "b.tsx": { "inline-style": 1 } })
    expect(r.grown).toEqual(["b.tsx inline-style: 0 → 1"])
    expect(r.shrunk).toEqual(["a.tsx literal-text: 2 → 1"])
  })
})
