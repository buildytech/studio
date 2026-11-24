import { For, Show, createEffect, createSignal, onCleanup, type JSX } from "solid-js"
import { A, useNavigate } from "@solidjs/router"
import {
  api,
  formatRelative,
  projectPreviewUrl,
  stackLabel,
  statusLabel,
  type Project,
  type Template,
  type User,
} from "./api"
import { AppIcon } from "./app-icons"
import { t } from "./i18n"
import { Box, Button, Form, Input, Label, Text } from "./primitives"

export function Projects(props: { user: User }): JSX.Element {
  const navigate = useNavigate()
  const [projects, setProjects] = createSignal<Project[]>([])
  const [templates, setTemplates] = createSignal<Template[]>([])
  const [templateId, setTemplateId] = createSignal("vite-react")
  const [error, setError] = createSignal("")
  const [creating, setCreating] = createSignal(false)
  const [name, setName] = createSignal("")
  const [loaded, setLoaded] = createSignal(false)
  const [menuId, setMenuId] = createSignal<string | null>(null)
  const [busyId, setBusyId] = createSignal<string | null>(null)
  const [notice, setNotice] = createSignal("")
  const [deleteTarget, setDeleteTarget] = createSignal<Project | null>(null)
  const [confirmName, setConfirmName] = createSignal("")
  const [deleteError, setDeleteError] = createSignal("")

  const load = async () => {
    const [proj, tpl] = await Promise.all([api.listProjects(), api.listTemplates()])
    setProjects(proj.projects)
    setTemplates(tpl.templates)
    const enabled = tpl.templates.find((x) => x.enabled)
    if (enabled && !tpl.templates.some((x) => x.id === templateId() && x.enabled)) {
      setTemplateId(enabled.id)
    }
    setLoaded(true)
  }

  void load().catch((e) => {
    setError(String(e))
    setLoaded(true)
  })

  createEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      setMenuId(null)
      if (deleteTarget()) {
        setDeleteTarget(null)
        setConfirmName("")
        setDeleteError("")
      }
    }
    document.addEventListener("keydown", onKey)
    onCleanup(() => document.removeEventListener("keydown", onKey))
  })

  createEffect(() => {
    if (!menuId()) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (t?.closest?.(".card-menu")) return
      setMenuId(null)
    }
    document.addEventListener("mousedown", onDoc)
    onCleanup(() => document.removeEventListener("mousedown", onDoc))
  })

  const create = async (e: Event) => {
    e.preventDefault()
    const n = name().trim() || t("projects.untitled")
    setCreating(true)
    setError("")
    try {
      const res = await api.createProject(n, templateId())
      setName("")
      await load()
      navigate(`/p/${res.project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("projects.createFailed"))
    } finally {
      setCreating(false)
    }
  }

  const viewProject = (p: Project) => {
    setMenuId(null)
    window.open(projectPreviewUrl(p), "_blank", "noopener,noreferrer")
  }

  const cloneProject = async (p: Project) => {
    setMenuId(null)
    setBusyId(p.id)
    setError("")
    setNotice("")
    try {
      const res = await api.cloneProject(p.id)
      await load()
      navigate(`/p/${res.project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("projects.cloneFailed"))
    } finally {
      setBusyId(null)
    }
  }

  const openDelete = (p: Project) => {
    setMenuId(null)
    setDeleteTarget(p)
    setConfirmName("")
    setDeleteError("")
  }

  const confirmDelete = async (e: Event) => {
    e.preventDefault()
    const p = deleteTarget()
    if (!p) return
    setBusyId(p.id)
    setDeleteError("")
    try {
      await api.deleteProject(p.id, confirmName().trim())
      setDeleteTarget(null)
      setConfirmName("")
      await load()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t("projects.deleteFailed"))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Box class="projects-page">
      <Box tag="header" class="projects-top">
        <Box class="brand-lockup">
          <A href="/" class="brand">
            {t("brand.name")}
          </A>
          <Text tag="span" class="brand-tag">{t("nav.apps")}</Text>
        </Box>
        <Box class="projects-top-right">
          <A class="btn ghost" href="/settings">{t("nav.settings")}</A>
        </Box>
      </Box>

      <Box class="projects-hero">
        <Text tag="h1" class="projects-title">{t("projects.title")}</Text>
        <Text class="projects-sub">{t("projects.lead")}</Text>
        <Show when={templates().length > 0}>
          <Box class="template-picker" role="radiogroup" aria-label={t("projects.templatePicker")}>
            <For each={templates()}>
              {(tpl) => (
                <Button
                  type="button"
                  class="template-option"
                  classList={{
                    selected: templateId() === tpl.id,
                    disabled: !tpl.enabled,
                  }}
                  role="radio"
                  aria-checked={templateId() === tpl.id}
                  disabled={!tpl.enabled}
                  title={tpl.description}
                  onClick={() => {
                    if (tpl.enabled) setTemplateId(tpl.id)
                  }}
                >
                  <Text tag="span" class="template-stack">{tpl.stack}</Text>
                  <Text tag="span" class="template-name">{tpl.name}</Text>
                  <Text tag="span" class="template-desc">{tpl.description}</Text>
                  <Show when={!tpl.enabled}>
                    <Text tag="span" class="template-soon">{t("projects.templateSoon")}</Text>
                  </Show>
                </Button>
              )}
            </For>
          </Box>
        </Show>
        <Form class="new-app-form" onSubmit={(e) => void create(e)}>
          <Input
            class="input grow"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            placeholder={t("projects.namePlaceholder")}
            maxlength={80}
          />
          <Button class="btn primary" type="submit" disabled={creating()}>
            {creating() ? t("projects.creating") : t("projects.create")}
          </Button>
        </Form>
        <Show when={error()}>
          <Text class="form-error">{error()}</Text>
        </Show>
        <Show when={notice()}>
          <Text class="form-notice">{notice()}</Text>
        </Show>
      </Box>

      <Show when={loaded()} fallback={<Text class="muted center-pad">{t("projects.loading")}</Text>}>
        <Show
          when={projects().length > 0}
          fallback={
            <Box class="empty-projects">
              <Text>{t("projects.emptyTitle")}</Text>
              <Text class="muted">{t("projects.emptyLead")}</Text>
            </Box>
          }
        >
          <Box class="project-grid">
            <For each={projects()}>
              {(p) => (
                <Box tag="article"
                  class="project-card"
                  classList={{ "menu-open": menuId() === p.id, busy: busyId() === p.id }}
                >
                  <Box class="card-menu">
                    <Button
                      type="button"
                      class="card-menu-btn"
                      aria-label={t("projects.actionsFor", { name: p.name })}
                      aria-expanded={menuId() === p.id}
                      aria-haspopup="menu"
                      disabled={busyId() === p.id}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setMenuId((id) => (id === p.id ? null : p.id))
                      }}
                    >
                      <AppIcon name="ellipsis" />
                    </Button>
                    <Show when={menuId() === p.id}>
                      <Box class="card-menu-dropdown" role="menu">
                        <Button type="button" role="menuitem" onClick={() => viewProject(p)}>
                          {t("projects.view")}
                        </Button>
                        <Button
                          type="button"
                          role="menuitem"
                          disabled={busyId() === p.id}
                          onClick={() => void cloneProject(p)}
                        >
                          {t("projects.clone")}
                        </Button>
                        <Button
                          type="button"
                          role="menuitem"
                          class="danger"
                          onClick={() => openDelete(p)}
                        >
                          {t("common.delete")}
                        </Button>
                      </Box>
                    </Show>
                  </Box>

                  <A href={`/p/${p.id}`} class="project-card-link">
                    <Box class="project-thumb" aria-hidden="true">
                      <Box class="thumb-placeholder">
                        <Text tag="span" class="thumb-mark">{t("projects.thumbMark")}</Text>
                        <Text tag="span" class="thumb-hint">{t("projects.thumbHint")}</Text>
                      </Box>
                    </Box>
                    <Box class="project-card-body">
                      <Box class="project-card-row">
                        <Text tag="h2" class="project-card-name">{p.name}</Text>
                        <Text tag="span" class={`status-pill status-${p.status}`}>{statusLabel(p.status)}</Text>
                      </Box>
                      <Box class="project-card-footer">
                        <Text tag="span" class="stack-badge">{stackLabel(p.template_id, templates())}</Text>
                        <Text class="project-card-meta">{t("projects.updated", { when: formatRelative(p.updated_at) })}</Text>
                      </Box>
                    </Box>
                  </A>
                </Box>
              )}
            </For>
          </Box>
        </Show>
      </Show>

      <Show when={deleteTarget()}>
        {(p) => (
          <Box
            class="modal-backdrop"
            role="presentation"
            onClick={() => {
              setDeleteTarget(null)
              setConfirmName("")
              setDeleteError("")
            }}
          >
            <Box
              class="modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-app-title"
              onClick={(e) => e.stopPropagation()}
            >
              <Text tag="h2" id="delete-app-title" class="modal-title">
                {t("projects.deleteTitle")}
              </Text>
              <Text class="modal-copy">{t("projects.deleteLead", { name: p().name })}</Text>
              <Form class="modal-form" onSubmit={(e) => void confirmDelete(e)}>
                <Label class="field">
                  {t("projects.deleteNameLabel")}
                  <Input
                    class="input"
                    value={confirmName()}
                    onInput={(e) => setConfirmName(e.currentTarget.value)}
                    placeholder={p().name}
                    autocomplete="off"
                    autofocus
                  />
                </Label>
                <Show when={deleteError()}>
                  <Text class="form-error">{deleteError()}</Text>
                </Show>
                <Box class="modal-actions">
                  <Button
                    class="btn ghost"
                    type="button"
                    onClick={() => {
                      setDeleteTarget(null)
                      setConfirmName("")
                      setDeleteError("")
                    }}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    class="btn danger"
                    type="submit"
                    disabled={busyId() === p().id || confirmName().trim() !== p().name}
                  >
                    {busyId() === p().id ? t("common.deleting") : t("common.delete")}
                  </Button>
                </Box>
              </Form>
            </Box>
          </Box>
        )}
      </Show>
    </Box>
  )
}
