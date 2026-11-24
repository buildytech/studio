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
import { ToolCallView } from "./tools/renderers"
import { rowToCall } from "./tools/rows"

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
        class={role() === "tool" ? "mr-auto w-full max-w-[720px]" : "chat-trace"}
        classList={{
          "chat-trace-thinking": role() === "thinking",
          "chat-trace-streaming": role() === "thinking" && Boolean(msg().streaming),
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
          <ToolCallView call={rowToCall(msg())} />
        </Show>
      </Box>
    </Show>
  )
}
