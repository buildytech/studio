import { Match, Show, Switch, createEffect, createSignal, onCleanup, onMount, type JSX } from "solid-js"
import type { DesktopProvision } from "@buildy/agent-contract"
import { useHost } from "./host/context"
import { ts, type SetupKey } from "./i18n/setup"
import { Text } from "./primitives"
import { SetupIcon } from "./app-icons/setup-icons"
import { appNow, setupView, type SetupView } from "./setup/model"
import { SetupIncus } from "./setup/SetupIncus"
import { SetupInstall } from "./setup/SetupInstall"
import { SetupReady } from "./setup/SetupReady"
import { SetupStart } from "./setup/SetupStart"
import "./setup/setup.css"

const POLL_MS = 1000

/**
 * The setup wizard (GET/POST /desktop/provision, local mode) on four screens: the form (start), the ten steps
 * (install), the Incus install and container build with its real substeps (incus), and the ready screen while the
 * app connects (ready). The root password goes to the app for this run only. Timers run on the app's clock
 * (`now` of the answer), the log is the app's (secrets redacted there).
 */
export default function ServerSetup(props: { onDone: () => void; onView?: (v: SetupView) => void }): JSX.Element {
  const host = useHost()
  const [address, setAddress] = createSignal("")
  const [password, setPassword] = createSignal("")
  const [rootKey, setRootKey] = createSignal("")
  const [prov, setProv] = createSignal<DesktopProvision | null>(null)
  const [fetchedAt, setFetchedAt] = createSignal(0)
  const [pageNow, setPageNow] = createSignal(Date.now())
  const [error, setError] = createSignal("")
  const [editing, setEditing] = createSignal(false)
  const [showAll, setShowAll] = createSignal(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  const tick = setInterval(() => setPageNow(Date.now()), 1000)

  const running = () => prov()?.state === "running"
  const take = (p: DesktopProvision) => {
    setProv(p)
    setFetchedAt(Date.now())
    setPageNow(Date.now())
  }
  const poll = async () => {
    try {
      const p = await host.desktopProvision()
      take(p)
      if (p.state === "running") timer = setTimeout(() => void poll(), POLL_MS)
      else if (p.state === "done") props.onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  onMount(() => void poll())
  onCleanup(() => {
    clearTimeout(timer)
    clearInterval(tick)
  })

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
      setEditing(false)
      setShowAll(false)
      take(p)
      if (p.state === "running") timer = setTimeout(() => void poll(), POLL_MS)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const view = () => setupView(prov(), { editing: editing(), showAll: showAll() })
  createEffect(() => props.onView?.(view()))
  const now = () => {
    const p = prov()
    return p ? appNow(p, fetchedAt(), pageNow()) : pageNow()
  }
  const minutes = () => Math.max(1, Math.round((prov()?.rollbackSeconds ?? 300) / 60))
  const problem = () => (
    <>
      <Show when={error()}>
        <Text class="bsw-banner bsw-banner-bad" role="alert"><SetupIcon name="triangle-alert" /> {error()}</Text>
      </Show>
      <Show when={prov()?.state === "failed" ? prov()?.problem : undefined}>
        {(pr) => (
          <Text class="bsw-banner bsw-banner-bad" role="alert">
            <SetupIcon name="triangle-alert" /> {ts(`problem.${pr().code}` as SetupKey)} {pr().message}
          </Text>
        )}
      </Show>
    </>
  )

  return (
    <Switch>
      <Match when={view() === "start"}>
        <SetupStart
          form={{
            get address() { return address() },
            get password() { return password() },
            get rootKey() { return rootKey() },
            setAddress, setPassword, setRootKey,
          }}
          busy={running()}
          retry={prov()?.state === "failed"}
          minutes={minutes()}
          problem={problem()}
          onStart={() => void start()}
        />
      </Match>
      <Match when={view() === "incus" && prov()}>
        {(p) => <SetupIncus p={p()} now={now()} onAll={() => setShowAll(true)} />}
      </Match>
      <Match when={view() === "ready" && prov()}>
        {(p) => <SetupReady p={p()} />}
      </Match>
      <Match when={prov()}>
        {(p) => (
          <SetupInstall p={p()} now={now()} problem={problem()} onIncus={() => setShowAll(false)}
            onEdit={() => { setEditing(true); setAddress(address() || p().address || "") }} />
        )}
      </Match>
    </Switch>
  )
}
