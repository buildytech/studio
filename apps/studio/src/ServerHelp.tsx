import type { JSX } from "solid-js"
import type { DesktopConnection } from "@buildy/agent-contract"
import { th, type HelpKey } from "./i18n/help"
import { Box, Disclosure, Summary, Text } from "./primitives"
import { BACKUP_SETUP, CONSOLE_ADD_KEY, SERVER_DATA_DIR, SSH_KEY_PATHS, sshKeySetupCommands, sshLoginCommand } from "./server-help"

function Step(props: { text: HelpKey; params?: Record<string, string>; code?: string }): JSX.Element {
  return (
    <>
      <Text class="settings-card-sub">{th(props.text, props.params)}</Text>
      {props.code ? <Text tag="pre" class="settings-code">{props.code}</Text> : null}
    </>
  )
}

/**
 * Settings help of the desktop app's server mode: signing in to the server as root with an SSH key once password
 * login is off (key paths per OS, the provider's web console as the way back), and backups of the server's data
 * folder to an S3 bucket with restic. Prose from the help dictionary (i18n/help.en.json), command lines from server-help.ts.
 */
export default function ServerHelp(props: { conn: DesktopConnection }): JSX.Element {
  const address = () => props.conn.target?.address
  const keys = () => sshKeySetupCommands(address())
  return (
    <Box tag="section" class="settings-card">
      <Text tag="h2" class="settings-card-title">{th("title")}</Text>
      <Text class="settings-card-sub">{th("lead")}</Text>

      <Disclosure class="settings-help">
        <Summary class="settings-help-summary">{th("ssh.title")}</Summary>
        <Step text="ssh.why" />
        <Step text="ssh.paths" params={{ windows: SSH_KEY_PATHS.windows, unix: SSH_KEY_PATHS.unix }} />
        <Step text="ssh.login" code={sshLoginCommand(address())} />
        <Step text="ssh.other" />
        <Step text="ssh.newUnix" code={keys().unix} />
        <Step text="ssh.newWindows" code={keys().windows} />
        <Step text="ssh.appKey" />
        <Step text="ssh.console" code={CONSOLE_ADD_KEY} />
      </Disclosure>

      <Disclosure class="settings-help">
        <Summary class="settings-help-summary">{th("backup.title")}</Summary>
        <Step text="backup.what" params={{ dir: SERVER_DATA_DIR }} />
        <Step text="backup.where" />
        <Step text="backup.bucket" />
        <Step text="backup.install" code={BACKUP_SETUP.install} />
        <Step text="backup.env" code={BACKUP_SETUP.env} />
        <Step text="backup.password" />
        <Step text="backup.init" code={BACKUP_SETUP.init} />
        <Step text="backup.service" code={BACKUP_SETUP.service} />
        <Step text="backup.timer" code={BACKUP_SETUP.timer} />
        <Step text="backup.enable" code={BACKUP_SETUP.enable} />
        <Step text="backup.check" code={BACKUP_SETUP.check} />
        <Step text="backup.restore" code={BACKUP_SETUP.restore} />
      </Disclosure>
    </Box>
  )
}
