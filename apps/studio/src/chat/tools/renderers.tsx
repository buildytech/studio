import { For, Show, createMemo, type JSX } from "solid-js"
import { AppIcon } from "../../app-icons"
import type { IconName } from "../../app-icons"
import { t, type MessageKey } from "../../i18n"
import { Box, Disclosure, Summary, Text } from "../../primitives"
import type { ToolCall as Call } from "./model"
import { ToolRendererRegistry, diffStats, parseUnifiedDiff, toolMatchers, type DiffLine } from "./registry"
import { ToolCall, kindLabel } from "./ToolCall"

/** A renderer's view: the icon of its calls, an optional header extra, and the body. */
export type ToolView = {
  icon: IconName
  extra?: (call: Call) => JSX.Element
  body: (call: Call) => JSX.Element
}

const Pre = (props: { text: string }) => (
  <Text tag="pre" class="m-0 whitespace-pre-wrap break-words font-mono text-muted-foreground">{props.text}</Text>
)

const DIFF_CLASS: Record<DiffLine["type"], string> = {
  add: "bg-ok/10 text-ok",
  del: "bg-danger/10 text-danger",
  hunk: "text-info",
  meta: "text-muted-foreground",
  ctx: "text-muted-foreground",
}

function Diff(props: { text: string }): JSX.Element {
  return (
    <Box class="font-mono">
      <For each={parseUnifiedDiff(props.text)}>
        {(line) => (
          <Text tag="pre" class={`m-0 whitespace-pre-wrap break-words ${DIFF_CLASS[line.type]}`} data-diff={line.type}>
            {line.type === "add" ? `+${line.text}` : line.type === "del" ? `-${line.text}` : line.text}
          </Text>
        )}
      </For>
    </Box>
  )
}

const text: ToolView["body"] = (call) => <Pre text={call.output} />

export function createToolRegistry(): ToolRendererRegistry<ToolView> {
  return new ToolRendererRegistry<ToolView>({ id: "fallback", matches: () => true, view: { icon: "wrench", body: text } })
    .register({ id: "search", matches: toolMatchers.search, view: { icon: "search", body: text } })
    .register({ id: "read", matches: toolMatchers.read, view: { icon: "file-text", body: text } })
    .register({ id: "preview", matches: toolMatchers.preview, view: { icon: "monitor", body: text } })
    .register({ id: "shell", matches: toolMatchers.shell, view: { icon: "terminal", body: text } })
    .register({
      id: "edit",
      matches: toolMatchers.edit,
      view: {
        icon: "file-pen",
        extra: (call) => {
          const stats = diffStats(parseUnifiedDiff(call.output))
          return (
            <Show when={stats.added || stats.removed}>
              <Text tag="span" class="shrink-0 font-mono text-muted-foreground">{t("tools.diffStats", stats)}</Text>
            </Show>
          )
        },
        body: (call) => <Diff text={call.output} />,
      },
    })
}

export const defaultToolRegistry = createToolRegistry()

/** One call through the registry: the composite with the matching renderer's icon and body. */
export function ToolCallView(props: { call: Call; registry?: ToolRendererRegistry<ToolView> }): JSX.Element {
  const view = () => (props.registry ?? defaultToolRegistry).resolve(props.call).view
  return (
    <ToolCall.Root call={props.call}>
      <ToolCall.Header call={props.call} icon={view().icon} extra={view().extra?.(props.call)} />
      <Show when={props.call.output}>
        <ToolCall.Body call={props.call} actions={<ToolCall.Actions call={props.call} />}>
          {view().body(props.call)}
        </ToolCall.Body>
      </Show>
    </ToolCall.Root>
  )
}

/** A folded run of quiet calls of one kind: one line until opened (docs/ux-review.md: group tool calls). */
export function ToolGroupView(props: { kind: string; calls: Call[]; registry?: ToolRendererRegistry<ToolView> }): JSX.Element {
  const icon = () => (props.registry ?? defaultToolRegistry).resolve(props.calls[0]!).view.icon
  return (
    <Disclosure class="rounded border border-border bg-card text-xs" data-tool-group={props.kind}>
      <Summary class="flex cursor-pointer items-center gap-2 px-2 py-1 text-muted-foreground">
        <AppIcon name={icon()} size={12} />
        {t("tools.group", { count: props.calls.length, kind: kindLabel(props.kind) })}
      </Summary>
      <Box class="flex flex-col gap-1 p-1">
        <For each={props.calls}>{(call) => <ToolCallView call={call} registry={props.registry} />}</For>
      </Box>
    </Disclosure>
  )
}

/** One polite live region per chat (ADR 0005 §6): it speaks status changes of the latest call, never output deltas. */
export function ToolLiveRegion(props: { call: Call | undefined }): JSX.Element {
  const text = createMemo(() =>
    props.call ? t("tools.announce", { tool: props.call.tool, status: t(`tools.status.${props.call.status}` as MessageKey) }) : "",
  )
  return (
    <Text tag="span" role="status" aria-live="polite" class="sr-only" data-slot="tool-live">
      {text()}
    </Text>
  )
}
