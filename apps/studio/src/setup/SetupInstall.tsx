import { For, Show, type JSX } from "solid-js"
import type { DesktopProvision, DesktopProvisionStepId } from "@buildy/agent-contract"
import { SetupIcon } from "../app-icons/setup-icons"
import { Block, Progress, Title } from "../compose"
import { ts, type SetupKey } from "../i18n/setup"
import { Box, Button, Text } from "../primitives"
import { STEP_ICONS, stateIcon } from "./icons"
import { INCUS_STEPS, PHASES, clock, currentStep, doneCount, elapsed, phaseState, stepOf } from "./model"
import { SetupLog } from "./SetupLog"

/**
 * The ten steps in four phases with their real states and times, the overall progress, the running step and the
 * live log. A failed run shows its problem above and a way back to the form.
 */
export function SetupInstall(props: {
  p: DesktopProvision
  now: number
  problem?: JSX.Element
  onIncus: () => void
  onEdit: () => void
}): JSX.Element {
  const total = () => props.p.steps.length
  const cur = () => currentStep(props.p)
  const runElapsed = () => elapsed(props.p.startedAt, props.p.state === "running" ? undefined : props.p.now, props.now)
  const stepTime = (id: DesktopProvisionStepId) => {
    const s = stepOf(props.p, id)
    return s && s.state !== "pending" ? clock(elapsed(s.startedAt, s.endedAt, props.now)) : clock(undefined)
  }
  return (
    <Block tag="section" class="bsw-screen bsw-install" aria-labelledby="bsw-install-title">
      <Box class="bsw-row bsw-between bsw-wrap">
        <Box class="bsw-stack-1">
          <Text class="bsw-eyebrow"><SetupIcon name="loader-circle" class="bsw-spin" /> {ts("install.eyebrow")}</Text>
          <Title as={1} id="bsw-install-title" class="bsw-title">{ts("install.title", { address: props.p.address ?? "" })}</Title>
        </Box>
        <Box class="bsw-row">
          <Text class="bsw-badge bsw-badge-primary"><SetupIcon name="timer" /> <Text tag="span" class="bsw-tabular">{clock(runElapsed())}</Text></Text>
          <Show when={props.p.state === "failed"}>
            <Button class="bsw-btn bsw-btn-primary" type="button" onClick={() => props.onEdit()}>
              <SetupIcon name="rotate-ccw" /> {ts("install.edit")}
            </Button>
          </Show>
        </Box>
      </Box>
      {props.problem}
      <Box class="bsw-progress-row">
        <Progress class={props.p.state === "running" ? "bsw-progress bsw-progress-running" : "bsw-progress"} value={doneCount(props.p)} max={total()}
          aria-label={ts("install.progressLabel")} />
        <Text class="bsw-muted bsw-tabular">{ts("install.progress", { done: doneCount(props.p), total: total() })}</Text>
      </Box>
      <Box class="bsw-grid-side">
        <Box class="bsw-card bsw-phases">
          <For each={PHASES}>
            {(ph) => (
              <Box class="bsw-phase">
                <Box class="bsw-row bsw-between">
                  <Title as={2} class="bsw-phase-title">{ts(`phase.${ph.id}` as SetupKey)}</Title>
                  <Text tag="span" class={`bsw-badge bsw-state-${phaseState(props.p, ph)}`}>{ts(`phase.state.${phaseState(props.p, ph)}` as SetupKey)}</Text>
                </Box>
                <Box tag="ol" class="bsw-steps">
                  <For each={ph.steps}>
                    {(id) => {
                      const s = () => stepOf(props.p, id)
                      const state = () => s()?.state ?? "pending"
                      return (
                        <Box tag="li" class={`bsw-step bsw-step-${state()}`}>
                          <Text tag="span" class="bsw-step-icon"><SetupIcon name={stateIcon(state(), STEP_ICONS[id])} /></Text>
                          <Box class="bsw-step-body">
                            <Text class="bsw-step-name">{ts(`step.${id}` as SetupKey)}</Text>
                            <Text class="bsw-step-state">{ts(`state.${state()}` as SetupKey)}</Text>
                            <Show when={s()?.detail}>
                              <Text class="bsw-step-detail">{s()?.detail}</Text>
                            </Show>
                            <Show when={state() === "running"}>
                              <Box class="bsw-bar" aria-hidden="true"><Box class="bsw-bar-fill" /></Box>
                            </Show>
                          </Box>
                          <Text tag="span" class="bsw-step-time bsw-tabular">{stepTime(id)}</Text>
                        </Box>
                      )
                    }}
                  </For>
                </Box>
              </Box>
            )}
          </For>
        </Box>
        <Box class="bsw-stack-2">
          <Box class="bsw-card bsw-stack-2">
            <Box class="bsw-row bsw-between">
              <Title as={2} id="bsw-now-title" class="bsw-card-title">{ts("install.now")}</Title>
              <Text tag="span" class="bsw-badge bsw-badge-primary bsw-tabular">{ts("incus.count", { done: doneCount(props.p), total: total() })}</Text>
            </Box>
            <Box tag="dl" class="bsw-kv">
              <Box tag="dt">{ts("install.step")}</Box>
              <Box tag="dd">{cur() ? ts(`step.${cur()!.id}` as SetupKey) : clock(undefined)}</Box>
              <Box tag="dt">{ts("install.elapsed")}</Box>
              <Box tag="dd" class="bsw-tabular">{clock(runElapsed())}</Box>
              <Box tag="dt">{ts("install.limit")}</Box>
              <Box tag="dd">{ts("install.limitValue")}</Box>
            </Box>
            <Show when={props.p.state === "running" && cur() && (INCUS_STEPS as readonly string[]).includes(cur()!.id)}>
              <Button class="bsw-btn bsw-btn-outline" type="button" onClick={() => props.onIncus()}>
                <SetupIcon name="container" /> {ts("install.incusDetails")}
              </Button>
            </Show>
            <Text class="bsw-tip"><SetupIcon name="info" /> {ts("install.rerunNote")}</Text>
          </Box>
          <SetupLog lines={props.p.log} />
        </Box>
      </Box>
    </Block>
  )
}
