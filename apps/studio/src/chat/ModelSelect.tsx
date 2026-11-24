import {
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  type JSX,
} from "solid-js"
import type { AgentModel } from "../api"
import { grokOptsKey, opusOptsKey } from "../chat-store"
import { Box, Button, Checkbox, Input, Label, Radio, Select, SelectOption, Text } from "../primitives"
import { t } from "../i18n"

export type ModelParam = { id: string; value: string }

/** Grok 4.7 options (Cursor: reasoning_effort, context, fast). */
export type GrokOptions = {
  effort: "low" | "medium" | "high" | "xhigh"
  context: "256k" | "500k"
  fast: boolean
}

export type OpusOptions = {
  effort: "low" | "medium" | "high" | "xhigh" | "max"
  fast: boolean
}

export const GROK_ID = "cursor/grok-4.7"
export const OPUS_ID = "cursor/claude-opus-5"

const GROK_EFFORTS = ["low", "medium", "high", "xhigh"] as const
const GROK_CONTEXTS = ["256k", "500k"] as const
const OPUS_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const

const EFFORT_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "Extra High",
  max: "Max",
}

export type ModelSelectProps = {
  models: AgentModel[]
  modelId: string
  grok: GrokOptions
  opus: OpusOptions
  disabled?: boolean
  onModelChange: (modelId: string) => void
  onGrokChange: (next: GrokOptions) => void
  onOpusChange: (next: OpusOptions) => void
}

