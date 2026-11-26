import type { DesktopConnection } from "@buildy/agent-contract"
import { needsUpdate } from "../desktop-connection"

/** What the start screen shows for a connection state. */
export type ShellView = "loading" | "update" | "connecting" | "connected" | "choose"

export function shellView(conn: DesktopConnection | null | undefined): ShellView {
  if (!conn) return "loading"
  if (needsUpdate(conn)) return "update"
  if (conn.connecting) return "connecting"
  // Remote: the app has already moved the window to the server's Studio; this page shows only for a moment.
  if (conn.mode === "remote") return "connected"
  return "choose"
}

/** The start screen opens on the setup wizard when no server was saved yet, else on Connect. */
export function firstTab(conn: DesktopConnection | null | undefined): "connect" | "setup" {
  return conn?.target ? "connect" : "setup"
}
