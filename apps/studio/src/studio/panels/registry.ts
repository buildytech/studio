import type { StudioPanel } from "@buildy/studio-panel-contract"
import type { StudioPanelProvider } from "./types"

export type ResolvedStudioPanel = {
  schema: StudioPanel
  provider: StudioPanelProvider
}

export function resolveStudioPanels(
  schemas: readonly StudioPanel[],
  providers: readonly StudioPanelProvider[],
): ResolvedStudioPanel[] {
  const providerById = new Map<string, StudioPanelProvider>()
  for (const provider of providers) {
    if (providerById.has(provider.id)) {
      throw new Error(`duplicate Studio panel provider "${provider.id}"`)
    }
    providerById.set(provider.id, provider)
  }

  return schemas.map((schema) => {
    const provider = providerById.get(schema.provider)
    if (!provider) {
      throw new Error(
        `Studio panel "${schema.id}" references missing provider "${schema.provider}"`,
      )
    }
    return { schema, provider }
  })
}

export function defaultStudioPanelId(
  panels: readonly ResolvedStudioPanel[],
): string {
  return panels.find((panel) => panel.schema.default)?.schema.id
    ?? panels[0]?.schema.id
    ?? ""
}

