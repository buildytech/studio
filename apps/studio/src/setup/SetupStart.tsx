import { For, type JSX } from "solid-js"
import { SetupIcon, type SetupIconName } from "../app-icons/setup-icons"
import { Block, Title } from "../compose"
import { ts, type SetupKey } from "../i18n/setup"
import { Box, Button, Form, Input, Label, Text, Textarea } from "../primitives"
import { PHASES } from "./model"

export type StartForm = {
  address: string
  password: string
  rootKey: string
  setAddress: (v: string) => void
  setPassword: (v: string) => void
  setRootKey: (v: string) => void
}

const REQS: { icon: SetupIconName; key: SetupKey }[] = [
  { icon: "circle-check", key: "req.os" },
  { icon: "circle-check", key: "req.memory" },
  { icon: "circle-check", key: "req.disk" },
  { icon: "rotate-ccw", key: "req.rerun" },
]

/**
 * Start screen of the wizard: the VPS address, the root password for this run only, an optional public key for
 * root; beside it the connection scene (decorative: packets run from this computer to the VPS, the four phases fill).
 */
export function SetupStart(props: {
  form: StartForm
  busy: boolean
  retry: boolean
  minutes: number
  problem?: JSX.Element
  onStart: () => void
}): JSX.Element {
  const f = props.form
  return (
    <Block tag="section" class="bsw-screen bsw-start" aria-labelledby="bsw-start-title">
      <Box class="bsw-start-copy">
        <Text class="bsw-eyebrow"><SetupIcon name="sparkles" /> {ts("hero.eyebrow")}</Text>
        <Title as={1} id="bsw-start-title" class="bsw-hero-title">{ts("hero.title")}</Title>
        <Text class="bsw-lead">{ts("lead")}</Text>
        {props.problem}
        <Form class="bsw-card bsw-form" onSubmit={(e: SubmitEvent) => { e.preventDefault(); props.onStart() }}>
          <Label class="bsw-field">
            <Text tag="span" class="bsw-field-label">{ts("address")}</Text>
            <Input class="bsw-input" type="text" autocomplete="off" spellcheck={false} disabled={props.busy}
              value={f.address} onInput={(e) => f.setAddress(e.currentTarget.value)} />
          </Label>
          <Label class="bsw-field">
            <Text tag="span" class="bsw-field-label">{ts("password")}</Text>
            <Input class="bsw-input" type="password" autocomplete="off" disabled={props.busy}
              value={f.password} onInput={(e) => f.setPassword(e.currentTarget.value)} />
          </Label>
          <Label class="bsw-field">
            <Text tag="span" class="bsw-field-label">{ts("rootKey")}</Text>
            <Textarea class="bsw-input bsw-textarea" rows={2} spellcheck={false} disabled={props.busy}
              value={f.rootKey} onInput={(e) => f.setRootKey(e.currentTarget.value)} />
          </Label>
          <Text class="bsw-hint">{ts("lockdownNote", { minutes: props.minutes })}</Text>
          <Button class="bsw-btn bsw-btn-primary bsw-btn-lg" type="submit" disabled={props.busy || !f.address.trim() || !f.password}>
            <SetupIcon name="rocket" /> {props.busy ? ts("running") : props.retry ? ts("retry") : ts("start")}
          </Button>
        </Form>
        <Box tag="ul" class="bsw-reqs">
          <For each={REQS}>
            {(r) => <Box tag="li" class="bsw-req"><SetupIcon name={r.icon} /> {ts(r.key)}</Box>}
          </For>
        </Box>
      </Box>
      <Box class="bsw-scene" aria-hidden="true">
        <Box class="bsw-scene-grid" />
        <Box class="bsw-orbit" />
        <Box class="bsw-orbit bsw-orbit-2" />
        <Text class="bsw-badge bsw-scene-ssh"><SetupIcon name="shield-check" /> {ts("scene.ssh")}</Text>
        <Box class="bsw-node bsw-node-app">
          <SetupIcon name="laptop" size={24} />
          <Box>
            <Text class="bsw-node-name">{ts("scene.app")}</Text>
            <Text class="bsw-node-note">{ts("scene.appNote")}</Text>
          </Box>
        </Box>
        <Box class="bsw-wire" />
        <Box class="bsw-packet" />
        <Box class="bsw-packet bsw-packet-2" />
        <Box class="bsw-packet bsw-packet-3" />
        <Box class="bsw-node bsw-node-vps">
          <SetupIcon name="server" size={24} />
          <Box>
            <Text class="bsw-node-name">{ts("scene.server")}</Text>
            <Text class="bsw-node-note"><Text tag="span" class="bsw-dot" /> {ts("scene.serverNote")}</Text>
          </Box>
        </Box>
        <Box class="bsw-phase-bars">
          <For each={PHASES}>{() => <Text tag="span" class="bsw-phase-bar" />}</For>
        </Box>
        <Box tag="ul" class="bsw-phase-names">
          <For each={PHASES}>{(p) => <Box tag="li">{ts(`phase.${p.id}` as SetupKey)}</Box>}</For>
        </Box>
      </Box>
    </Block>
  )
}
