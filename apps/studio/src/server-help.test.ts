import { describe, expect, test } from "bun:test"
import { BACKUP_SETUP, CONSOLE_ADD_KEY, SERVER_DATA_DIR, sshKeySetupCommands, sshLoginCommand, sshTarget } from "./server-help"

describe("server help commands", () => {
  test("ssh target from the saved address", () => {
    expect(sshTarget()).toEqual({ host: "SERVER", portFlag: "" })
    expect(sshTarget("example.com")).toEqual({ host: "example.com", portFlag: "" })
    expect(sshTarget("10.0.0.2:22")).toEqual({ host: "10.0.0.2", portFlag: "" })
    expect(sshTarget("10.0.0.2:2222")).toEqual({ host: "10.0.0.2", portFlag: "-p 2222 " })
    expect(sshTarget("[2001:db8::1]:2200")).toEqual({ host: "2001:db8::1", portFlag: "-p 2200 " })
    expect(sshTarget("2001:db8::1")).toEqual({ host: "2001:db8::1", portFlag: "" })
    expect(sshLoginCommand("h:2222")).toBe("ssh -p 2222 root@h")
  })

  test("key setup for both shells", () => {
    const c = sshKeySetupCommands("h")
    expect(c.unix).toBe("ssh-keygen -t ed25519\nssh-copy-id root@h")
    expect(c.windows).toContain("type $env:USERPROFILE\\.ssh\\id_ed25519.pub | ssh root@h")
    expect(c.windows).toContain("chmod 600 ~/.ssh/authorized_keys")
    expect(CONSOLE_ADD_KEY).toContain("/root/.ssh/authorized_keys")
  })

  test("backups: a private env file, the data folder, a daily timer, restore with the server stopped", () => {
    expect(BACKUP_SETUP.install).toContain("install -m 600 /dev/null /root/.vibechat-backup.env")
    // systemd EnvironmentFile and `set -a; .` both read plain KEY=value lines (no `export`).
    expect(BACKUP_SETUP.env.split("\n").every((l) => /^[A-Z_]+=\S+$/.test(l))).toBe(true)
    expect(BACKUP_SETUP.service).toContain(`restic backup ${SERVER_DATA_DIR}`)
    expect(BACKUP_SETUP.service).toContain("EnvironmentFile=/root/.vibechat-backup.env")
    expect(BACKUP_SETUP.timer).toContain("OnCalendar=daily")
    expect(BACKUP_SETUP.restore.split("\n")[0]).toBe("systemctl stop vibechat-server")
    expect(BACKUP_SETUP.restore).toContain("restic restore latest --target /")
  })
})
