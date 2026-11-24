import type { JSX } from "solid-js"
import { Show } from "solid-js"
import { A } from "@solidjs/router"
import type { ChatBannerModel } from "./banner"
import { Box, Button, Text } from "../primitives"
import { AppIcon } from "../app-icons"
import { t } from "../i18n"

export type ChatBannerProps = ChatBannerModel & {
  onDismiss?: () => void
}

export function ChatBanner(props: ChatBannerProps): JSX.Element {
  const isWarn = () =>
    props.tone === "warn"
    || props.message.toLowerCase().includes("reconnect")

  return (
    <Box
      class="chat-banner"
      classList={{ "chat-banner-warn": isWarn() }}
      role="alert"
    >
      <Text tag="span" class="chat-banner-text">{props.message}</Text>
      <Show when={props.settingsHref}>
        {(href) => (
          <A class="chat-banner-settings" href={href()}>
            {t("nav.settings")}
          </A>
        )}
      </Show>
      <Show when={props.onDismiss}>
        <Button
          type="button"
          class="chat-banner-dismiss"
          aria-label={t("common.dismiss")}
          onClick={() => props.onDismiss?.()}
        >
          <AppIcon name="x" size={12} />
        </Button>
      </Show>
    </Box>
  )
}
