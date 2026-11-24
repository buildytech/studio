import { Show, type JSX } from "solid-js"
import { Button, ButtonPlain, Group, Text, Textarea } from "../compose"
import { Box, Image } from "../primitives"
import { AppIcon } from "../app-icons"
import { t } from "../i18n"
import { isSendKey } from "./composer-keys"

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
      if (event.isComposing) return
      event.preventDefault()
      if (isSendKey(event) && props.canSend) props.onSend()
    } else if (event.key === "Escape" && props.running) {
      // docs/ux-review.md: Esc stops the run from the composer.
      event.preventDefault()
      props.onAbort()
    }
  }

  return (
    <Box class="chat-composer">
      <Show when={props.attachment}>
        {(att) => (
          <Box class="chat-attach-chip" aria-live="polite">
            <Image
              class="chat-attach-thumb"
              src={att().previewUrl}
              alt=""
            />
            <Box class="chat-attach-meta">
              <Text class="chat-attach-label">{t("chat.screenshotAttached")}</Text>
              <Text class="chat-attach-name">{att().name}</Text>
            </Box>
            <Show when={props.onClearAttachment}>
              <ButtonPlain
                type="button"
                class="chat-attach-clear"
                aria-label={t("chat.removeScreenshot")}
                disabled={props.disabled || props.running}
                onClick={() => props.onClearAttachment?.()}
              >
                <AppIcon name="x" size={12} />
              </ButtonPlain>
            </Show>
          </Box>
        )}
      </Show>
      <Textarea
        class="chat-input"
        rows={3}
        value={props.draft}
        disabled={props.disabled}
        placeholder={
          props.attachment
            ? t("chat.describeWhatToDo")
            : t("chat.messageTheAgent")
        }
        onInput={(e: InputEvent & { currentTarget: HTMLTextAreaElement }) =>
          props.onDraftChange(e.currentTarget.value)
        }
        onKeyDown={onKeyDown}
      />
      <Group class="chat-composer-bar items-center justify-between gap-2">
        <Text class="chat-composer-hint">
          {props.attachment
            ? t("chat.screenshotReadyEnterSend")
            : t("chat.enterSendShiftEnter")}
        </Text>
        <Group class="gap-2">
          <Show when={props.running}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => props.onAbort()}
            >
              {t("common.stop")}
            </Button>
          </Show>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!props.canSend}
            onClick={() => props.onSend()}
          >
            {props.running ? t("chat.working") : t("chat.send")}
          </Button>
        </Group>
      </Group>
    </Box>
  )
}
