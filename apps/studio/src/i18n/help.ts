import en from "./help.en.json"
import ru from "./help.ru.json"
import { fill, locale } from "./index"

/**
 * Words of the server help in Settings: a second DictionaryV04 file (`{ locale, messages }`),
 * one per language (`help.en.json`, `help.ru.json`), loaded only with the lazy help card so
 * the long texts stay out of the entry bundle (SLO 1, docs/slo.md).
 */
export type HelpKey = keyof typeof en.messages

const catalog = locale === "ru" ? ru : en

export function th(key: HelpKey, vars?: Record<string, string | number>): string {
  return fill(catalog.messages[key] ?? en.messages[key], vars)
}
