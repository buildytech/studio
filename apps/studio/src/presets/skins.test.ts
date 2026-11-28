import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { AA_PAIRS, BUILTIN_SKINS, contrast, DEFAULT_SWATCH, parseSkin, SKIN_TOKENS, skinCss, type SkinTokens } from "./skins"

/** The default skin is the stylesheet: its dark (:root) and light (html:not(.dark)) blocks. */
function stylesheetTokens(): { dark: SkinTokens; light: SkinTokens } {
  const css = readFileSync(join(import.meta.dir, "../styles/studio-theme.css"), "utf8")
  const read = (selector: string) => {
    const body = css.slice(css.indexOf(`${selector} {`)).split("}")[0]!
    const out: Record<string, string> = {}
    for (const m of body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)) out[m[1]!] = m[2]!
    return out as SkinTokens
  }
  return { dark: read(":root"), light: read("html:not(.dark)") }
}

test("every built-in skin is a valid vibechat-skin with a unique id", () => {
  const ids = new Set<string>()
  for (const skin of BUILTIN_SKINS) {
    const r = parseSkin(skin)
    expect(r.ok, skin.id).toBe(true)
    expect(ids.has(skin.id)).toBe(false)
    ids.add(skin.id)
  }
  expect(BUILTIN_SKINS[0]!.id).toBe("ember")
  expect(BUILTIN_SKINS.length).toBeGreaterThanOrEqual(3)
})

test("text pairs reach WCAG AA (4.5:1) in light and dark for every skin, the default included", () => {
  const base = stylesheetTokens()
  for (const skin of BUILTIN_SKINS) {
    for (const mode of ["light", "dark"] as const) {
      const tokens = { ...base[mode], ...skin[mode] }
      for (const [text, surface] of AA_PAIRS) {
        const a = tokens[text], b = tokens[surface]
        expect(a && b, `${skin.id} ${mode} ${text}/${surface} defined`).toBeTruthy()
        expect(contrast(a!, b!), `${skin.id} ${mode} ${text} on ${surface}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  }
})

test("a skin that is not the format is refused, and its CSS carries only hex values on known tokens", () => {
  expect(parseSkin(null).ok).toBe(false)
  const bad = parseSkin({ format: "vibechat-skin", version: 1, id: "x", name: "X", light: { primary: "red;}body{x:y" }, dark: { nope: "#000000" } })
  expect(bad.ok).toBe(false)
  if (!bad.ok) expect(bad.issues.map((i) => i.path)).toEqual(["/light/primary", "/dark/nope"])
  const css = skinCss(BUILTIN_SKINS[1]!)
  expect(css).toContain('html[data-skin="graphite"]:not(.dark){')
  expect(css).toContain('html[data-skin="graphite"].dark{')
  for (const m of css.matchAll(/--([a-z-]+):([^;]+);/g)) {
    expect(SKIN_TOKENS as readonly string[]).toContain(m[1]!)
    expect(m[2]).toMatch(/^#[0-9a-f]{6}$/i)
  }
  expect(skinCss(BUILTIN_SKINS[0]!)).toBe("")
})

test("the default skin's swatch shows the stylesheet's colours", () => {
  const base = stylesheetTokens()
  for (const mode of ["light", "dark"] as const) {
    for (const [k, v] of Object.entries(DEFAULT_SWATCH[mode])) expect(base[mode][k as keyof SkinTokens], `${mode} ${k}`).toBe(v)
  }
})

test("syntax colours of the code editor reach AA on the editor background in both modes", () => {
  const css = readFileSync(join(import.meta.dir, "../vendor-ui/codemirror/syntax.css"), "utf8")
  const block = (selector: string) => css.slice(css.indexOf(`${selector} {`)).split("}")[0]!
  for (const [selector, bg] of [[":root", "#080808"], ["html:not(.dark)", "#ffffff"]] as const) {
    const syn = [...block(selector).matchAll(/--syn-([a-z]+):\s*(#[0-9a-f]{6})/gi)]
    expect(syn.length, selector).toBe(12)
    for (const m of syn) expect(contrast(m[2]!, bg), `${selector} syn-${m[1]}`).toBeGreaterThanOrEqual(4.5)
  }
})
