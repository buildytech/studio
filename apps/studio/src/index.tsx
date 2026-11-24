/* @refresh reload */
import { render } from "solid-js/web"
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
  return (
    <HostProvider client={api}>
      <Router>
        <Route path="/" component={() => <Projects user={user} />} />
        <Route path="/p/:id" component={() => <Studio user={user} />} />
        <Route path="/settings" component={() => <Settings user={user} />} />
      </Router>
    </HostProvider>
  )
}

render(() => <App />, document.getElementById("root")!)
