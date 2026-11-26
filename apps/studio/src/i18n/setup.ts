import en from "./setup.en.json"
import ru from "./setup.ru.json"
import { fill, locale } from "./index"

/**
 * Words of the server setup wizard in Settings: its own DictionaryV04 file per language
 * (`setup.en.json`, `setup.ru.json`), loaded with the lazy wizard card only (SLO 1, docs/slo.md).
 */
export type SetupKey = keyof typeof en.messages

const catalog = locale === "ru" ? ru : en

export function ts(key: SetupKey, vars?: Record<string, string | number>): string {
  return fill(catalog.messages[key] ?? en.messages[key], vars)
}
