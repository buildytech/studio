/**
 * App skins (ADR 0007): the Studio's own look, never the preview's. A skin is a JSON value of the `vibechat-skin`
 * format, version 1: an id, a name and the token values for both modes. The token names are the kit's shadcn
 * tokens (the same names a BuildY chat Brand Skin's palette writes for light and dark: --background, --primary,
 * --muted-foreground, …) plus the Studio's own aliases; a token a skin leaves out keeps the stylesheet's value.
 * Values are hex colours only, so an imported skin cannot inject CSS. The default skin ("ember") is the stylesheet
 * itself (styles/studio-theme.css) and carries no tokens.
 */
export const SKIN_FORMAT = "vibechat-skin" as const
export const SKIN_VERSION = 1 as const

export const SKIN_TOKENS = [
  "background", "foreground", "card", "card-foreground", "popover", "popover-foreground",
  "primary", "primary-foreground", "secondary", "secondary-foreground", "muted", "muted-foreground",
  "accent", "accent-foreground", "destructive", "destructive-foreground", "border", "input", "ring",
  "success", "success-foreground", "bg-elevated", "border-muted", "accent-dim", "accent-emphasis", "link", "info", "warn",
] as const
export type SkinToken = (typeof SKIN_TOKENS)[number]
export type SkinTokens = Partial<Record<SkinToken, string>>

export type AppSkin = {
  format: typeof SKIN_FORMAT
  version: typeof SKIN_VERSION
  id: string
  name: string
  light: SkinTokens
  dark: SkinTokens
}

const ID = /^[a-z0-9][a-z0-9-]{0,62}$/
const HEX = /^#[0-9a-f]{6}$/i
const TOKEN_SET = new Set<string>(SKIN_TOKENS)

export type SkinIssue = { path: string; message: string }

/** Check a value against the format (imports later go through this). */
export function parseSkin(value: unknown): { ok: true; skin: AppSkin } | { ok: false; issues: SkinIssue[] } {
  const issues: SkinIssue[] = []
  const o = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
  if (!o) return { ok: false, issues: [{ path: "", message: "not an object" }] }
  if (o.format !== SKIN_FORMAT) issues.push({ path: "/format", message: `must be ${SKIN_FORMAT}` })
  if (o.version !== SKIN_VERSION) issues.push({ path: "/version", message: `must be ${SKIN_VERSION}` })
  if (typeof o.id !== "string" || !ID.test(o.id)) issues.push({ path: "/id", message: "lowercase letters, digits and dashes" })
  if (typeof o.name !== "string" || !o.name.trim() || o.name.length > 64) issues.push({ path: "/name", message: "1 to 64 characters" })
  for (const mode of ["light", "dark"] as const) {
    const tokens = o[mode]
    if (!tokens || typeof tokens !== "object" || Array.isArray(tokens)) {
      issues.push({ path: `/${mode}`, message: "an object of tokens" })
      continue
    }
    for (const [k, v] of Object.entries(tokens)) {
      if (!TOKEN_SET.has(k)) issues.push({ path: `/${mode}/${k}`, message: "unknown token" })
      else if (typeof v !== "string" || !HEX.test(v)) issues.push({ path: `/${mode}/${k}`, message: "a #rrggbb colour" })
    }
  }
  if (issues.length) return { ok: false, issues }
  return { ok: true, skin: o as AppSkin }
}

function block(selector: string, tokens: SkinTokens): string {
  const lines = SKIN_TOKENS.filter((k) => tokens[k]).map((k) => `--${k}:${tokens[k]};`)
  return lines.length ? `${selector}{${lines.join("")}}` : ""
}

/** The CSS of a skin: both modes on <html data-skin="id"> (the boot script restores it before the first paint). */
export function skinCss(skin: AppSkin): string {
  if (!ID.test(skin.id)) return ""
  const sel = `html[data-skin="${skin.id}"]`
  return block(`${sel}:not(.dark)`, skin.light) + block(`${sel}.dark`, skin.dark)
}

const skin = (id: string, name: string, light: SkinTokens, dark: SkinTokens): AppSkin => ({ format: SKIN_FORMAT, version: SKIN_VERSION, id, name, light, dark })

