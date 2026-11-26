/* @refresh reload */
import { Match, Show, Switch, createSignal, lazy, onCleanup, type JSX } from "solid-js"
import { render } from "solid-js/web"
import type { DesktopConnection } from "@buildy/agent-contract"
import { api } from "../api"
import { HostProvider } from "../host/context"
import { t } from "../i18n"
import { Box, Button, Text } from "../primitives"
import { ServerSettings } from "../ServerSettings"
import { UpdateScreen } from "../UpdateScreen"
import { firstTab, shellView } from "./view"
import "../styles/app.css"
import "../styles.css"

const ServerSetup = lazy(() => import("../ServerSetup"))
const ServerHelp = lazy(() => import("../ServerHelp"))

const POLL_MS = 1000

/**
 * The desktop app's start screen: the app is a window to the owner's vibechat-server (Debian 13), with no local
 * agent. Not connected: choose Connect a server (the saved one or a new address) or Set up a new server (the wizard).
 * Connected: the app moves the window to the server's Studio itself.
 */
function Shell(): JSX.Element {
  const [conn, setConn] = createSignal<DesktopConnection | null>(null)
  const [tab, setTab] = createSignal<"connect" | "setup" | null>(null)
  const [error, setError] = createSignal("")
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
          <Box tag="main" class="projects-page settings-page">
            <Box class="projects-hero">
              <Text tag="h1" class="projects-title">{t("shell.title")}</Text>
              <Text class="projects-sub">{t("shell.lead")}</Text>
            </Box>
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
                <Text class="settings-card-sub">{t("shell.connected")}</Text>
              </Match>
              <Match when={conn()}>
                {(c) => (
                  <>
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
                    <Show when={current() === "setup"} fallback={<ServerSettings conn={c()} onChange={onChange} />}>
                      <ServerSetup onDone={() => void load()} />
                    </Show>
                    <ServerHelp conn={c()} />
                  </>
                )}
              </Match>
            </Switch>
          </Box>
        </Match>
      </Switch>
    </HostProvider>
  )
}

render(() => <Shell />, document.getElementById("root")!)
