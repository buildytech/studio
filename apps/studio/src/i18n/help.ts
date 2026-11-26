import dictionary from "./help.en.json"
import { fill } from "./index"

/**
 * Words of the server help in Settings: a second DictionaryV04 file (`{ locale, messages }`), loaded only with the
 * lazy help card so the long texts stay out of the entry bundle (SLO 1, docs/slo.md).
 */
export type HelpKey = keyof typeof dictionary.messages

export function th(key: HelpKey, vars?: Record<string, string | number>): string {
  return fill(dictionary.messages[key], vars)
}
