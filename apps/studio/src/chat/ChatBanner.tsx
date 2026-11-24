import type { JSX } from "solid-js"
import { Show } from "solid-js"
import { A } from "@solidjs/router"
import type { ChatBannerModel } from "./banner"

export type ChatBannerProps = ChatBannerModel & {
  onDismiss?: () => void
}

export function ChatBanner(props: ChatBannerProps): JSX.Element {
  const isWarn = () =>
    props.tone === "warn"
    || props.message.toLowerCase().includes("reconnect")

  return (
    <div
      class="chat-banner"
      classList={{ "chat-banner-warn": isWarn() }}
      role="alert"
    >
      <span class="chat-banner-text">{props.message}</span>
      <Show when={props.settingsHref}>
        {(href) => (
          <A class="chat-banner-settings" href={href()}>
            Settings
          </A>
        )}
      </Show>
      <Show when={props.onDismiss}>
        <button
          type="button"
          class="chat-banner-dismiss"
          aria-label="Dismiss"
          onClick={() => props.onDismiss?.()}
        >
          ×
        </button>
      </Show>
    </div>
  )
}
