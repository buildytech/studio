import { For, type JSX } from "solid-js"
import type { DesktopProvision } from "@buildy/agent-contract"
import { SetupIcon } from "../app-icons/setup-icons"
import { Block, Progress, Title } from "../compose"
import { ts, type SetupKey } from "../i18n/setup"
import { Box, Button, Text } from "../primitives"
import { SUB_ICONS, stateIcon } from "./icons"
import { SUB_COMMANDS, clock, elapsed, finished, incusSpan, incusSubs } from "./model"
import { SetupLog } from "./SetupLog"

/**
 * The longest part (steps incus and container) on its own screen: a tower of eight blocks, one per real substep
 * reported by the app; a block drops into place when its substep starts and settles when it is done. Beside it the
 * timer of the whole part, each substep's command and time, and the live log below.
 */
export function SetupIncus(props: { p: DesktopProvision; now: number; onAll: () => void }): JSX.Element {
  const subs = () => incusSubs(props.p)
  const done = () => subs().filter((s) => finished(s.state)).length
  const span = () => incusSpan(props.p)
  const running = () => subs().find((s) => s.state === "running")
  return (
    <Block tag="section" class="bsw-screen bsw-incus" aria-labelledby="bsw-incus-title">
      <Box class="bsw-row bsw-between bsw-wrap">
        <Box class="bsw-stack-1">
          <Text class="bsw-eyebrow"><SetupIcon name="container" /> {ts("incus.eyebrow")}</Text>
          <Title as={1} id="bsw-incus-title" class="bsw-title">{ts("incus.title")}</Title>
        </Box>
        <Button class="bsw-btn bsw-btn-outline" type="button" onClick={() => props.onAll()}>
          <SetupIcon name="list" /> {ts("incus.allSteps")}
        </Button>
      </Box>
      <Box class="bsw-incus-grid">
        <Box class="bsw-stage">
          <Box class={running() ? "bsw-crane bsw-crane-working" : "bsw-crane"} aria-hidden="true" />
          <Box class="bsw-sparks" aria-hidden="true">
            <Text tag="span" class="bsw-spark" /><Text tag="span" class="bsw-spark" /><Text tag="span" class="bsw-spark" /><Text tag="span" class="bsw-spark" />
          </Box>
          <Box tag="ol" class={done() === subs().length ? "bsw-tower bsw-tower-done" : "bsw-tower"} aria-label={ts("incus.towerLabel")}>
            <For each={subs()}>
              {(s) => (
                <Box tag="li" class={`bsw-layer bsw-layer-${s.state}`}>
                  <SetupIcon name={s.state === "pending" ? SUB_ICONS[s.id] : stateIcon(s.state, SUB_ICONS[s.id])} class={s.state === "running" ? "bsw-spin" : undefined} />
                  <Text tag="span" class="bsw-layer-name">{ts(`sub.${s.id}` as SetupKey)}</Text>
                  <Text tag="span" class="bsw-layer-state">{ts(`state.${s.state}` as SetupKey)}</Text>
                </Box>
              )}
            </For>
          </Box>
        </Box>
        <Box class="bsw-stack-2">
          <Box class="bsw-card bsw-stack-2">
            <Box class="bsw-row bsw-between">
              <Text class="bsw-muted">{ts("incus.current")}</Text>
              <Text tag="span" class="bsw-badge bsw-badge-primary bsw-tabular">{ts("incus.count", { done: done(), total: subs().length })}</Text>
            </Box>
            <Text tag="span" class="bsw-big-timer bsw-tabular">{clock(elapsed(span().startedAt, span().endedAt, props.now))}</Text>
            <Progress class="bsw-progress bsw-progress-running" value={done()} max={subs().length} aria-label={ts("incus.subsLabel")} />
            <Text class="bsw-hint">{ts("incus.note")}</Text>
          </Box>
          <Box class="bsw-card">
            <Box tag="ol" class="bsw-subs" aria-label={ts("incus.subsLabel")}>
              <For each={subs()}>
                {(s) => (
                  <Box tag="li" class={`bsw-sub bsw-sub-${s.state}`}>
                    <Text tag="span" class="bsw-sub-icon">
                      <SetupIcon name={s.state === "pending" ? "circle-dashed" : s.state === "running" ? "loader-circle" : s.state === "failed" ? "circle-x" : "circle-check"} />
                    </Text>
                    <Box class="bsw-sub-body">
                      <Text tag="span" class="bsw-sub-name">{ts(`sub.${s.id}` as SetupKey)}</Text>
                      <Text tag="code" class="bsw-sub-cmd">{SUB_COMMANDS[s.id]}</Text>
                    </Box>
                    <Text tag="span" class="bsw-sub-time bsw-tabular">{s.state === "pending" ? clock(undefined) : clock(elapsed(s.startedAt, s.endedAt, props.now))}</Text>
                  </Box>
                )}
              </For>
            </Box>
          </Box>
        </Box>
      </Box>
      <SetupLog lines={props.p.log} rows="short" />
    </Block>
  )
}
