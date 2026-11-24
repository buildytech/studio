import { For, Show, type JSX } from "solid-js"
import type { AgentTodoItem, AgentTodoStatus } from "@buildy/agent-contract"
import { todosProgress } from "./session-todos"

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
      <div class="chat-todos" role="region" aria-label="Agent tasks">
        <div class="chat-todos-head">
          <button
            type="button"
            class="chat-todos-toggle"
            aria-expanded={!props.collapsed}
            onClick={() => props.onToggle?.()}
          >
            <span class="chat-todos-title">{label()}</span>
            <span class="chat-todos-chevron" aria-hidden="true">
              {props.collapsed ? "▸" : "▾"}
            </span>
          </button>
          <Show when={props.onDismiss}>
            <button
              type="button"
              class="chat-todos-dismiss"
              title="Hide tasks"
              aria-label="Hide tasks"
              onClick={() => props.onDismiss?.()}
            >
              ×
            </button>
          </Show>
        </div>
        <Show when={!props.collapsed}>
          <ul class="chat-todos-list">
            <For each={props.todos}>
              {(item) => (
                <li class={`chat-todos-item ${statusClass(item.status)}`}>
                  <span class="chat-todos-mark" aria-hidden="true">
                    {mark(item.status)}
                  </span>
                  <span class="chat-todos-text">{item.content}</span>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>
    </Show>
  )
}
