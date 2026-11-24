import {
  For,
  Show,
  Suspense,
  createEffect,
  createSignal,
  lazy,
  type JSX,
} from "solid-js"
import type { Project } from "../../api"
import {
  mountedPanelIdsAfterActivation,
  shouldRenderPanel,
} from "./mount-state"
import type { ResolvedStudioPanel } from "./registry"

export type PanelHostProps = {
  panels: readonly ResolvedStudioPanel[]
  activePanelId: string | null
  projectId: string
  project: Project | null
  onActivate: (panelId: string) => void
  onError: (message: string) => void
  onProjectChange: (project: Project | null) => void
  onStatusChange: (status: string) => void
}

export function PanelHost(props: PanelHostProps): JSX.Element {
  const schemas = () => props.panels.map((panel) => panel.schema)
  const [mountedPanelIds, setMountedPanelIds] = createSignal<Set<string>>(
    mountedPanelIdsAfterActivation(schemas(), props.activePanelId),
  )

  createEffect(() => {
    const panels = schemas()
    const activePanelId = props.activePanelId
    setMountedPanelIds((previous) =>
      mountedPanelIdsAfterActivation(panels, activePanelId, previous)
    )
  })

  return (
    <div class="side-sheet-body">
      <For each={props.panels}>
        {(panel) => {
          const Panel = lazy(panel.provider.load)
          const active = () => props.activePanelId === panel.schema.id
          const rendered = () =>
            shouldRenderPanel(
              panel.schema,
              props.activePanelId,
              mountedPanelIds(),
            )
          return (
            <Show when={rendered()}>
              <div
                class="side-layer studio-panel-layer"
                classList={{ "is-active": active() }}
                aria-hidden={!active()}
                data-panel-id={panel.schema.id}
              >
                <Suspense
                  fallback={
                    <div class="pane-empty">
                      Loading {panel.schema.label.toLowerCase()}…
                    </div>
                  }
                >
                  <Panel
                    projectId={props.projectId}
                    project={props.project}
                    active={active()}
                    onActivate={props.onActivate}
                    onError={props.onError}
                    onProjectChange={props.onProjectChange}
                    onStatusChange={props.onStatusChange}
                  />
                </Suspense>
              </div>
            </Show>
          )
        }}
      </For>
    </div>
  )
}

