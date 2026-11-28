import en from "./settings.en.json"
import ru from "./settings.ru.json"
import { fill, locale } from "./index"

/**
 * Words of the Settings page (ADR 0007): its own DictionaryV04 file per language (`settings.en.json`,
 * `settings.ru.json`), loaded with the lazy Settings route only (SLO 1, docs/slo.md).
 */
export type SettingsKey = keyof typeof en.messages

const catalog = locale === "ru" ? ru : en

export function tset(key: SettingsKey, vars?: Record<string, string | number>): string {
  return fill(catalog.messages[key] ?? en.messages[key], vars)
}
