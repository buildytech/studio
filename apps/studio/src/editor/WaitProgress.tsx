import { createEffect, onCleanup, type JSX } from "solid-js"
import { createSignal } from "solid-js"
import { AppIcon } from "../app-icons"
import { Progress, Title } from "../compose"
import { t } from "../i18n"
import { Box, Text } from "../primitives"
import { formatElapsed } from "./wait-progress"
import "./wait-progress.css"

export type WaitProgressProps = {
  title: string
  step: string
  hint?: string
  /** Epoch ms when this wait started; the elapsed label counts up from here. */
  startedAt: number
  class?: string
}

/**
 * Calm indeterminate wait: current step, elapsed time, no made-up percentages.
 * Animations stop under prefers-reduced-motion (see styles.css).
 */
export function WaitProgress(props: WaitProgressProps): JSX.Element {
  const read = () => formatElapsed((Date.now() - props.startedAt) / 1000)
  const [elapsed, setElapsed] = createSignal(read())

  createEffect(() => {
    props.startedAt
    setElapsed(read())
    const id = setInterval(() => setElapsed(read()), 1000)
    onCleanup(() => clearInterval(id))
  })

  return (
    <Box class={`ws-wait${props.class ? ` ${props.class}` : ""}`} role="status" aria-live="polite" aria-busy="true">
      <AppIcon name="loader" size={28} class="ws-wait-icon" />
      <Title as={2} class="ws-wait-title">{props.title}</Title>
      <Text tag="p" class="ws-wait-step">{props.step}</Text>
      <Box class="ws-wait-bar" aria-hidden="true">
        <Box class="ws-wait-bar-fill" />
      </Box>
      <Progress class="sr-only" aria-label={props.step} />
      <Text tag="span" class="ws-wait-elapsed">{t("editor.waitElapsed", { time: elapsed() })}</Text>
      {props.hint ? <Text tag="p" class="ws-wait-hint">{props.hint}</Text> : null}
    </Box>
  )
}
