import { For, Show, createEffect, type JSX } from "solid-js"
import type { DesktopProvision } from "@buildy/agent-contract"
import { SetupIcon } from "../app-icons/setup-icons"
import { Block, Title } from "../compose"
import { ts } from "../i18n/setup"
import { Box, Text } from "../primitives"
import { timeOfDay } from "./model"

/** The run's live log (the app's lines, secrets redacted by the app), newest at the bottom; follows new lines. */
export function SetupLog(props: { lines: DesktopProvision["log"]; rows?: "short" | "tall" }): JSX.Element {
  let list: HTMLElement | undefined
  createEffect(() => {
    void props.lines.length
    if (list) list.scrollTop = list.scrollHeight
  })
  return (
    <Block tag="section" class="bsw-card bsw-log-card" aria-labelledby="bsw-log-title">
      <Box class="bsw-row bsw-between">
        <Title as={2} id="bsw-log-title" class="bsw-card-title">
          <SetupIcon name="terminal" /> {ts("log.title")}
        </Title>
        <Text tag="small" class="bsw-muted">{ts("log.note")}</Text>
      </Box>
      <Box class={`bsw-log bsw-log-${props.rows ?? "tall"}`} role="log" aria-labelledby="bsw-log-title" ref={(el: HTMLElement) => (list = el)}>
        <Show when={props.lines.length} fallback={<Text class="bsw-log-empty">{ts("log.empty")}</Text>}>
          <Box tag="ol" class="bsw-log-list">
            <For each={props.lines}>
              {(l) => (
                <Box tag="li" class="bsw-log-line">
                  <Text tag="time" class="bsw-log-time">{timeOfDay(l.at)}</Text>
                  <Text tag="span" class={/: (done|ok)\b|done in /.test(l.text) ? "bsw-log-text bsw-log-ok" : /failed|refuse/.test(l.text) ? "bsw-log-text bsw-log-bad" : "bsw-log-text"}>{l.text}</Text>
                </Box>
              )}
            </For>
          </Box>
        </Show>
      </Box>
    </Block>
  )
}
