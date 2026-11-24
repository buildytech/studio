/**
 * Studio preference: include thinking/tool rows from the live UI in chat export.
 * Default on while developing (classic user/assistant-only export remains opt-out).
 */

const KEY = "buildy.exportIncludeTrace"

export function readExportIncludeTrace(): boolean {
  try {
    const v = localStorage.getItem(KEY)
    // Unset / legacy empty → on (dev default).
    if (v === null || v === "") return true
    if (v === "0" || v === "false") return false
    return v === "1" || v === "true"
  } catch {
    return true
  }
}

export function writeExportIncludeTrace(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "1" : "0")
  } catch {
    /* ignore quota / private mode */
  }
}

/** Force-on during development so Export always carries IF unless opted out mid-session. */
export function ensureExportIncludeTraceDefault(): boolean {
  writeExportIncludeTrace(true)
  return true
}
