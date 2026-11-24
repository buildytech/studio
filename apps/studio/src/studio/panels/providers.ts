import type { StudioPanelProvider } from "./types"

export const BUILTIN_STUDIO_PANEL_PROVIDERS: StudioPanelProvider[] = [
  {
    id: "code",
    load: () => import("./CodePanel"),
  },
  {
    id: "preview",
    load: () => import("./PreviewPanel"),
  },
]

