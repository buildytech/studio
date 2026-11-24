import { For, Show, createMemo, createSignal, type JSX } from "solid-js"
import { Stack } from "../compose"
import type { CachedChatMessage } from "../chat-store"
import {
  ChatMessageBubble,
  type ChatFeedbackPayload,
} from "./ChatMessageBubble"
import { Box, Button, Text } from "../primitives"
import { t } from "../i18n"
import { CHAT_RENDER_WINDOW, createChatItems, rowToCall } from "./tools/rows"
import { ToolGroupView, ToolLiveRegion } from "./tools/renderers"

const STARTERS = ["chat.starter.layout", "chat.starter.bugs", "chat.starter.explain"] as const

/** Seed composer after a product brief import. */
export const BRIEF_REBUILD_STARTER =
  "Rebuild this product 1:1 from `.buildy/brief.json`. "
  + "Treat the brief SPEC as the source of truth for identity, design, "
  + "screens, bricks, and content."

/**
 * Seed composer after attaching a screenshot (general vision — not brief-bound).
 * Hypothesis prompt: image is the source of truth for the next agent turn.
 */
export const SCREENSHOT_ATTACH_STARTER =
  "Look at the attached screenshot. Use it as the visual source of truth — "
  + "match layout, copy, colors, and typography from the image. "
  + "First say what you see, then rebuild this screen 1:1 in the project."

export type ChatMessageListProps = {
  bootstrapping: boolean
  messages: CachedChatMessage[]
  scrollRef: (el: HTMLElement) => void
  onStarter?: (text: string) => void
  onImportBrief?: () => void
  onRecognizeScreenshot?: () => void
  recognizeBusy?: boolean
  /** Id of the last rateable assistant message (runId set, not streaming). */
  feedbackMessageId?: string | null
  onFeedback?: (
    messageId: string,
    runId: string,
    payload: ChatFeedbackPayload,
  ) => void | Promise<void>
}

export function ChatMessageList(props: ChatMessageListProps): JSX.Element {
  const feedbackId = createMemo(() => props.feedbackMessageId ?? null)
  const toItems = createChatItems()
  const items = createMemo(() => toItems(props.messages))
  const [windowSize, setWindowSize] = createSignal(CHAT_RENDER_WINDOW)
  const hiddenCount = () => Math.max(0, items().length - windowSize())
  const visibleItems = createMemo(() => items().slice(hiddenCount()))
  const lastTool = createMemo(() => {
    for (let i = props.messages.length - 1; i >= 0; i--) {
      if (props.messages[i]!.role === "tool") return rowToCall(props.messages[i]!)
    }
    return undefined
  })

  return (
    <Box class="chat-messages" ref={props.scrollRef}>
      <Show
        when={!props.bootstrapping}
        fallback={
          <Box class="pane-empty chat-empty">
            <Text class="text-sm text-muted-foreground">{t("chat.connectingToAgent")}</Text>
          </Box>
        }
      >
        <Show
          when={props.messages.some(
            (m) => m.role === "user" || m.role === "assistant",
          )}
          fallback={
            <Box class="pane-empty chat-empty">
              <Stack class="items-center gap-3 max-w-md px-4">
                <Text class="chat-empty-title">{t("chat.whatShouldWeChange")}</Text>
                <Text class="text-sm text-muted-foreground text-center">
                  {t("chat.describeAnEditOr")}
                </Text>
                <Show when={props.onImportBrief}>
                  <Button
                    type="button"
                    class="chat-brief-card"
                    onClick={() => props.onImportBrief?.()}
                  >
                    <Text tag="span" class="chat-brief-card-title">
                      {t("chat.importProjectBrief")}
                    </Text>
                    <Text tag="span" class="chat-brief-card-sub">
                      {t("chat.briefCardLead", { spec: "buildy.brief.v1", file: ".buildy/brief.json" })}
                    </Text>
                  </Button>
                </Show>
                <Show when={props.onRecognizeScreenshot}>
                  <Button
                    type="button"
                    class="chat-brief-card chat-brief-card-vision"
                    disabled={props.recognizeBusy}
                    onClick={() => props.onRecognizeScreenshot?.()}
                  >
                    <Text tag="span" class="chat-brief-card-title">
                      {props.recognizeBusy
                        ? t("chat.addingScreenshot")
                        : t("chat.attachScreenshot")}
                    </Text>
                    <Text tag="span" class="chat-brief-card-sub">
                      {t("chat.addAnImageTo")}
                    </Text>
                  </Button>
                </Show>
                <Show when={props.onStarter}>
                  <Box class="chat-starters">
                    <For each={STARTERS.map((key) => t(key))}>
                      {(hint) => (
                        <Button
                          type="button"
                          class="chat-starter"
                          onClick={() => props.onStarter?.(hint)}
                        >
                          {hint}
                        </Button>
                      )}
                    </For>
                  </Box>
                </Show>
              </Stack>
            </Box>
          }
        >
          <Stack class="gap-3 p-3">
            <ToolLiveRegion call={lastTool()} />
            <Show when={hiddenCount() > 0}>
              <Button type="button" class="btn ghost self-center" onClick={() => setWindowSize((n) => n + CHAT_RENDER_WINDOW)}>
                {t("chat.showEarlier", { count: hiddenCount() })}
              </Button>
            </Show>
            <For each={visibleItems()}>
              {(item) =>
                item.type === "tools" ? (
                  <Box class="mr-auto w-full max-w-[720px]"><ToolGroupView kind={item.kind} calls={item.rows.map(rowToCall)} /></Box>
                ) : (
                  <ChatMessageBubble
                    message={item.message}
                    showFeedback={feedbackId() === item.message.id}
                    onFeedback={
                      props.onFeedback && item.message.runId
                        ? (payload) =>
                            props.onFeedback?.(item.message.id, item.message.runId!, payload)
                        : undefined
                    }
                  />
                )
              }
            </For>
          </Stack>
        </Show>
      </Show>
    </Box>
  )
}
