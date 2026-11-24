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
    <div class="chat-toolbar">
      <Group class="items-center gap-2 flex-wrap">
        <Badge variant="outline" class="chat-runtime-badge">
          {formatRuntimeLabel(props.runtimeLabel, props.runtime)}
        </Badge>
        <span
          class="chat-status"
          classList={{
            "chat-status-running": props.status === "running",
            "chat-status-error": props.status === "error",
            "chat-status-idle": props.status === "idle",
          }}
        >
          <span class="chat-status-dot" aria-hidden="true" />
          {props.status === "running"
            ? "Running"
            : props.status === "error"
              ? "Error"
              : "Ready"}
        </span>
        <Show when={props.tools.length > 0}>
          <div class="chat-tools" aria-label="Active tools">
            <For each={props.tools}>
              {(tool) => (
                <span class="chat-tool-chip">{tool}</span>
              )}
            </For>
          </div>
        </Show>
        <Show when={props.usage}>
          {(u) => (
            <span class="chat-usage" title={formatUsageTitle(u())}>
              {formatUsageLine(u())}
            </span>
          )}
        </Show>
        <Show when={(props.evidenceFiles ?? 0) > 0}>
          <span
            class="chat-evidence"
            title="Server-selected evidence files attached to the last prompt"
          >
            {props.evidenceFiles} files
          </span>
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
    </div>
  )
}
