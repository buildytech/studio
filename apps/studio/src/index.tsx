/* @refresh reload */
import { Show, createSignal } from "solid-js"
import { render } from "solid-js/web"
import { loadUiCatalog } from "./i18n"
import type { DesktopConnection } from "@buildy/agent-contract"
import { loadDesktopConnection, needsUpdate } from "./desktop-connection"
import { UpdateScreen } from "./UpdateScreen"
import { Route, Router } from "@solidjs/router"
import { Projects } from "./Projects"
import { Settings } from "./Settings"
import { Studio } from "./Studio"
import { LOCAL_USER, api, clearLegacyBrowserToken } from "./api"
import { HostProvider } from "./host/context"
import "./styles/app.css"
import "./styles.css"

clearLegacyBrowserToken()

/**
 * Single-user desktop Studio (docs/adr/0002): no login, no tenants. The host
 * (vibechat-desktop Go process) serves this bundle same-origin and owns the
 * keys, folders, agent and preview; `LOCAL_USER` only scopes localStorage.
 */
function App() {
  const user = LOCAL_USER
  // The desktop app's server connection: a protocol mismatch shows the update screen instead of the Studio.
  const [conn, setConn] = createSignal<DesktopConnection | null>(null)
  void loadDesktopConnection(api.desktopConnection).then(setConn).catch(() => setConn(null))
  return (
    <HostProvider client={api}>
      <Show
        when={needsUpdate(conn()) && conn()}
        fallback={
          <Router>
            <Route path="/" component={() => <Projects user={user} />} />
            <Route path="/p/:id" component={() => <Studio user={user} />} />
            <Route path="/settings" component={() => <Settings user={user} />} />
          </Router>
        }
      >
        {(c) => <UpdateScreen conn={c()} onChange={setConn} />}
      </Show>
    </HostProvider>
  )
}

void loadUiCatalog().then(() => {
  render(() => <App />, document.getElementById("root")!)
})
