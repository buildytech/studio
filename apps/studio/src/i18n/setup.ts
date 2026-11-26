import dictionary from "./setup.en.json"
import { fill } from "./index"

/**
 * Words of the server setup wizard in Settings: its own DictionaryV04 file, loaded with the lazy wizard card only
 * (SLO 1, docs/slo.md).
 */
export type SetupKey = keyof typeof dictionary.messages

export function ts(key: SetupKey, vars?: Record<string, string | number>): string {
  return fill(dictionary.messages[key], vars)
}
