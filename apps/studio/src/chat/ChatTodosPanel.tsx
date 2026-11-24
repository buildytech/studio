import { For, Show, type JSX } from "solid-js"
import type { AgentTodoItem, AgentTodoStatus } from "@buildy/agent-contract"
import { todosProgress } from "./session-todos"
import { Box, Button, Text } from "../primitives"
import { AppIcon } from "../app-icons"
import { t } from "../i18n"

export type ChatTodosPanelProps = {
  todos: AgentTodoItem[]
  /** Collapse the list body while keeping the progress header. */
  collapsed?: boolean
  onToggle?: () => void
  onDismiss?: () => void
}

function mark(status: AgentTodoStatus): string {
  switch (status) {
    case "completed":
      return "☑"
    case "inProgress":
      return "◐"
    case "cancelled":
      return "☒"
    default:
      return "☐"
  }
}

function statusClass(status: AgentTodoStatus): string {
  switch (status) {
    case "completed":
      return "chat-todos-item-done"
    case "inProgress":
      return "chat-todos-item-active"
    case "cancelled":
      return "chat-todos-item-cancelled"
    default:
      return "chat-todos-item-pending"
  }
}

export function ChatTodosPanel(props: ChatTodosPanelProps): JSX.Element {
  const progress = () => todosProgress(props.todos)
  const label = () => {
    const { done, total, active } = progress()
    if (active > 0) return `Tasks ${done}/${total} · ${active} active`
    return `Tasks ${done}/${total}`
  }

  return (
    <Show when={props.todos.length > 0}>
      <Box class="chat-todos" role="region" aria-label={t("chat.agentTasks")}>
        <Box class="chat-todos-head">
          <Button
            type="button"
            class="chat-todos-toggle"
            aria-expanded={!props.collapsed}
            onClick={() => props.onToggle?.()}
          >
            <Text tag="span" class="chat-todos-title">{label()}</Text>
            <AppIcon name={props.collapsed ? "chevron-right" : "chevron-down"} size={12} class="chat-todos-chevron" />
          </Button>
          <Show when={props.onDismiss}>
            <Button
              type="button"
              class="chat-todos-dismiss"
              title={t("chat.hideTasks")}
              aria-label={t("chat.hideTasks")}
              onClick={() => props.onDismiss?.()}
            >
              <AppIcon name="x" size={12} />
            </Button>
          </Show>
        </Box>
        <Show when={!props.collapsed}>
          <Box tag="ul" class="chat-todos-list">
            <For each={props.todos}>
              {(item) => (
                <Box tag="li" class={`chat-todos-item ${statusClass(item.status)}`}>
                  <Text tag="span" class="chat-todos-mark" aria-hidden="true">
                    {mark(item.status)}
                  </Text>
                  <Text tag="span" class="chat-todos-text">{item.content}</Text>
                </Box>
              )}
            </For>
          </Box>
        </Show>
      </Box>
    </Show>
  )
}
