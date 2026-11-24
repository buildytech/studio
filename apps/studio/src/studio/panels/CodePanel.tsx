import { createSignal, type JSX } from "solid-js"
import WorkspaceEditor from "../../editor/WorkspaceEditor"
import type { StudioPanelProps } from "./types"

function RefreshIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.6-6.2" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

export default function CodePanel(props: StudioPanelProps): JSX.Element {
  const [refreshTick, setRefreshTick] = createSignal(0)

  return (
    <div class="studio-panel-surface">
      <div class="panel-provider-toolbar">
        <span class="panel-provider-title">Workspace files</span>
        <div class="side-toolbar-actions">
          <button
            type="button"
            class="side-icon-btn"
            title="Refresh file tree"
            aria-label="Refresh file tree"
            onClick={() => setRefreshTick((value) => value + 1)}
          >
            <RefreshIcon />
          </button>
        </div>
      </div>
      <div class="studio-panel-content">
        <WorkspaceEditor
          projectId={props.projectId}
          refreshTick={refreshTick()}
        />
      </div>
    </div>
  )
}

