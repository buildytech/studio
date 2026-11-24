import { For, Show, createSignal, type JSX } from "solid-js"
import {
  FEEDBACK_DOWN_TAGS,
  type CachedChatMessage,
  type FeedbackDownTag,
} from "../chat-store"
import { MarkdownView } from "../vendor-ui/MarkdownView"
import { Box, Button, Text, Textarea } from "../primitives"
import { AppIcon } from "../app-icons"
import { t } from "../i18n"

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
        <Box
          class="chat-bubble"
          classList={{
            "chat-bubble-user": role() === "user",
            "chat-bubble-assistant": role() === "assistant",
            "chat-bubble-streaming": Boolean(msg().streaming),
          }}
        >
          <Box class="chat-bubble-meta">
            <Text class="chat-bubble-role">
              {role() === "assistant" ? t("chat.assistant") : t("chat.you")}
            </Text>
            <Show when={msg().streaming}>
              <Text tag="span" class="chat-streaming-label">{t("chat.streaming")}</Text>
            </Show>
            <Show when={msg().attachmentName}>
              <Text tag="span" class="chat-attach-badge" title={msg().attachmentName}>
                <AppIcon name="paperclip" size={12} /> {msg().attachmentName}
              </Text>
            </Show>
          </Box>
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
              <Box class="chat-feedback">
                <Box class="chat-feedback-row">
                  <Button
                    type="button"
                    class="chat-feedback-btn"
                    classList={{
                      "chat-feedback-btn-active": latched() === "up",
                    }}
                    disabled={disabled()}
                    aria-label={t("chat.thumbsUp")}
                    onClick={() => void submit({ rating: "up" })}
                  >
                    👍
                  </Button>
                  <Button
                    type="button"
                    class="chat-feedback-btn"
                    classList={{
                      "chat-feedback-btn-active": latched() === "down",
                    }}
                    disabled={disabled()}
                    aria-label={t("chat.thumbsDown")}
                    onClick={() => {
                      if (disabled()) return
                      setDownOpen((v) => !v)
                    }}
                  >
                    👎
                  </Button>
                  <Show when={latched()}>
                    <Text tag="span" class="chat-feedback-latched">{t("chat.thanks")}</Text>
                  </Show>
                </Box>
                <Show when={downOpen() && !latched()}>
                  <Box class="chat-feedback-down">
                    <Box class="chat-feedback-chips">
                      <For each={[...FEEDBACK_DOWN_TAGS]}>
                        {(tag) => (
                          <Button
                            type="button"
                            class="chat-feedback-chip"
                            classList={{
                              "chat-feedback-chip-on": selectedTags().includes(tag),
                            }}
                            disabled={busy()}
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                          </Button>
                        )}
                      </For>
                    </Box>
                    <Textarea
                      class="chat-feedback-comment"
                      rows={2}
                      placeholder={t("chat.optionalComment")}
                      value={comment()}
                      disabled={busy()}
                      onInput={(e) => setComment(e.currentTarget.value)}
                    />
                    <Button
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
                      {t("chat.submit")}
                    </Button>
                  </Box>
                </Show>
                <Show when={hint()}>
                  <Text class="chat-feedback-hint">{hint()}</Text>
                </Show>
              </Box>
            </Show>
          </Show>
        </Box>
      }
    >
      <Box
        class="chat-trace"
        classList={{
          "chat-trace-thinking": role() === "thinking",
          "chat-trace-tool": role() === "tool",
          "chat-trace-streaming": Boolean(msg().streaming),
        }}
      >
        <Show when={role() === "thinking"}>
          <Box class="chat-trace-head">
            <Text tag="span" class="chat-trace-label">
              {msg().streaming ? t("chat.thinking") : t("chat.thought")}
            </Text>
            <Show when={formatThinkingDuration(msg().meta?.durationMs)}>
              {(label) => <Text tag="span" class="chat-trace-meta">{label()}</Text>}
            </Show>
          </Box>
          <Text tag="pre" class="chat-trace-body">{msg().text}</Text>
        </Show>
        <Show when={role() === "tool"}>
          <Box
            class="chat-trace-term"
            classList={{
              "chat-trace-kind-search": msg().meta?.kind === "search",
              "chat-trace-kind-agent": msg().meta?.kind === "agent",
              "chat-trace-kind-shell": msg().meta?.kind === "shell",
              "chat-trace-kind-plan": msg().meta?.kind === "plan",
            }}
          >
            <Box class="chat-trace-head">
              <Text tag="span" class="chat-trace-prompt">
                {toolPromptGlyph(msg().meta?.kind)}
              </Text>
              <Show when={toolKindLabel(msg().meta?.kind)}>
                {(label) => (
                  <Text tag="span" class="chat-trace-kind">{label()}</Text>
                )}
              </Show>
              <Text tag="span" class="chat-trace-label chat-trace-cmd" title={msg().text}>
                {msg().text}
              </Text>
              <Show when={msg().meta?.toolStatus === "running"}>
                <Text tag="span" class="chat-trace-meta">{t("chat.running")}</Text>
              </Show>
              <Show when={msg().meta?.toolStatus === "done"}>
                <Text tag="span" class="chat-trace-meta">{t("chat.done")}</Text>
              </Show>
              <Show when={msg().meta?.toolStatus === "error"}>
                <Text tag="span" class="chat-trace-meta">{t("chat.error")}</Text>
              </Show>
            </Box>
            <Show when={msg().meta?.detail}>
              <Text tag="pre" class="chat-trace-body chat-trace-term-body">
                {msg().meta?.detail}
              </Text>
            </Show>
          </Box>
        </Show>
      </Box>
    </Show>
  )
}
