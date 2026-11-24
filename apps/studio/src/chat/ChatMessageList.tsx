import { For, Show, createMemo, type JSX } from "solid-js"
import { Stack } from "../compose"
import type { CachedChatMessage } from "../chat-store"
import {
  ChatMessageBubble,
  type ChatFeedbackPayload,
} from "./ChatMessageBubble"
import { Box, Button, Text } from "../primitives"
import { t } from "../i18n"

const STARTERS = [
  "Improve the welcome page layout and typography",
  "Find and fix the most obvious UI bugs",
  "Explain how this project’s main page is structured",
] as const

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
                    <For each={[...STARTERS]}>
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
            <For each={props.messages}>
              {(msg) => (
                <ChatMessageBubble
                  message={msg}
                  showFeedback={feedbackId() === msg.id}
                  onFeedback={
                    props.onFeedback && msg.runId
                      ? (payload) =>
                          props.onFeedback?.(msg.id, msg.runId!, payload)
                      : undefined
                  }
                />
              )}
            </For>
          </Stack>
        </Show>
      </Show>
    </Box>
  )
}
