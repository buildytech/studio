import { For, type JSX } from "solid-js"
import type { DesktopProvision } from "@buildy/agent-contract"
import { SetupIcon } from "../app-icons/setup-icons"
import { Block, Title } from "../compose"
import { ts, type SetupKey } from "../i18n/setup"
import { Box, Text } from "../primitives"
import { clock, elapsed } from "./model"

const CHECKS: SetupKey[] = ["ready.server", "ready.egress", "ready.token", "ready.snapshot"]

/**
 * Every step passed: the check mark pops and draws, rings spread from it, the checks come in one by one; the app
 * connects by itself and moves the window to the server's Studio.
 */
export function SetupReady(props: { p: DesktopProvision }): JSX.Element {
  const took = () => {
    const last = Math.max(0, ...props.p.steps.map((s) => s.endedAt ?? 0))
    return clock(elapsed(props.p.startedAt, last || props.p.now, props.p.now))
  }
  return (
    <Block tag="section" class="bsw-screen bsw-ready" aria-labelledby="bsw-ready-title">
      <Box class="bsw-burst" aria-hidden="true">
        <Text tag="span" class="bsw-wave" /><Text tag="span" class="bsw-wave bsw-wave-2" /><Text tag="span" class="bsw-wave bsw-wave-3" />
        <Text tag="span" class="bsw-confetti" /><Text tag="span" class="bsw-confetti" /><Text tag="span" class="bsw-confetti" /><Text tag="span" class="bsw-confetti" /><Text tag="span" class="bsw-confetti" />
        <Text tag="span" class="bsw-burst-core"><SetupIcon name="check" size={48} /></Text>
      </Box>
      <Text class="bsw-eyebrow"><SetupIcon name="party-popper" /> {ts("ready.eyebrow")}</Text>
      <Title as={1} id="bsw-ready-title" class="bsw-hero-title">{ts("ready.title")}</Title>
      <Text class="bsw-lead">{ts("ready.lead")}</Text>
      <Box tag="ul" class="bsw-checks">
        <For each={CHECKS}>{(k) => <Box tag="li" class="bsw-check"><SetupIcon name="circle-check" /> {ts(k)}</Box>}</For>
      </Box>
      <Text class="bsw-muted bsw-tabular">{ts("ready.took", { time: took() })}</Text>
      <Box class="bsw-opening" role="status">
        <SetupIcon name="loader-circle" class="bsw-spin" /> {ts("ready.opening")} <SetupIcon name="arrow-right" class="bsw-nudge" />
      </Box>
    </Block>
  )
}
