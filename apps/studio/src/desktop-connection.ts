import { DESKTOP_TUNNEL_USER, type DesktopConnection } from "@buildy/agent-contract"
import { ApiError } from "./chat/banner"

/** Ports the app forwards; the tunnel user may open only these (permitopen). */
export const TUNNEL_PORTS = [18120, 18121] as const

/** The protocol check failed: the window shows the update screen instead of the server's Studio. */
export function needsUpdate(conn: DesktopConnection | null | undefined): boolean {
  return !!conn?.problem && conn.problem.code.startsWith("protocol_")
}

/**
 * The authorized_keys line for the tunnel user: only port forwarding to the two loopback ports, no shell, no pty,
 * no agent or X11 forwarding (`restrict`).
 */
export function authorizedKeysLine(publicKey: string): string {
  const opens = TUNNEL_PORTS.map((p) => `permitopen="127.0.0.1:${p}"`).join(",")
  return `restrict,port-forwarding,${opens} ${publicKey.trim()}`
}

/**
 * Shell lines for the server (as root): the tunnel user (no login shell) and its key, once (running them again
 * adds nothing). scripts/ci-remote-e2e.sh in buildytech/vibechat-desktop runs the same lines in CI.
 */
export function tunnelSetupCommand(publicKey: string, user: string = DESKTOP_TUNNEL_USER): string {
  const home = `/home/${user}`
  const keys = `${home}/.ssh/authorized_keys`
  const line = authorizedKeysLine(publicKey)
  return [
    `id ${user} >/dev/null 2>&1 || adduser --disabled-password --gecos "" --shell /usr/sbin/nologin ${user}`,
    `install -d -m 700 -o ${user} -g ${user} ${home}/.ssh`,
    `grep -qxF '${line}' ${keys} 2>/dev/null || echo '${line}' >> ${keys}`,
    `chown ${user}:${user} ${keys} && chmod 600 ${keys}`,
  ].join("\n")
}

/**
 * The desktop connection, or null when this host is not the desktop app (a server opened in a browser tab answers
 * 404) — the Studio then hides the server settings.
 */
export async function loadDesktopConnection(
  get: () => Promise<DesktopConnection>,
): Promise<DesktopConnection | null> {
  try {
    return await get()
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  }
}
