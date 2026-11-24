import { Show, createSignal, type JSX } from "solid-js"
import { AppIcon, type IconName } from "../../app-icons"
import { t, type MessageKey } from "../../i18n"
import { Box, Button, Disclosure, Summary, Text } from "../../primitives"
import { TOOL_OUTPUT_MAX, type ToolCall as Call, type ToolStatus } from "./model"

/**
 * Composite tool call (ADR 0005): Root / Header / Status / Body / Actions. Renderers fill the Body and pick the
 * icon; the composite owns layout, status and accessibility, so every tool looks and reads the same.
 */

const STATUS_CLASS: Record<ToolStatus, string> = {
  running: "text-brand",
  done: "text-muted-foreground",
  error: "text-danger",
  cancelled: "text-warn",
}

function Root(props: { call: Call; children: JSX.Element }): JSX.Element {
  return (
    <Box
      role="group"
      aria-label={t("tools.callLabel", { tool: props.call.tool, summary: props.call.summary })}
      aria-busy={props.call.status === "running"}
      data-tool={props.call.tool}
      data-status={props.call.status}
      class="flex min-w-0 flex-col rounded border border-border bg-card text-xs"
      classList={{ "border-danger/40": props.call.status === "error" }}
    >
      {props.children}
    </Box>
  )
}

function Status(props: { status: ToolStatus }): JSX.Element {
  return (
    <Text tag="span" class={`shrink-0 ${STATUS_CLASS[props.status]}`} data-slot="tool-status">
      {t(`tools.status.${props.status}` as MessageKey)}
    </Text>
  )
}

const KINDS = new Set(["shell", "file", "search", "agent", "mcp", "plan"])
export const kindLabel = (kind: string): string => t((KINDS.has(kind) ? `tools.kind.${kind}` : "tools.kind.tool") as MessageKey)

function Header(props: { call: Call; icon: IconName; extra?: JSX.Element }): JSX.Element {
  return (
    <Box class="flex min-w-0 items-center gap-2 px-2 py-1">
      <AppIcon name={props.icon} size={12} class="shrink-0 text-muted-foreground" />
      <Text tag="span" class="shrink-0 text-muted-foreground">{kindLabel(props.call.kind)}</Text>
      <Text tag="code" class="min-w-0 flex-1 truncate font-mono text-foreground" title={props.call.summary}>
        {props.call.summary}
      </Text>
      {props.extra}
      <Status status={props.call.status} />
    </Box>
  )
}

function Body(props: { call: Call; children: JSX.Element; actions?: JSX.Element }): JSX.Element {
  // Quiet calls start folded; running, failed and stopped ones start open (docs/ux-review.md: density).
  return (
    <Disclosure open={props.call.status !== "done"} class="border-t border-border">
      <Summary class="cursor-pointer px-2 py-1 text-muted-foreground">{t("tools.output")}</Summary>
      <Box class="max-h-72 overflow-auto px-2 pb-2">{props.children}</Box>
      <Show when={props.call.truncated}>
        <Text class="px-2 pb-1 text-muted-foreground">{t("tools.truncated", { max: TOOL_OUTPUT_MAX })}</Text>
      </Show>
      {props.actions}
    </Disclosure>
  )
}

function Actions(props: { call: Call }): JSX.Element {
  const [copied, setCopied] = createSignal(false)
  const copy = async () => {
    await navigator.clipboard?.writeText(props.call.output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <Show when={props.call.output && props.call.status !== "running"}>
      <Box class="flex justify-end px-2 pb-1">
        <Button type="button" class="text-muted-foreground hover:text-foreground" onClick={() => void copy()}>
          {copied() ? t("tools.copied") : t("tools.copyOutput")}
        </Button>
      </Box>
    </Show>
  )
}

export const ToolCall = { Root, Header, Status, Body, Actions }
