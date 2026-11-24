import { For, Show, createSignal, type JSX } from "solid-js"
import { Text } from "../compose"
import {
  FEEDBACK_DOWN_TAGS,
  type CachedChatMessage,
  type FeedbackDownTag,
} from "../chat-store"
import { MarkdownView } from "../vendor-ui/MarkdownView"

export type ChatFeedbackPayload = {
  rating: "up" | "down"
  tags?: FeedbackDownTag[]
  comment?: string
}

export type ChatMessageBubbleProps = {
  message: CachedChatMessage
  showFeedback?: boolean
  onFeedback?: (payload: ChatFeedbackPayload) => void | Promise<void>
}

function formatThinkingDuration(ms: number | undefined): string | null {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) return null
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function toolPromptGlyph(kind: string | undefined): string {
  switch (kind) {
    case "search":
      return "⌕"
    case "agent":
      return "▸▸"
    case "shell":
      return ">_"
    case "mcp":
      return "⬡"
    case "file":
      return "∷"
    case "plan":
      return "☰"
    default:
      return ">_"
  }
}

function toolKindLabel(kind: string | undefined): string | null {
  switch (kind) {
    case "search":
      return "web"
    case "agent":
      return "agent"
    case "shell":
      return "shell"
    case "mcp":
      return "mcp"
    case "file":
      return "file"
    case "plan":
      return "plan"
    default:
      return null
  }
}