export function ModelSelect(props: ModelSelectProps): JSX.Element {
  const [open, setOpen] = createSignal(false)
  let root: HTMLDivElement | undefined

  createEffect(() => {
    if (!open()) return
    const onDoc = (event: MouseEvent) => {
      if (root && !root.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    onCleanup(() => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    })
  })

  const isGrok = () => props.modelId === GROK_ID
  const isOpus = () => props.modelId === OPUS_ID
  const hasModes = () => isGrok() || isOpus()

  const modeSummary = () => {
    const effort = isOpus() ? props.opus.effort : props.grok.effort
    const fast = isOpus() ? props.opus.fast : props.grok.fast
    const effortLabel = EFFORT_LABELS[effort] ?? effort
    const parts = [effortLabel]
    if (isGrok()) parts.push(props.grok.context.toUpperCase())
    if (fast) parts.push("Fast")
    return parts.join(" · ")
  }

  const popoverTitle = () => (isOpus() ? "Opus options" : "Grok options")
  const editTitle = () => (isOpus() ? "Edit Opus options" : "Edit Grok options")
  const effortName = () => (isOpus() ? "opus-effort" : "grok-effort")
  const effortLevels = () => (isOpus() ? OPUS_EFFORTS : GROK_EFFORTS)
  const currentEffort = () => (isOpus() ? props.opus.effort : props.grok.effort)
  const currentFast = () => (isOpus() ? props.opus.fast : props.grok.fast)

  const setEffort = (level: string) => {
    if (isOpus()) {
      props.onOpusChange({
        ...props.opus,
        effort: level as OpusOptions["effort"],
      })
      return
    }
    props.onGrokChange({
      ...props.grok,
      effort: level as GrokOptions["effort"],
    })
  }

  const setFast = (fast: boolean) => {
    if (isOpus()) {
      props.onOpusChange({ ...props.opus, fast })
      return
    }
    props.onGrokChange({ ...props.grok, fast })
  }

  return (
    <Box class="chat-model-select-wrap" ref={root}>
      {/* Fixed-width left slot: Edit for parameterized models, spacer otherwise. */}
      <Box class="chat-model-edit-slot">
        <Show
          when={hasModes()}
          fallback={<Text tag="span" class="chat-model-edit-spacer" aria-hidden="true" />}
        >
          <Button
            type="button"
            class="chat-model-edit"
            disabled={props.disabled}
            aria-expanded={open()}
            aria-haspopup="dialog"
            title={editTitle()}
            onClick={() => setOpen((v) => !v)}
          >
            {t("common.edit")}
          </Button>
          <Show when={open()}>
            <Box
              class="chat-model-popover"
              role="dialog"
              aria-label={popoverTitle()}
            >
              <Box class="chat-model-popover-title">{t("chat.effort")}</Box>
              <Box class="chat-model-effort" role="radiogroup" aria-label={t("chat.effort")}>
                <For each={[...effortLevels()]}>
                  {(level) => (
                    <Label class="chat-model-effort-opt">
                      <Radio
                        name={effortName()}
                        checked={currentEffort() === level}
                        onChange={() => setEffort(level)}
                      />
                      <Text tag="span">{EFFORT_LABELS[level] ?? level}</Text>
                    </Label>
                  )}
                </For>
              </Box>
              <Show when={isGrok()}>
                <Box class="chat-model-popover-divider" role="separator" />
                <Box class="chat-model-popover-title">{t("chat.context")}</Box>
                <Box class="chat-model-effort" role="radiogroup" aria-label={t("chat.context")}>
                  <For each={[...GROK_CONTEXTS]}>
                    {(ctx) => (
                      <Label class="chat-model-effort-opt">
                        <Radio
                          name="grok-context"
                          checked={props.grok.context === ctx}
                          onChange={() => props.onGrokChange({ ...props.grok, context: ctx })}
                        />
                        <Text tag="span">{ctx.toUpperCase()}</Text>
                      </Label>
                    )}
                  </For>
                </Box>
              </Show>
              <Box class="chat-model-popover-divider" role="separator" />
              <Label class="chat-model-fast">
                <Text tag="span">{t("chat.fast")}</Text>
                <Checkbox
                 
                  role="switch"
                  checked={currentFast()}
                  onChange={(e) => setFast(e.currentTarget.checked)}
                />
              </Label>
              <Box class="chat-model-popover-summary">{modeSummary()}</Box>
            </Box>
          </Show>
        </Show>
      </Box>

      <Label class="chat-model">
        <Text tag="span" class="sr-only">{t("chat.model")}</Text>
        <Select
          class="chat-model-select"
          value={props.modelId}
          disabled={props.disabled}
          onChange={(e) => {
            props.onModelChange(e.currentTarget.value)
            setOpen(false)
          }}
        >
          <For each={props.models}>
            {(m) => <SelectOption value={m.id}>{m.label}</SelectOption>}
          </For>
        </Select>
      </Label>
    </Box>
  )
}

/**
 * Build Cursor modelParams for Grok 4.7 (only when Grok is selected). Ids match
 * Cursor ListModels: `reasoning_effort` (not `effort`), `context`, `fast`.
 */
export function grokModelParams(grok: GrokOptions): ModelParam[] {
  return [
    { id: "context", value: grok.context },
    { id: "reasoning_effort", value: grok.effort },
    { id: "fast", value: grok.fast ? "true" : "false" },
  ]
}

/** Build SDK modelParams for Opus 5 (Cursor default: thinking on, 1M context). */
export function opusModelParams(opus: OpusOptions): ModelParam[] {
  return [
    { id: "thinking", value: "true" },
    { id: "context", value: "1m" },
    { id: "effort", value: opus.effort },
    { id: "fast", value: opus.fast ? "true" : "false" },
  ]
}

export function loadGrokOptions(userId: string): GrokOptions {
  try {
    const raw = localStorage.getItem(grokOptsKey(userId))
    if (!raw) return { effort: "high", context: "256k", fast: true }
    const parsed = JSON.parse(raw) as Partial<GrokOptions>
    const effort = (GROK_EFFORTS as readonly string[]).includes(parsed.effort ?? "")
      ? (parsed.effort as GrokOptions["effort"])
      : "high"
    const context = parsed.context === "500k" ? "500k" : "256k"
    return { effort, context, fast: parsed.fast !== false }
  } catch {
    return { effort: "high", context: "256k", fast: true }
  }
}

export function saveGrokOptions(userId: string, grok: GrokOptions): void {
  try {
    localStorage.setItem(grokOptsKey(userId), JSON.stringify(grok))
  } catch {
    /* ignore */
  }
}

export function loadOpusOptions(userId: string): OpusOptions {
  try {
    const raw = localStorage.getItem(opusOptsKey(userId))
    if (!raw) return { effort: "high", fast: false }
    const parsed = JSON.parse(raw) as Partial<OpusOptions>
    const effort =
      parsed.effort === "low"
      || parsed.effort === "medium"
      || parsed.effort === "high"
      || parsed.effort === "xhigh"
      || parsed.effort === "max"
        ? parsed.effort
        : "high"
    return { effort, fast: parsed.fast === true }
  } catch {
    return { effort: "high", fast: false }
  }
}

export function saveOpusOptions(userId: string, opus: OpusOptions): void {
  try {
    localStorage.setItem(opusOptsKey(userId), JSON.stringify(opus))
  } catch {
    /* ignore */
  }
}
