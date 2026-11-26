/**
 * Command lines of the server help in Settings (signing in with an SSH key, backups to S3). Technical text only: the
 * prose around them is in the ui dictionary (help.*).
 */

/** Where an OpenSSH client keeps the default key pair (private key; the public one is the same path + .pub). */
export const SSH_KEY_PATHS = {
  windows: "%USERPROFILE%\\.ssh\\id_ed25519",
  unix: "~/.ssh/id_ed25519",
} as const

/** `host` and `-p port ` (port other than 22) of a saved "host" / "host:port" / "[v6]:port"; a placeholder when none. */
export function sshTarget(address?: string): { host: string; portFlag: string } {
  const a = (address ?? "").trim()
  if (!a) return { host: "SERVER", portFlag: "" }
  const v6 = /^\[([^\]]+)\](?::(\d+))?$/.exec(a)
  if (v6) return { host: v6[1]!, portFlag: v6[2] && v6[2] !== "22" ? `-p ${v6[2]} ` : "" }
  const m = /^([^:]+):(\d+)$/.exec(a)
  if (m) return { host: m[1]!, portFlag: m[2] !== "22" ? `-p ${m[2]} ` : "" }
  return { host: a, portFlag: "" }
}

/** Sign in as root with the key from the default path (ssh tries it by itself). */
export function sshLoginCommand(address?: string): string {
  const { host, portFlag } = sshTarget(address)
  return `ssh ${portFlag}root@${host}`
}

/** Make a key pair (no key yet) and install the public key while password login still works. */
export function sshKeySetupCommands(address?: string): { unix: string; windows: string } {
  const { host, portFlag } = sshTarget(address)
  return {
    unix: ["ssh-keygen -t ed25519", `ssh-copy-id ${portFlag}root@${host}`].join("\n"),
    windows: [
      "ssh-keygen -t ed25519",
      `type $env:USERPROFILE\\.ssh\\id_ed25519.pub | ssh ${portFlag}root@${host} "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"`,
    ].join("\n"),
  }
}

/** Lines for the provider's web console (logged in as root there): add a public key again. */
export const CONSOLE_ADD_KEY = [
  "install -d -m 700 /root/.ssh",
  "echo 'PASTE-YOUR-PUBLIC-KEY-LINE' >> /root/.ssh/authorized_keys",
  "chmod 600 /root/.ssh/authorized_keys",
].join("\n")

/** The data folder of vibechat-server (projects, chats, token hash, Cursor key file). */
export const SERVER_DATA_DIR = "/var/lib/vibechat"

const ENV_FILE = "/root/.vibechat-backup.env"

/** Backups with restic to an S3 bucket: install, the credentials file, the repository, a daily systemd timer. */
export const BACKUP_SETUP = {
  install: ["apt install restic", `install -m 600 /dev/null ${ENV_FILE}`].join("\n"),
  env: [
    "RESTIC_REPOSITORY=s3:https://S3-ENDPOINT/BUCKET/vibechat",
    "RESTIC_PASSWORD=LONG-RANDOM-PASSWORD",
    "AWS_ACCESS_KEY_ID=BUCKET-KEY-ID",
    "AWS_SECRET_ACCESS_KEY=BUCKET-SECRET",
  ].join("\n"),
  init: `set -a; . ${ENV_FILE}; set +a; restic init`,
  service: [
    "# /etc/systemd/system/vibechat-backup.service",
    "[Unit]",
    "Description=vibechat-server data to S3 (restic)",
    "",
    "[Service]",
    "Type=oneshot",
    `EnvironmentFile=${ENV_FILE}`,
    `ExecStart=/usr/bin/restic backup ${SERVER_DATA_DIR}`,
    "ExecStart=/usr/bin/restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune",
  ].join("\n"),
  timer: [
    "# /etc/systemd/system/vibechat-backup.timer",
    "[Timer]",
    "OnCalendar=daily",
    "RandomizedDelaySec=1h",
    "Persistent=true",
    "",
    "[Install]",
    "WantedBy=timers.target",
  ].join("\n"),
  enable: ["systemctl daemon-reload", "systemctl enable --now vibechat-backup.timer", "systemctl start vibechat-backup.service"].join("\n"),
  check: `set -a; . ${ENV_FILE}; set +a; restic snapshots`,
  restore: [
    "systemctl stop vibechat-server",
    `set -a; . ${ENV_FILE}; set +a; restic restore latest --target /`,
    "systemctl start vibechat-server",
  ].join("\n"),
} as const
