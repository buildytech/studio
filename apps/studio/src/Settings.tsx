import { For, Show, createSignal, type JSX } from "solid-js"
import { A } from "@solidjs/router"
import { api, type User, type UserCredential } from "./api"
import {
  writeExportIncludeTrace,
  ensureExportIncludeTraceDefault,
} from "./chat-export-prefs"
import { t, type MessageKey } from "./i18n"
import { Box, Button, Checkbox, Input, Label, Text } from "./primitives"

type KeySlot = {
  id: string
  runtime: string
  providerId: string
  title: MessageKey
  blurb: MessageKey
}

const SLOTS: KeySlot[] = [
  {
    id: "cursor",
    runtime: "cursor-sdk",
    providerId: "cursor",
    title: "settings.cursorTitle",
    blurb: "settings.cursorBlurb",
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
      setNotice(t("settings.keySaved", { name: t(slot.title) }))
    } catch (e) {
      setError(e instanceof Error ? e.message : t("settings.saveFailed"))
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
      setNotice(t("settings.keyRemoved", { name: t(slot.title) }))
    } catch (e) {
      setError(e instanceof Error ? e.message : t("settings.deleteFailed"))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Box class="projects-page settings-page">
      <Box tag="header" class="projects-top">
        <Box class="brand-lockup">
          <A href="/" class="brand">
            {t("brand.name")}
          </A>
          <Text tag="span" class="brand-tag">{t("nav.settings")}</Text>
        </Box>
        <Box class="projects-top-right">
          <A class="btn ghost" href="/">
            {t("nav.apps")}
          </A>
        </Box>
      </Box>

      <Box class="projects-hero">
        <Text tag="h1" class="projects-title">{t("settings.title")}</Text>
        <Text class="projects-sub">{t("settings.lead")}</Text>
      </Box>

      <Show when={error()}>
        <Text class="form-error settings-banner">{error()}</Text>
      </Show>
      <Show when={notice()}>
        <Text class="settings-notice">{notice()}</Text>
      </Show>

      <Show when={loaded()} fallback={<Text class="muted">{t("common.loading")}</Text>}>
        <Box class="settings-cards">
          <For each={SLOTS}>
            {(slot) => {
              const saved = () => findCred(slot)
              const busy = () => busyId() === slot.id
              return (
                <Box tag="section" class="settings-card">
                  <Text tag="h2" class="settings-card-title">{t(slot.title)}</Text>
                  <Text class="settings-card-sub">{t(slot.blurb)}</Text>
                  <Show when={saved()}>
                    {(c) => (
                      <Text class="settings-masked">
                        {t("settings.savedKey")} <Text tag="code">{c().masked}</Text>
                      </Text>
                    )}
                  </Show>
                  <Label class="field">
                    {saved() ? t("settings.replaceKey") : t("settings.apiKey")}
                    <Input
                      class="input"
                      type="password"
                      autocomplete="off"
                      placeholder={t("settings.keyPlaceholder")}
                      value={drafts()[slot.id] ?? ""}
                      onInput={(e) =>
                        setDrafts((d) => ({
                          ...d,
                          [slot.id]: e.currentTarget.value,
                        }))
                      }
                    />
                  </Label>
                  <Box class="settings-actions">
                    <Button
                      class="btn primary"
                      type="button"
                      disabled={busy() || !(drafts()[slot.id] ?? "").trim()}
                      onClick={() => void save(slot)}
                    >
                      {busy() ? t("common.saving") : t("common.save")}
                    </Button>
                    <Show when={saved()}>
                      <Button
                        class="btn ghost"
                        type="button"
                        disabled={busy()}
                        onClick={() => void remove(slot)}
                      >
                        {t("common.remove")}
                      </Button>
                    </Show>
                  </Box>
                </Box>
              )
            }}
          </For>
          <Box tag="section" class="settings-card">
            <Text tag="h2" class="settings-card-title">{t("settings.exportTitle")}</Text>
            <Text class="settings-card-sub">{t("settings.exportLead")}</Text>
            <Label class="settings-check">
              <Checkbox
                checked={exportIncludeTrace()}
                onChange={(e) => onExportIncludeTrace(e.currentTarget.checked)}
              />
              <Text tag="span">{t("settings.exportToggle")}</Text>
            </Label>
          </Box>
        </Box>
      </Show>
    </Box>
  )
}