/** The built-in skins; the first is the default (the stylesheet's own tokens). */
export const BUILTIN_SKINS: readonly AppSkin[] = [
  skin("ember", "Ember", {}, {}),
  skin(
    "graphite",
    "Graphite",
    {
      background: "#ffffff", foreground: "#18181b", card: "#ffffff", "card-foreground": "#18181b", popover: "#ffffff", "popover-foreground": "#18181b",
      primary: "#18181b", "primary-foreground": "#fafafa", secondary: "#f4f4f5", "secondary-foreground": "#27272a", muted: "#f4f4f5", "muted-foreground": "#5f5f68",
      accent: "#ececee", "accent-foreground": "#18181b", border: "#e4e4e7", input: "#d4d4d8", ring: "#52525b",
      "bg-elevated": "#fafafa", "border-muted": "#ececee", "accent-dim": "#3f3f46", "accent-emphasis": "#09090b", link: "#2f55c8",
    },
    {
      background: "#0a0a0b", foreground: "#ededef", card: "#161618", "card-foreground": "#ededef", popover: "#161618", "popover-foreground": "#ededef",
      primary: "#e4e4e7", "primary-foreground": "#18181b", secondary: "#1f1f22", "secondary-foreground": "#c9c9ce", muted: "#1f1f22", "muted-foreground": "#93939b",
      accent: "#26262a", "accent-foreground": "#ededef", border: "#2a2a2e", input: "#2a2a2e", ring: "#a1a1aa",
      "bg-elevated": "#111113", "border-muted": "#232326", "accent-dim": "#c4c4c8", "accent-emphasis": "#fafafa", link: "#8ab4ff",
    },
  ),
  skin(
    "ocean",
    "Ocean",
    {
      background: "#ffffff", foreground: "#0f1722", card: "#ffffff", "card-foreground": "#0f1722", popover: "#ffffff", "popover-foreground": "#0f1722",
      primary: "#1f5fbf", "primary-foreground": "#ffffff", secondary: "#eef3f9", "secondary-foreground": "#1e2a38", muted: "#eef3f9", "muted-foreground": "#525d6b",
      accent: "#e3ebf5", "accent-foreground": "#0f1722", border: "#d8e1ec", input: "#c7d3e0", ring: "#1f5fbf",
      "bg-elevated": "#f7f9fc", "border-muted": "#e3ebf5", "accent-dim": "#1a4f9f", "accent-emphasis": "#143f80", link: "#1f5fbf",
    },
    {
      background: "#07090d", foreground: "#e6edf5", card: "#111720", "card-foreground": "#e6edf5", popover: "#111720", "popover-foreground": "#e6edf5",
      primary: "#6cb6ff", "primary-foreground": "#04111f", secondary: "#18202b", "secondary-foreground": "#c5d0dc", muted: "#18202b", "muted-foreground": "#8f9cad",
      accent: "#1d2733", "accent-foreground": "#e6edf5", border: "#243040", input: "#243040", ring: "#6cb6ff",
      "bg-elevated": "#0b1017", "border-muted": "#1d2733", "accent-dim": "#4f9ae6", "accent-emphasis": "#9fd0ff", link: "#7cc4ff",
    },
  ),
]

/** The default skin's swatch colours: the stylesheet's own values (styles/studio-theme.css; a test keeps them equal). */
export const DEFAULT_SWATCH: { light: SkinTokens; dark: SkinTokens } = {
  light: { background: "#ffffff", card: "#ffffff", foreground: "#121212", "muted-foreground": "#63636b", primary: "#b8541f", border: "#e4e4e7" },
  dark: { background: "#080808", card: "#161616", foreground: "#ededed", "muted-foreground": "#8a8a8a", primary: "#fab283", border: "#282828" },
}

/** The colours a skin shows in its swatch for a mode. */
export function swatchTokens(skin: AppSkin, mode: "light" | "dark"): SkinTokens {
  return { ...DEFAULT_SWATCH[mode], ...skin[mode] }
}

export function builtinSkin(id: string): AppSkin {
  return BUILTIN_SKINS.find((s) => s.id === id) ?? BUILTIN_SKINS[0]!
}

/** WCAG 2.x relative luminance contrast of two #rrggbb colours. */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!
  }
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x! + 0.05) / (y! + 0.05)
}

/** The text / surface pairs every skin keeps at WCAG AA (4.5:1) in both modes. */
export const AA_PAIRS: readonly [SkinToken, SkinToken][] = [
  ["foreground", "background"], ["foreground", "card"], ["foreground", "secondary"], ["foreground", "accent"],
  ["card-foreground", "card"], ["popover-foreground", "popover"],
  ["muted-foreground", "background"], ["muted-foreground", "card"], ["muted-foreground", "muted"],
  ["primary-foreground", "primary"], ["secondary-foreground", "secondary"], ["accent-foreground", "accent"],
  ["link", "background"], ["link", "card"],
]