export function ChatMessageBubble(props: ChatMessageBubbleProps): JSX.Element {
  const msg = () => props.message
  const role = () => msg().role
  const [downOpen, setDownOpen] = createSignal(false)
  const [selectedTags, setSelectedTags] = createSignal<FeedbackDownTag[]>([])
  const [comment, setComment] = createSignal("")
  const [busy, setBusy] = createSignal(false)
  const [hint, setHint] = createSignal("")

  const latched = () => msg().feedback
  const disabled = () => Boolean(latched()) || busy()


  const submit = async (payload: ChatFeedbackPayload) => {
    if (!props.onFeedback || disabled()) return
    setBusy(true)
    setHint("")
    try {
      await props.onFeedback(payload)
      setDownOpen(false)
    } catch {
      setHint("Couldn’t save feedback")
    } finally {
      setBusy(false)
    }
  }

  const toggleTag = (tag: FeedbackDownTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  return (
    <Show
      when={role() === "thinking" || role() === "tool"}
      fallback={
        <div
          class="chat-bubble"
          classList={{
            "chat-bubble-user": role() === "user",
            "chat-bubble-assistant": role() === "assistant",
            "chat-bubble-streaming": Boolean(msg().streaming),
          }}
        >
          <div class="chat-bubble-meta">
            <Text class="chat-bubble-role">
              {role() === "assistant" ? "Assistant" : "You"}
            </Text>
            <Show when={msg().streaming}>
              <span class="chat-streaming-label">streaming</span>
            </Show>
            <Show when={msg().attachmentName}>
              <span class="chat-attach-badge" title={msg().attachmentName}>
                📎 {msg().attachmentName}
              </span>
            </Show>
          </div>
          <Show
            when={role() === "assistant"}
            fallback={<Text class="chat-bubble-plain">{msg().text}</Text>}
          >
            {/* Streaming: plain text avoids marked+DOMPurify on every delta. */}
            <Show
              when={!msg().streaming}
              fallback={
                <Text class="chat-bubble-plain chat-md-streaming">
                  {msg().text}
                </Text>
              }
            >
              <MarkdownView class="chat-md" source={msg().text} />
            </Show>
            <Show when={props.showFeedback && msg().runId}>
              <div class="chat-feedback">
                <div class="chat-feedback-row">
                  <button
                    type="button"
                    class="chat-feedback-btn"
                    classList={{
                      "chat-feedback-btn-active": latched() === "up",
                    }}
                    disabled={disabled()}
                    aria-label="Thumbs up"
                    onClick={() => void submit({ rating: "up" })}
                  >
                    👍
                  </button>
                  <button
                    type="button"
                    class="chat-feedback-btn"
                    classList={{
                      "chat-feedback-btn-active": latched() === "down",
                    }}
                    disabled={disabled()}
                    aria-label="Thumbs down"
                    onClick={() => {
                      if (disabled()) return
                      setDownOpen((v) => !v)
                    }}
                  >
                    👎
                  </button>
                  <Show when={latched()}>
                    <span class="chat-feedback-latched">Thanks</span>
                  </Show>
                </div>
                <Show when={downOpen() && !latched()}>
                  <div class="chat-feedback-down">
                    <div class="chat-feedback-chips">
                      <For each={[...FEEDBACK_DOWN_TAGS]}>
                        {(tag) => (
                          <button
                            type="button"
                            class="chat-feedback-chip"
                            classList={{
                              "chat-feedback-chip-on": selectedTags().includes(tag),
                            }}
                            disabled={busy()}
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                          </button>
                        )}
                      </For>
                    </div>
                    <textarea
                      class="chat-feedback-comment"
                      rows={2}
                      placeholder="Optional comment"
                      value={comment()}
                      disabled={busy()}
                      onInput={(e) => setComment(e.currentTarget.value)}
                    />
                    <button
                      type="button"
                      class="chat-feedback-submit"
                      disabled={busy()}
                      onClick={() =>
                        void submit({
                          rating: "down",
                          tags: selectedTags().length
                            ? selectedTags()
                            : undefined,
                          comment: comment().trim() || undefined,
                        })
                      }
                    >
                      Submit
                    </button>
                  </div>
                </Show>
                <Show when={hint()}>
                  <Text class="chat-feedback-hint">{hint()}</Text>
                </Show>
              </div>
            </Show>
          </Show>
        </div>
      }
    >
      <div
        class="chat-trace"
        classList={{
          "chat-trace-thinking": role() === "thinking",
          "chat-trace-tool": role() === "tool",
          "chat-trace-streaming": Boolean(msg().streaming),
        }}
      >
        <Show when={role() === "thinking"}>
          <div class="chat-trace-head">
            <span class="chat-trace-label">
              {msg().streaming ? "Thinking" : "Thought"}
            </span>
            <Show when={formatThinkingDuration(msg().meta?.durationMs)}>
              {(label) => <span class="chat-trace-meta">{label()}</span>}
            </Show>
          </div>
          <pre class="chat-trace-body">{msg().text}</pre>
        </Show>
        <Show when={role() === "tool"}>
          <div
            class="chat-trace-term"
            classList={{
              "chat-trace-kind-search": msg().meta?.kind === "search",
              "chat-trace-kind-agent": msg().meta?.kind === "agent",
              "chat-trace-kind-shell": msg().meta?.kind === "shell",
              "chat-trace-kind-plan": msg().meta?.kind === "plan",
            }}
          >
            <div class="chat-trace-head">
              <span class="chat-trace-prompt">
                {toolPromptGlyph(msg().meta?.kind)}
              </span>
              <Show when={toolKindLabel(msg().meta?.kind)}>
                {(label) => (
                  <span class="chat-trace-kind">{label()}</span>
                )}
              </Show>
              <span class="chat-trace-label chat-trace-cmd" title={msg().text}>
                {msg().text}
              </span>
              <Show when={msg().meta?.toolStatus === "running"}>
                <span class="chat-trace-meta">running</span>
              </Show>
              <Show when={msg().meta?.toolStatus === "done"}>
                <span class="chat-trace-meta">done</span>
              </Show>
              <Show when={msg().meta?.toolStatus === "error"}>
                <span class="chat-trace-meta">error</span>
              </Show>
            </div>
            <Show when={msg().meta?.detail}>
              <pre class="chat-trace-body chat-trace-term-body">
                {msg().meta?.detail}
              </pre>
            </Show>
          </div>
        </Show>
      </div>
    </Show>
  )
}
