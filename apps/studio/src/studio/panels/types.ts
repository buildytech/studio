import type { Component } from "solid-js"
import type { Project } from "../../api"

export type StudioPanelProps = {
  projectId: string
  project: Project | null
  active: boolean
  onActivate: (panelId: string) => void
  onError: (message: string) => void
  onProjectChange: (project: Project | null) => void
  onStatusChange: (status: string) => void
}

export type StudioPanelModule = {
  default: Component<StudioPanelProps>
}

export type StudioPanelProvider = {
  id: string
  load: () => Promise<StudioPanelModule>
}

