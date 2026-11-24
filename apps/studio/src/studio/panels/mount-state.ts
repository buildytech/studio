import type { StudioPanel } from "@buildy/studio-panel-contract"

export function mountedPanelIdsAfterActivation(
  panels: readonly StudioPanel[],
  activePanelId: string | null,
  previous: ReadonlySet<string> = new Set(),
): Set<string> {
  const available = new Set(panels.map((panel) => panel.id))
  const next = new Set(
    [...previous].filter((id) => available.has(id)),
  )
  for (const panel of panels) {
    if (panel.mount === "always") next.add(panel.id)
    if (panel.mount === "visible-only" && panel.id !== activePanelId) {
      next.delete(panel.id)
    }
  }
  if (activePanelId && available.has(activePanelId)) next.add(activePanelId)
  return next
}

export function shouldRenderPanel(
  panel: StudioPanel,
  activePanelId: string | null,
  mountedPanelIds: ReadonlySet<string>,
): boolean {
  if (panel.mount === "visible-only") return panel.id === activePanelId
  return panel.mount === "always" || mountedPanelIds.has(panel.id)
}

