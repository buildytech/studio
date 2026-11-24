import dictionary from "./ui.en.json"

/**
 * UI words (ADR 0003): one dictionary in the DictionaryV04 shape `{ locale, messages }`; components call t().
 * Keys are typed from the JSON, so a missing key is a type error, not a blank label.
 */
export type MessageKey = keyof typeof dictionary.messages

export const locale = dictionary.locale

/** The message for `key`, with `{name}` placeholders filled from `vars`. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const text: string = dictionary.messages[key]
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m))
}
