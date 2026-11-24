/**
 * API key field helpers. A pasted key replaces the field instead of being appended to an old value (a key pasted
 * into a field that already held it was saved twice, 204 characters instead of 102).
 */

/** True when the key is one string repeated twice (even length, equal halves). */
export function looksPastedTwice(key: string): boolean {
  const k = key.trim()
  if (k.length < 16 || k.length % 2 !== 0) return false
  const half = k.length / 2
  return k.slice(0, half) === k.slice(half)
}

/** The field value after a paste: the pasted text alone, trimmed. */
export function pastedKey(clipboard: string): string {
  return clipboard.trim()
}
