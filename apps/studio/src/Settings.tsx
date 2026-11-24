import { For, Show, createSignal, type JSX } from "solid-js"
import { A } from "@solidjs/router"
import { api, type User, type UserCredential } from "./api"
import {
  writeExportIncludeTrace,
  ensureExportIncludeTraceDefault,
} from "./chat-export-prefs"

type KeySlot = {
  id: string
  runtime: string
  providerId: string
  title: string
  blurb: string
}

const SLOTS: KeySlot[] = [
  {
    id: "cursor",
    runtime: "cursor-sdk",
    providerId: "cursor",
    title: "Cursor",
    blurb: "Studio agent (cursor-sdk). Your key → platform → env.",
  },
]

export function Settings(props: {
  user: User
}): JSX.Element {
  const [creds, setCreds] = createSignal<UserCredential[]>([])
  const [drafts, setDrafts] = createSignal<Record<string, string>>({})
  const [loaded, setLoaded] = createSignal(false)
  const [busyId, setBusyId] = createSignal<string | null>(null)
  const [error, setError] = createSignal("")
  const [notice, setNotice] = createSignal("")
  const [exportIncludeTrace, setExportIncludeTrace] = createSignal(
    ensureExportIncludeTraceDefault(),
  )

  const onExportIncludeTrace = (on: boolean) => {
    writeExportIncludeTrace(on)
    setExportIncludeTrace(on)
  }

  const findCred = (slot: KeySlot) =>
    creds().find(
      (c) => c.runtime === slot.runtime && c.providerId === slot.providerId,
    ) ?? null

  const load = async () => {
    const res = await api.listMyCredentials()
    setCreds(res.credentials)
    setLoaded(true)
  }

  void load().catch((e) => {
    setError(e instanceof Error ? e.message : String(e))
    setLoaded(true)
  })

  const save = async (slot: KeySlot) => {
    const value = (drafts()[slot.id] ?? "").trim()
    if (!value || busyId()) return
    setBusyId(slot.id)
    setError("")
    setNotice("")
    try {
      const res = await api.putMyCredential(slot.runtime, slot.providerId, value)
      setCreds((prev) => {
        const rest = prev.filter(
          (c) =>
            !(c.runtime === slot.runtime && c.providerId === slot.providerId),
        )
        return [...rest, res.credential]
      })
      setDrafts((d) => ({ ...d, [slot.id]: "" }))
      setNotice(`${slot.title} key saved.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (slot: KeySlot) => {
    if (!findCred(slot) || busyId()) return
    setBusyId(slot.id)
    setError("")
    setNotice("")
    try {
      await api.deleteMyCredential(slot.runtime, slot.providerId)
      setCreds((prev) =>
        prev.filter(
          (c) =>
            !(c.runtime === slot.runtime && c.providerId === slot.providerId),
        ),
      )
      setNotice(`${slot.title} key removed.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div class="projects-page settings-page">
      <header class="projects-top">
        <div class="brand-lockup">
          <A href="/" class="brand">
            Buildy
          </A>
          <span class="brand-tag">Settings</span>
        </div>
        <div class="projects-top-right">
          <A class="btn ghost" href="/">
            Apps
          </A>
        </div>
      </header>

      <div class="projects-hero">
        <h1 class="projects-title">API keys</h1>
        <p class="projects-sub">
          Bring your own keys for Cursor and Pi agents. Keys are encrypted at
          rest and never shown again after save.
        </p>
      </div>

      <Show when={error()}>
        <p class="form-error settings-banner">{error()}</p>
      </Show>
      <Show when={notice()}>
        <p class="settings-notice">{notice()}</p>
      </Show>

      <Show when={loaded()} fallback={<p class="muted">Loading…</p>}>
        <div class="settings-cards">
          <section class="settings-card">
            <h2 class="settings-card-title">Chat export</h2>
            <p class="settings-card-sub">
              Export transcript can include the live thinking and tool rows from
              the open Studio tab (available only while that tab is still open).
              On by default during development; turn off for user/assistant-only
              bundles.
            </p>
            <label class="settings-check">
              <input
                type="checkbox"
                checked={exportIncludeTrace()}
                onChange={(e) => onExportIncludeTrace(e.currentTarget.checked)}
              />
              <span>Include thinking &amp; tool trace in export</span>
            </label>
          </section>
          <For each={SLOTS}>
            {(slot) => {
              const saved = () => findCred(slot)
              const busy = () => busyId() === slot.id
              return (
                <section class="settings-card">
                  <h2 class="settings-card-title">{slot.title}</h2>
                  <p class="settings-card-sub">{slot.blurb}</p>
                  <Show when={saved()}>
                    {(c) => (
                      <p class="settings-masked">
                        Saved key: <code>{c().masked}</code>
                      </p>
                    )}
                  </Show>
                  <label class="field">
                    {saved() ? "Replace key" : "API key"}
                    <input
                      class="input"
                      type="password"
                      autocomplete="off"
                      placeholder="Paste key…"
                      value={drafts()[slot.id] ?? ""}
                      onInput={(e) =>
                        setDrafts((d) => ({
                          ...d,
                          [slot.id]: e.currentTarget.value,
                        }))
                      }
                    />
                  </label>
                  <div class="settings-actions">
                    <button
                      class="btn primary"
                      type="button"
                      disabled={busy() || !(drafts()[slot.id] ?? "").trim()}
                      onClick={() => void save(slot)}
                    >
                      {busy() ? "Saving…" : "Save"}
                    </button>
                    <Show when={saved()}>
                      <button
                        class="btn ghost"
                        type="button"
                        disabled={busy()}
                        onClick={() => void remove(slot)}
                      >
                        Remove
                      </button>
                    </Show>
                  </div>
                </section>
              )
            }}
          </For>
        </div>
      </Show>
    </div>
  )
}
