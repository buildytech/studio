import { For, Show, createMemo, type JSX } from "solid-js"
import { Stack } from "../ui/stack/stack.solid"
import { Text } from "../ui/text/text.solid"
import type { CachedChatMessage } from "../chat-store"
import {
  ChatMessageBubble,
  type ChatFeedbackPayload,
} from "./ChatMessageBubble"

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
  scrollRef: (el: HTMLDivElement) => void
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
    <div class="chat-messages" ref={props.scrollRef}>
      <Show
        when={!props.bootstrapping}
        fallback={
          <div class="pane-empty chat-empty">
            <Text class="text-sm text-muted-foreground">Connecting to agent…</Text>
          </div>
        }
      >
        <Show
          when={props.messages.some(
            (m) => m.role === "user" || m.role === "assistant",
          )}
          fallback={
            <div class="pane-empty chat-empty">
              <Stack class="items-center gap-3 max-w-md px-4">
                <Text class="chat-empty-title">What should we change?</Text>
                <Text class="text-sm text-muted-foreground text-center">
                  Describe an edit, or import a product brief SPEC to rebuild
                  another project 1:1 on this template.
                </Text>
                <Show when={props.onImportBrief}>
                  <button
                    type="button"
                    class="chat-brief-card"
                    onClick={() => props.onImportBrief?.()}
                  >
                    <span class="chat-brief-card-title">
                      Import Project Brief
                    </span>
                    <span class="chat-brief-card-sub">
                      Load a <code>buildy.brief.v1</code> SPEC — identity,
                      design, screens, and bricks. The agent rebuilds from
                      <code>.buildy/brief.json</code>.
                    </span>
                  </button>
                </Show>
                <Show when={props.onRecognizeScreenshot}>
                  <button
                    type="button"
                    class="chat-brief-card chat-brief-card-vision"
                    disabled={props.recognizeBusy}
                    onClick={() => props.onRecognizeScreenshot?.()}
                  >
                    <span class="chat-brief-card-title">
                      {props.recognizeBusy
                        ? "Adding screenshot…"
                        : "Attach screenshot"}
                    </span>
                    <span class="chat-brief-card-sub">
                      Add an image to the next chat message (UI mock, bug,
                      reference — anything). Not tied to the product brief.
                    </span>
                  </button>
                </Show>
                <Show when={props.onStarter}>
                  <div class="chat-starters">
                    <For each={[...STARTERS]}>
                      {(hint) => (
                        <button
                          type="button"
                          class="chat-starter"
                          onClick={() => props.onStarter?.(hint)}
                        >
                          {hint}
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </Stack>
            </div>
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
    </div>
  )
}
