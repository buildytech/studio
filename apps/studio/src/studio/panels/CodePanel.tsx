import { createSignal, type JSX } from "solid-js"
import WorkspaceEditor from "../../editor/WorkspaceEditor"
import type { StudioPanelProps } from "./types"
import { Box, Button, Text } from "../../primitives"
import { AppIcon } from "../../app-icons"
import { t } from "../../i18n"

export default function CodePanel(props: StudioPanelProps): JSX.Element {
  const [refreshTick, setRefreshTick] = createSignal(0)

  return (
    <Box class="studio-panel-surface">
      <Box class="panel-provider-toolbar">
        <Text tag="span" class="panel-provider-title">{t("editor.workspaceFiles")}</Text>
        <Box class="side-toolbar-actions">
          <Button
            type="button"
            class="side-icon-btn"
            title={t("code.refreshFileTree")}
            aria-label={t("code.refreshFileTree")}
            onClick={() => setRefreshTick((value) => value + 1)}
          >
            <AppIcon name="refresh" size={15} />
          </Button>
        </Box>
      </Box>
      <Box class="studio-panel-content">
        <WorkspaceEditor
          projectId={props.projectId}
          refreshTick={refreshTick()}
        />
      </Box>
    </Box>
  )
}

