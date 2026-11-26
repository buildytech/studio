import { For, Show, createSignal, onCleanup, onMount, type JSX } from "solid-js"
import type { DesktopProvision, DesktopProvisionStepId, DesktopProvisionStepState } from "@buildy/agent-contract"
import { useHost } from "./host/context"
import { ts, type SetupKey } from "./i18n/setup"
import { Box, Button, Input, Label, Text, Textarea } from "./primitives"

const POLL_MS = 1500

/**
 * Settings card of the setup wizard (GET/POST /desktop/provision, local mode): the VPS address, the root password
 * (sent to the app for this run only), an optional public key for root, then the ten steps' progress. When the run
 * is done the app connects and moves the window to the server's Studio.
 */
export default function ServerSetup(props: { onDone: () => void }): JSX.Element {
  const host = useHost()
  const [address, setAddress] = createSignal("")
  const [password, setPassword] = createSignal("")
  const [rootKey, setRootKey] = createSignal("")
  const [prov, setProv] = createSignal<DesktopProvision | null>(null)
  const [error, setError] = createSignal("")
  let timer: ReturnType<typeof setTimeout> | undefined

  const running = () => prov()?.state === "running"
  const poll = async () => {
    try {
      const p = await host.desktopProvision()
      setProv(p)
      if (p.state === "running") timer = setTimeout(() => void poll(), POLL_MS)
      else if (p.state === "done") props.onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  onMount(() => void poll())
  onCleanup(() => clearTimeout(timer))

  const start = async () => {
    if (running()) return
    setError("")
    try {
      const p = await host.desktopProvisionStart({
        address: address().trim(),
        password: password(),
        ...(rootKey().trim() ? { rootPublicKey: rootKey().trim() } : {}),
      })
      setPassword("")
      setProv(p)
      if (p.state === "running") timer = setTimeout(() => void poll(), POLL_MS)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const stepText = (id: DesktopProvisionStepId) => ts(`step.${id}` as SetupKey)
  const stateText = (s: DesktopProvisionStepState) => ts(`state.${s}` as SetupKey)
  const minutes = () => Math.max(1, Math.round((prov()?.rollbackSeconds ?? 300) / 60))

  return (
    <Box tag="section" class="settings-card">
      <Text tag="h2" class="settings-card-title">{ts("title")}</Text>
      <Text class="settings-card-sub">{ts("lead")}</Text>
      <Text class="settings-card-sub">{ts("lockdownNote", { minutes: minutes() })}</Text>
      <Show when={error()}>
        <Text class="form-error settings-banner">{error()}</Text>
      </Show>
      <Label class="field">
        {ts("address")}
        <Input class="input" type="text" autocomplete="off" spellcheck={false} disabled={running()}
          value={address()} onInput={(e) => setAddress(e.currentTarget.value)} />
      </Label>
      <Label class="field">
        {ts("password")}
        <Input class="input" type="password" autocomplete="off" disabled={running()}
          value={password()} onInput={(e) => setPassword(e.currentTarget.value)} />
      </Label>
      <Label class="field">
        {ts("rootKey")}
        <Textarea class="input settings-key-input" rows={2} spellcheck={false} disabled={running()}
          value={rootKey()} onInput={(e) => setRootKey(e.currentTarget.value)} />
      </Label>
      <Box class="settings-actions">
        <Button class="btn primary" type="button" disabled={running() || !address().trim() || !password()} onClick={() => void start()}>
          {running() ? ts("running") : prov()?.state === "failed" ? ts("retry") : ts("start")}
        </Button>
      </Box>

      <Show when={prov() && prov()!.state !== "idle" ? prov() : null}>
        {(p) => (
          <>
            <Show when={p().problem}>
              {(pr) => (
                <>
                  <Text class="form-error settings-banner">{ts(`problem.${pr().code}` as SetupKey)}</Text>
                  <Text class="settings-card-sub">{pr().message}</Text>
                </>
              )}
            </Show>
            <Show when={p().state === "done"}>
              <Text class="settings-notice">{ts("done")}</Text>
            </Show>
            <Show when={p().hostKeyFingerprint}>
              <Text class="settings-masked">
                {ts("hostKey")} <Text tag="code">{p().hostKeyFingerprint}</Text>
              </Text>
            </Show>
            <Box tag="ol" class="setup-steps">
              <For each={p().steps}>
                {(s) => (
                  <Box tag="li" class={`setup-step setup-step-${s.state}`}>
                    <Text tag="span" class="setup-step-name">{stepText(s.id)}</Text>
                    <Text tag="span" class="setup-step-state">{stateText(s.state)}</Text>
                    <Show when={s.detail}>
                      <Text class="setup-step-detail">{s.detail}</Text>
                    </Show>
                  </Box>
                )}
              </For>
            </Box>
          </>
        )}
      </Show>
    </Box>
  )
}
