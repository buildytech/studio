/** Persistable Editor file-tree width (% of workspace editor body). */

export const TREE_WIDTH_KEY = "buildy.editorTreeWidth"
export const TREE_OPEN_KEY = "buildy.editorTreeOpen"
export const DEFAULT_TREE_PCT = 18
export const MIN_TREE_PCT = 12
export const MAX_TREE_PCT = 48

export function clampTreePct(pct: number): number {
  if (!Number.isFinite(pct)) return DEFAULT_TREE_PCT
  return Math.min(MAX_TREE_PCT, Math.max(MIN_TREE_PCT, Math.round(pct * 10) / 10))
}

export function readTreePct(): number {
  try {
    const raw = localStorage.getItem(TREE_WIDTH_KEY)
    if (raw == null) return DEFAULT_TREE_PCT
    return clampTreePct(Number(raw))
  } catch {
    return DEFAULT_TREE_PCT
  }
}

export function persistTreePct(pct: number): void {
  try {
    localStorage.setItem(TREE_WIDTH_KEY, String(clampTreePct(pct)))
  } catch {
    /* ignore */
  }
}

export function readTreeOpen(): boolean {
  try {
    const v = localStorage.getItem(TREE_OPEN_KEY)
    if (v === null) return true
    return v === "1" || v === "true"
  } catch {
    return true
  }
}

export function persistTreeOpen(open: boolean): void {
  try {
    localStorage.setItem(TREE_OPEN_KEY, open ? "1" : "0")
  } catch {
    /* ignore */
  }
}

/** Pointer X → tree width % measured from the left edge of the editor body. */
export function treePctFromPointer(
  clientX: number,
  bodyRect: { left: number; width: number },
): number {
  if (bodyRect.width <= 0) return DEFAULT_TREE_PCT
  const fromLeft = clientX - bodyRect.left
  return clampTreePct((fromLeft / bodyRect.width) * 100)
}
