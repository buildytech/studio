/* @refresh reload */
import { Match, Show, Switch, createEffect, createSignal, lazy, onCleanup, type JSX } from "solid-js"
import { render } from "solid-js/web"
import type { DesktopConnection } from "@buildy/agent-contract"
import { api } from "../api"
import { HostProvider } from "../host/context"
import { loadUiCatalog, t } from "../i18n"
import { Box, Button, Text } from "../primitives"
import { ServerSettings } from "../ServerSettings"
import { UpdateScreen } from "../UpdateScreen"
import { firstTab, shellView } from "./view"
import { ThemeToggle } from "./ThemeToggle"
import type { SetupView } from "../setup/model"
import "../styles/app.css"
import "../styles.css"
import "./shell.css"

const ServerSetup = lazy(() => import("../ServerSetup"))
const ServerHelp = lazy(() => import("../ServerHelp"))

const POLL_MS = 1000
/** How long "Connected. Opening the server's Studio…" may show before Try again and Back appear. */
const STUCK_MS = 10_000

/**
 * The desktop app's start screen: the app is a window to the owner's vibechat-server (Debian 13), with no local
 * agent. Not connected: choose Connect a server (the saved one or a new address) or Set up a new server (the wizard).
 * Connected: the app moves the window to the server's Studio itself.
 */
function Shell(): JSX.Element {
  const [conn, setConn] = createSignal<DesktopConnection | null>(null)
  const [tab, setTab] = createSignal<"connect" | "setup" | null>(null)
  const [error, setError] = createSignal("")
  const [setupView, setSetupView] = createSignal<SetupView>("start")
  let timer: ReturnType<typeof setTimeout> | undefined
  const load = async () => {
    clearTimeout(timer)
    try {
      const c = await api.desktopConnection()
      setConn(c)
      setError("")
      if (c.connecting) timer = setTimeout(() => void load(), POLL_MS)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      timer = setTimeout(() => void load(), POLL_MS * 3)
    }
  }
  void load()
  onCleanup(() => clearTimeout(timer))
  const current = () => tab() ?? firstTab(conn())

  // Connected, the app moves the window to the server's Studio itself; if this page is still here after
  // STUCK_MS (the window was sent back here, or the Studio did not load), offer Try again and Back, never a dead end.
  const [stuck, setStuck] = createSignal(false)
  const [busy, setBusy] = createSignal(false)
  let stuckTimer: ReturnType<typeof setTimeout> | undefined
  createEffect(() => {
    clearTimeout(stuckTimer)
    setStuck(false)
    if (shellView(conn()) === "connected") stuckTimer = setTimeout(() => setStuck(true), STUCK_MS)
  })
  onCleanup(() => clearTimeout(stuckTimer))
  const act = async (op: () => Promise<DesktopConnection>) => {
    if (busy()) return
    setBusy(true)
    try {
      onChange(await op())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }
  /** Reconnect to the saved server (the token from the keychain): a fresh ticket moves the window again. */
  const retry = () => {
    const target = conn()?.target
    return act(() => (target ? api.desktopConnect({ address: target.address, user: target.user }) : api.desktopConnection()))
  }
  const back = () => act(() => api.desktopDisconnect(false))
  const onChange = (c: DesktopConnection) => {
    setConn(c)
    if (c.connecting) void load()
  }

  return (
    <HostProvider client={api}>
      <Switch>
        <Match when={shellView(conn()) === "update" && conn()}>
          {(c) => <UpdateScreen conn={c()} onChange={onChange} />}
        </Match>
        <Match when={true}>
          <Box tag="main" class={current() === "setup" ? "projects-page settings-page shell-setup" : "projects-page settings-page"}>
            <Show when={current() !== "setup"}>
              <Box class="projects-hero">
                <Text tag="h1" class="projects-title">{t("shell.title")}</Text>
                <Text class="projects-sub">{t("shell.lead")}</Text>
              </Box>
            </Show>
            <Show when={error()}>
              <Text class="form-error settings-banner">{error()}</Text>
            </Show>
            <Switch>
              <Match when={shellView(conn()) === "loading"}>
                <Text class="settings-card-sub">{t("shell.loading")}</Text>
              </Match>
              <Match when={shellView(conn()) === "connecting"}>
                <Text class="settings-card-sub">
                  {t("shell.connecting", { address: conn()?.target?.address ?? "" })}
                </Text>
              </Match>
              <Match when={shellView(conn()) === "connected"}>
                <Text class="settings-card-sub" role="status">{stuck() ? t("shell.stuck") : t("shell.connected")}</Text>
                <Show when={stuck()}>
                  <Box class="settings-actions">
                    <Button class="btn primary" type="button" disabled={busy()} onClick={() => void retry()}>{t("shell.retry")}</Button>
                    <Button class="btn ghost" type="button" disabled={busy()} onClick={() => void back()}>{t("shell.back")}</Button>
                  </Box>
                </Show>
              </Match>
              <Match when={conn()}>
                {(c) => (
                  <>
                    <Show when={current() !== "setup" || setupView() === "start"}>
                    <Box class="settings-actions shell-choice" role="tablist">
                      <Button class={current() === "connect" ? "btn primary" : "btn ghost"} type="button" role="tab"
                        aria-selected={current() === "connect"} onClick={() => setTab("connect")}>
                        {t("shell.connect")}
                      </Button>
                      <Button class={current() === "setup" ? "btn primary" : "btn ghost"} type="button" role="tab"
                        aria-selected={current() === "setup"} onClick={() => setTab("setup")}>
                        {t("shell.setup")}
                      </Button>
                    </Box>
                    </Show>
                    <Show when={current() === "setup"} fallback={<ServerSettings conn={c()} onChange={onChange} />}>
                      <ServerSetup onDone={() => void load()} onView={setSetupView} />
                    </Show>
                    <Show when={current() !== "setup" || setupView() === "start"}>
                      <ServerHelp conn={c()} />
                    </Show>
                  </>
                )}
              </Match>
            </Switch>
          </Box>
        </Match>
      </Switch>
      <ThemeToggle />
    </HostProvider>
  )
}

void loadUiCatalog().then(() => {
  render(() => <Shell />, document.getElementById("root")!)
})
