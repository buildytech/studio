import { For, Show, createSignal, type JSX } from "solid-js"
import { api, type UserCredential } from "../../api"
import { t } from "../../i18n"
import { tset, type SettingsKey } from "../../i18n/settings"
import { Box, Button, Input, Label, Text } from "../../primitives"

type KeySlot = { id: string; runtime: string; providerId: string; title: SettingsKey; blurb: SettingsKey }

/** Provider key slots; a new provider is one more entry. */
const SLOTS: KeySlot[] = [
  { id: "cursor", runtime: "cursor-sdk", providerId: "cursor", title: "models.cursorTitle", blurb: "models.cursorBlurb" },
]

/** Models and keys (server): the agent's provider keys through the seam's credential routes. */
export default function Models(): JSX.Element {
  const [creds, setCreds] = createSignal<UserCredential[]>([])
  const [drafts, setDrafts] = createSignal<Record<string, string>>({})
  const [loaded, setLoaded] = createSignal(false)
  const [busyId, setBusyId] = createSignal<string | null>(null)
  const [error, setError] = createSignal("")
  const [notice, setNotice] = createSignal("")

  const same = (c: UserCredential, slot: KeySlot) => c.runtime === slot.runtime && c.providerId === slot.providerId
  const findCred = (slot: KeySlot) => creds().find((c) => same(c, slot)) ?? null

  void api
    .listMyCredentials()
    .then((res) => setCreds(res.credentials))
    .catch((e) => setError(e instanceof Error ? e.message : String(e)))
    .finally(() => setLoaded(true))

  const run = async (slot: KeySlot, op: () => Promise<void>, failed: SettingsKey) => {
    if (busyId()) return
    setBusyId(slot.id)
    setError("")
    setNotice("")
    try {
      await op()
    } catch (e) {
      setError(e instanceof Error ? e.message : tset(failed))
    } finally {
      setBusyId(null)
    }
  }

  const save = (slot: KeySlot) => {
    const value = (drafts()[slot.id] ?? "").trim()
    if (!value) return
    void run(slot, async () => {
      const res = await api.putMyCredential(slot.runtime, slot.providerId, value)
      setCreds((prev) => [...prev.filter((c) => !same(c, slot)), res.credential])
      setDrafts((d) => ({ ...d, [slot.id]: "" }))
      setNotice(tset("models.keySaved", { name: tset(slot.title) }))
    }, "models.saveFailed")
  }

  const remove = (slot: KeySlot) =>
    void run(slot, async () => {
      await api.deleteMyCredential(slot.runtime, slot.providerId)
      setCreds((prev) => prev.filter((c) => !same(c, slot)))
      setNotice(tset("models.keyRemoved", { name: tset(slot.title) }))
    }, "models.deleteFailed")

  return (
    <Box class="settings-cards">
      <Show when={error()}>
        <Text class="form-error settings-banner" role="alert">{error()}</Text>
      </Show>
      <Show when={notice()}>
        <Text class="settings-notice" role="status">{notice()}</Text>
      </Show>
      <Show when={loaded()} fallback={<Text class="muted">{t("common.loading")}</Text>}>
        <For each={SLOTS}>
          {(slot) => {
            const saved = () => findCred(slot)
            const busy = () => busyId() === slot.id
            return (
              <Box tag="section" class="settings-card" aria-labelledby={`settings-key-${slot.id}`}>
                <Text tag="h2" id={`settings-key-${slot.id}`} class="settings-card-title">{tset(slot.title)}</Text>
                <Text class="settings-card-sub">{tset(slot.blurb)}</Text>
                <Text class="settings-card-sub">{tset("models.leadRemote")}</Text>
                <Show when={saved()}>
                  {(c) => (
                    <Text class="settings-masked">
                      {tset("models.savedKey")} <Text tag="code">{c().masked}</Text>
                    </Text>
                  )}
                </Show>
                <Label class="field">
                  {saved() ? tset("models.replaceKey") : tset("models.apiKey")}
                  <Input
                    class="input"
                    type="password"
                    autocomplete="off"
                    placeholder={tset("models.keyPlaceholder")}
                    value={drafts()[slot.id] ?? ""}
                    onInput={(e) => setDrafts((d) => ({ ...d, [slot.id]: e.currentTarget.value }))}
                  />
                </Label>
                <Box class="settings-actions">
                  <Button class="btn primary" type="button" disabled={busy() || !(drafts()[slot.id] ?? "").trim()} onClick={() => save(slot)}>
                    {busy() ? t("common.saving") : t("common.save")}
                  </Button>
                  <Show when={saved()}>
                    <Button class="btn ghost" type="button" disabled={busy()} onClick={() => remove(slot)}>
                      {t("common.remove")}
                    </Button>
                  </Show>
                </Box>
              </Box>
            )
          }}
        </For>
      </Show>
    </Box>
  )
}
