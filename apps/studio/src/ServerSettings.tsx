import { Show, createSignal, type JSX } from "solid-js"
import { DESKTOP_TUNNEL_USER, type DesktopConnection, type DesktopProblemCode } from "@buildy/agent-contract"
import { tunnelSetupCommand } from "./desktop-connection"
import { useHost } from "./host/context"
import { t, type MessageKey } from "./i18n"
import { Box, Button, Input, Label, Text } from "./primitives"

const PROBLEM_TEXT: Partial<Record<DesktopProblemCode, MessageKey>> = {
  auth: "server.problem.auth",
  bad_input: "server.problem.bad_input",
  host_key_changed: "server.problem.host_key_changed",
  port_busy: "server.problem.port_busy",
  unreachable: "server.problem.unreachable",
}

/**
 * Settings card of the desktop app's server connection (HOST_DESKTOP_ROUTES). Local: address, SSH user, host token,
 * the app's SSH public key with the server lines; Connect moves the window to the server's Studio. Remote: the
 * server, its pinned host key, its version (and a warning when it is older than the app), back to this computer.
 */
export function ServerSettings(props: {
  conn: DesktopConnection
  onChange: (conn: DesktopConnection) => void
}): JSX.Element {
  const host = useHost()
  const [address, setAddress] = createSignal(props.conn.target?.address ?? "")
  const [user, setUser] = createSignal(props.conn.target?.user ?? DESKTOP_TUNNEL_USER)
  const [token, setToken] = createSignal("")
  const [busy, setBusy] = createSignal(false)
  const [copied, setCopied] = createSignal(false)
  const [error, setError] = createSignal("")

  const setup = () => tunnelSetupCommand(props.conn.sshPublicKey, user().trim() || DESKTOP_TUNNEL_USER)
  const problemText = () => {
    const code = props.conn.problem?.code
    const key = code ? PROBLEM_TEXT[code] : undefined
    return key ? t(key) : ""
  }
  const canConnect = () =>
    !busy() && address().trim() !== "" && user().trim() !== "" && (token().trim() !== "" || !!props.conn.target?.tokenSaved)

  const run = async (op: () => Promise<DesktopConnection>) => {
    if (busy()) return
    setBusy(true)
    setError("")
    try {
      props.onChange(await op())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const connect = () =>
    run(async () => {
      const conn = await host.desktopConnect({
        address: address().trim(),
        user: user().trim(),
        ...(token().trim() ? { token: token().trim() } : {}),
      })
      setToken("")
      return conn
    })

  const copy = async () => {
    await navigator.clipboard?.writeText(setup()).catch(() => undefined)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Box tag="section" class="settings-card">
      <Text tag="h2" class="settings-card-title">{t("server.title")}</Text>
      <Show when={problemText()}>
        <Text class="form-error settings-banner">{problemText()}</Text>
        <Text class="settings-card-sub">{props.conn.problem?.message}</Text>
      </Show>
      <Show when={error()}>
        <Text class="form-error settings-banner">{error()}</Text>
      </Show>

      <Show
        when={props.conn.mode === "remote" && props.conn.target}
        fallback={
          <>
            <Text class="settings-card-sub">{t("server.leadLocal")}</Text>
            <Text class="settings-card-sub">{t("server.debianOnly")}</Text>
            <Label class="field">
              {t("server.address")}
              <Input class="input" type="text" autocomplete="off" spellcheck={false}
                value={address()} onInput={(e) => setAddress(e.currentTarget.value)} />
            </Label>
            <Label class="field">
              {t("server.user")}
              <Input class="input" type="text" autocomplete="off" spellcheck={false}
                value={user()} onInput={(e) => setUser(e.currentTarget.value)} />
            </Label>
            <Label class="field">
              {t("server.token")}
              <Input class="input" type="password" autocomplete="off"
                value={token()} onInput={(e) => setToken(e.currentTarget.value)} />
            </Label>
            <Text class="settings-card-sub">
              {props.conn.target?.tokenSaved ? t("server.tokenSaved") : t("server.tokenHint")}
            </Text>
            <Text tag="h3" class="settings-card-title">{t("server.keyTitle")}</Text>
            <Text class="settings-card-sub">{t("server.keyHint")}</Text>
            <Text tag="pre" class="settings-code">{setup()}</Text>
            <Show when={props.conn.target?.hostKeyFingerprint} fallback={<Text class="settings-card-sub">{t("server.hostKeyFirst")}</Text>}>
              <Text class="settings-masked">
                {t("server.hostKey")} <Text tag="code">{props.conn.target?.hostKeyFingerprint}</Text>
              </Text>
            </Show>
            <Box class="settings-actions">
              <Button class="btn primary" type="button" disabled={!canConnect()} onClick={() => void connect()}>
                {busy() ? t("server.connecting") : t("server.connect")}
              </Button>
              <Button class="btn ghost" type="button" onClick={() => void copy()}>
                {copied() ? t("server.copied") : t("server.copy")}
              </Button>
              <Show when={props.conn.target}>
                <Button class="btn ghost" type="button" disabled={busy()} onClick={() => void run(() => host.desktopDisconnect(true))}>
                  {t("server.forget")}
                </Button>
              </Show>
            </Box>
          </>
        }
      >
        {(target) => (
          <>
            <Text class="settings-card-sub">{t("server.leadRemote")}</Text>
            <Text class="settings-masked">{t("server.connectedTo", { address: target().address, user: target().user })}</Text>
            <Text class="settings-masked">
              {t("server.hostKey")} <Text tag="code">{target().hostKeyFingerprint}</Text>
            </Text>
            <Show when={props.conn.server}>
              {(server) => (
                <Text class="settings-masked">{t("server.version", { server: server().version, app: props.conn.appVersion })}</Text>
              )}
            </Show>
            <Show when={props.conn.serverOutdated}>
              <Text class="form-error">{t("server.outdated")}</Text>
            </Show>
            <Box class="settings-actions">
              <Button class="btn ghost" type="button" disabled={busy()} onClick={() => void run(() => host.desktopDisconnect(false))}>
                {t("server.disconnect")}
              </Button>
            </Box>
          </>
        )}
      </Show>
    </Box>
  )
}
