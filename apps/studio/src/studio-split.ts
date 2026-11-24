/** Persistable Studio chat|side split width (% of studio panes). */

export const SIDE_WIDTH_KEY = "buildy.studioSideWidth"
export const DEFAULT_SIDE_PCT = 42
export const MIN_SIDE_PCT = 22
export const MAX_SIDE_PCT = 72

export function clampSidePct(pct: number): number {
  if (!Number.isFinite(pct)) return DEFAULT_SIDE_PCT
  return Math.min(MAX_SIDE_PCT, Math.max(MIN_SIDE_PCT, Math.round(pct * 10) / 10))
}

export function readSidePct(): number {
  try {
    const raw = localStorage.getItem(SIDE_WIDTH_KEY)
    if (raw == null) return DEFAULT_SIDE_PCT
    return clampSidePct(Number(raw))
  } catch {
    return DEFAULT_SIDE_PCT
  }
}

export function persistSidePct(pct: number): void {
  try {
    localStorage.setItem(SIDE_WIDTH_KEY, String(clampSidePct(pct)))
  } catch {
    /* ignore */
  }
}

/**
 * Convert a pointer X into a side-pane width percentage measured from the
 * right edge of the panes container.
 */
export function sidePctFromPointer(
  clientX: number,
  panesRect: { left: number; width: number },
): number {
  if (panesRect.width <= 0) return DEFAULT_SIDE_PCT
  const fromRight = panesRect.left + panesRect.width - clientX
  return clampSidePct((fromRight / panesRect.width) * 100)
}
