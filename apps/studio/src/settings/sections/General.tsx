import { createSignal, type JSX } from "solid-js"
import { ensureExportIncludeTraceDefault, writeExportIncludeTrace } from "../../chat-export-prefs"
import { tset } from "../../i18n/settings"
import { Box, Checkbox, Label, Text } from "../../primitives"

/** General (client): chat export with or without the thinking and tool trace (localStorage). */
export default function General(): JSX.Element {
  const [trace, setTrace] = createSignal(ensureExportIncludeTraceDefault())
  return (
    <Box tag="section" class="settings-card" aria-labelledby="settings-export-title">
      <Text tag="h2" id="settings-export-title" class="settings-card-title">{tset("general.exportTitle")}</Text>
      <Text class="settings-card-sub">{tset("general.exportLead")}</Text>
      <Label class="settings-check">
        <Checkbox
          checked={trace()}
          onChange={(e) => {
            writeExportIncludeTrace(e.currentTarget.checked)
            setTrace(e.currentTarget.checked)
          }}
        />
        <Text tag="span">{tset("general.exportToggle")}</Text>
      </Label>
    </Box>
  )
}
