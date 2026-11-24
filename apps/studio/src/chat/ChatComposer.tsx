import { Show, type JSX } from "solid-js"
import { Button } from "../ui/button/button.solid"
import { Group } from "../ui/group/group.solid"
import { Text } from "../ui/text/text.solid"
import { Textarea } from "../ui/textarea/textarea.solid"

export type ComposerAttachment = {
  name: string
  previewUrl: string
}

export type ChatComposerProps = {
  draft: string
  disabled?: boolean
  running?: boolean
  canSend?: boolean
  attachment?: ComposerAttachment | null
  onDraftChange: (value: string) => void
  onClearAttachment?: () => void
  onSend: () => void
  onAbort: () => void
}

export function ChatComposer(props: ChatComposerProps): JSX.Element {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      if (props.canSend) props.onSend()
    }
  }

  return (
    <div class="chat-composer">
      <Show when={props.attachment}>
        {(att) => (
          <div class="chat-attach-chip" aria-live="polite">
            <img
              class="chat-attach-thumb"
              src={att().previewUrl}
              alt=""
            />
            <div class="chat-attach-meta">
              <Text class="chat-attach-label">Screenshot attached</Text>
              <Text class="chat-attach-name">{att().name}</Text>
            </div>
            <Show when={props.onClearAttachment}>
              <button
                type="button"
                class="chat-attach-clear"
                aria-label="Remove screenshot"
                disabled={props.disabled || props.running}
                onClick={() => props.onClearAttachment?.()}
              >
                ×
              </button>
            </Show>
          </div>
        )}
      </Show>
      <Textarea
        class="chat-input"
        rows={3}
        value={props.draft}
        disabled={props.disabled}
        placeholder={
          props.attachment
            ? "Describe what to do with the screenshot…"
            : "Message the agent…"
        }
        onInput={(e: InputEvent & { currentTarget: HTMLTextAreaElement }) =>
          props.onDraftChange(e.currentTarget.value)
        }
        onKeyDown={onKeyDown}
      />
      <Group class="chat-composer-bar items-center justify-between gap-2">
        <Text class="chat-composer-hint">
          {props.attachment
            ? "Screenshot ready · Enter send · Shift+Enter newline"
            : "Enter send · Shift+Enter newline"}
        </Text>
        <Group class="gap-2">
          <Show when={props.running}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => props.onAbort()}
            >
              Stop
            </Button>
          </Show>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!props.canSend}
            onClick={() => props.onSend()}
          >
            {props.running ? "Working…" : "Send"}
          </Button>
        </Group>
      </Group>
    </div>
  )
}
