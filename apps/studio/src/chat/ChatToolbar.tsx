import { For, Show, type JSX } from "solid-js"
import { Badge, Group } from "../compose"
import type { AgentModel } from "../api"
import {
  formatRuntimeLabel,
  formatUsageLine,
  formatUsageTitle,
  type UsageDisplay,
} from "./labels"
import {
  ModelSelect,
  type GrokOptions,
  type OpusOptions,
} from "./ModelSelect"
import { Box, Text } from "../primitives"
import { t } from "../i18n"

export type AgentUiStatus = "idle" | "running" | "error"

export type ChatToolbarProps = {
  runtime?: string
  /** Server-provided badge label (capabilities.runtimeLabel). */
  runtimeLabel?: string
  status: AgentUiStatus
  tools: string[]
  models: AgentModel[]
  modelId: string
  grok: GrokOptions
  opus: OpusOptions
  usage?: UsageDisplay | null
  /** Gateway evidence pack for last run (paths count). */
  evidenceFiles?: number | null
  onModelChange: (modelId: string) => void
  onGrokChange: (next: GrokOptions) => void
  onOpusChange: (next: OpusOptions) => void
}

export function ChatToolbar(props: ChatToolbarProps): JSX.Element {
  return (
    <Box class="chat-toolbar">
      <Group class="items-center gap-2 flex-wrap">
        <Badge variant="outline" class="chat-runtime-badge">
          {formatRuntimeLabel(props.runtimeLabel, props.runtime)}
        </Badge>
        <Text tag="span"
          class="chat-status"
          role="status"
          aria-live="polite"
          classList={{
            "chat-status-running": props.status === "running",
            "chat-status-error": props.status === "error",
            "chat-status-idle": props.status === "idle",
          }}
        >
          <Text tag="span" class="chat-status-dot" aria-hidden="true" />
          {props.status === "running"
            ? t("chat.statusRunning")
            : props.status === "error"
              ? t("chat.statusError")
              : t("chat.ready")}
        </Text>
        <Show when={props.tools.length > 0}>
          <Box class="chat-tools" aria-label={t("chat.activeTools")}>
            <For each={props.tools}>
              {(tool) => (
                <Text tag="span" class="chat-tool-chip">{tool}</Text>
              )}
            </For>
          </Box>
        </Show>
        <Show when={props.usage}>
          {(u) => (
            <Text tag="span" class="chat-usage" title={formatUsageTitle(u())}>
              {formatUsageLine(u())}
            </Text>
          )}
        </Show>
        <Show when={(props.evidenceFiles ?? 0) > 0}>
          <Text tag="span"
            class="chat-evidence"
            title={t("chat.serverSelectedEvidenceFiles")}
          >
            {t("chat.evidenceFiles", { count: props.evidenceFiles ?? 0 })}
          </Text>
        </Show>
      </Group>
      <Show when={props.models.length > 0}>
        <ModelSelect
          models={props.models}
          modelId={props.modelId}
          grok={props.grok}
          opus={props.opus}
          disabled={props.status === "running"}
          onModelChange={props.onModelChange}
          onGrokChange={props.onGrokChange}
          onOpusChange={props.onOpusChange}
        />
      </Show>
    </Box>
  )
}
