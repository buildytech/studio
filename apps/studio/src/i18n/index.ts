import dictionary from "./ui.en.json"

/**
 * UI words (ADR 0003): DictionaryV04 files `{ locale, messages }` per language
 * (`ui.en.json`, `ui.ru.json`); components call t(). English is the default.
 * The active locale is navigator.language (`ru` / `ru-*` → Russian, otherwise
 * English). `?lang=en` or `?lang=ru` overrides it for tests and screenshots;
 * there is no in-app language switch. The Russian catalog is loaded lazily so
 * it stays out of the entry bundle (SLO 1); the app entry calls loadUiCatalog()
 * before the first render.
 * Keys are typed from the English JSON, so a missing key is a type error, not a blank label.
 */
export type MessageKey = keyof typeof dictionary.messages
export type Locale = "en" | "ru"

const SUPPORTED: readonly Locale[] = ["en", "ru"]

function tagLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null
  const lower = tag.toLowerCase()
  for (const loc of SUPPORTED) {
    if (lower === loc || lower.startsWith(`${loc}-`)) return loc
  }
  return null
}

/** Resolve the UI locale from a query string and language tags; default `en`. */
export function detectLocale(env?: { search?: string; languages?: readonly string[] }): Locale {
  const search = env?.search ?? (typeof location !== "undefined" ? location.search : "")
  const fromQuery = tagLocale(new URLSearchParams(search).get("lang"))
  if (fromQuery) return fromQuery
  const languages =
    env?.languages ??
    (typeof navigator !== "undefined"
      ? [navigator.language, ...(navigator.languages ?? [])].filter(Boolean)
      : [])
  for (const tag of languages) {
    const found = tagLocale(tag)
    if (found) return found
  }
  return "en"
}

export const locale: Locale = detectLocale()

const catalogs: Record<Locale, Record<MessageKey, string>> = {
  en: dictionary.messages,
  ru: dictionary.messages,
}

let pending: Promise<void> | undefined

/** Load the Russian catalog when the locale is `ru`. Safe to call more than once. */
export function loadUiCatalog(): Promise<void> {
  if (!pending) {
    pending =
      locale === "ru"
        ? import("./ui.ru.json").then((mod) => {
            catalogs.ru = mod.default.messages
          })
        : Promise.resolve()
  }
  return pending
}

/** The message for `key` in the active locale, with `{name}` placeholders filled from `vars`. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  return fill(catalogs[locale][key] ?? dictionary.messages[key], vars)
}

/** `text` with `{name}` placeholders filled from `vars`; unknown ones stay. */
export function fill(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m))
}
