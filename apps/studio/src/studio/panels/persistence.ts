const ACTIVE_PANEL_KEY = "buildy.studioRightPane"
const LAST_PANEL_KEY = "buildy.studioLastPanel"
const LEGACY_PREVIEW_OPEN_KEY = "buildy.previewOpen"

function migratedPanelId(value: string | null): string | null {
  if (value === "editor") return "code"
  if (value === "hidden") return null
  return value
}

function availableId(
  value: string | null,
  availablePanelIds: ReadonlySet<string>,
): string | null {
  const migrated = migratedPanelId(value)
  return migrated && availablePanelIds.has(migrated) ? migrated : null
}

export function readActivePanelId(
  availablePanelIds: readonly string[],
  defaultPanelId: string,
  storage: Pick<Storage, "getItem"> = localStorage,
): string | null {
  const available = new Set(availablePanelIds)
  try {
    const stored = storage.getItem(ACTIVE_PANEL_KEY)
    if (stored === "hidden") return null
    const active = availableId(stored, available)
    if (active) return active
    const legacyOpen = storage.getItem(LEGACY_PREVIEW_OPEN_KEY)
    if (legacyOpen === "0" || legacyOpen === "false") return null
  } catch {
    // Storage may be unavailable in private browsing or tests.
  }
  return available.has(defaultPanelId) ? defaultPanelId : availablePanelIds[0] ?? null
}

export function readLastPanelId(
  availablePanelIds: readonly string[],
  fallbackPanelId: string,
  storage: Pick<Storage, "getItem"> = localStorage,
): string {
  const available = new Set(availablePanelIds)
  try {
    const stored = availableId(storage.getItem(LAST_PANEL_KEY), available)
    if (stored) return stored
    const active = availableId(storage.getItem(ACTIVE_PANEL_KEY), available)
    if (active) return active
  } catch {
    // Fall through to a deterministic installed provider.
  }
  return available.has(fallbackPanelId)
    ? fallbackPanelId
    : availablePanelIds[0] ?? ""
}

export function persistActivePanelId(
  panelId: string | null,
  storage: Pick<Storage, "setItem"> = localStorage,
): void {
  try {
    storage.setItem(ACTIVE_PANEL_KEY, panelId ?? "hidden")
    storage.setItem(LEGACY_PREVIEW_OPEN_KEY, panelId === "preview" ? "1" : "0")
    if (panelId) storage.setItem(LAST_PANEL_KEY, panelId)
  } catch {
    // Panel state persistence is best-effort.
  }
}

