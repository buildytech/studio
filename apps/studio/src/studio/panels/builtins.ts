import {
  STUDIO_PANEL_CONTRACT_VERSION,
  parseStudioPanelSchemas,
  type StudioPanel,
} from "@buildy/studio-panel-contract"

export const BUILTIN_STUDIO_PANELS: StudioPanel[] = parseStudioPanelSchemas([
  {
    schemaVersion: STUDIO_PANEL_CONTRACT_VERSION,
    id: "code",
    label: "Editor",
    provider: "code",
    order: 10,
    mount: "lazy-once",
    toolbar: "provider",
  },
  {
    schemaVersion: STUDIO_PANEL_CONTRACT_VERSION,
    id: "preview",
    label: "Preview",
    provider: "preview",
    order: 20,
    default: true,
    mount: "always",
    toolbar: "provider",
  },
])

