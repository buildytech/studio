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
    const enabled = tpl.templates.find((t) => t.enabled)
    if (enabled && !tpl.templates.some((t) => t.id === templateId() && t.enabled)) {
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
    const n = name().trim() || "Untitled app"
    setCreating(true)
    setError("")
    try {
      const res = await api.createProject(n, templateId())
      setName("")
      await load()
      navigate(`/p/${res.project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed")
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
      setError(err instanceof Error ? err.message : "Clone failed")
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
      setDeleteError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div class="projects-page">
      <header class="projects-top">
        <div class="brand-lockup">
          <A href="/" class="brand">
            Buildy
          </A>
          <span class="brand-tag">Apps</span>
        </div>
        <div class="projects-top-right">
          <A class="btn ghost" href="/settings">Settings</A>
        </div>
      </header>

      <div class="projects-hero">
        <h1 class="projects-title">Your apps</h1>
        <p class="projects-sub">Open a project to build with the agent, or start a new one.</p>
        <Show when={templates().length > 0}>
          <div class="template-picker" role="radiogroup" aria-label="App template">
            <For each={templates()}>
              {(t) => (
                <button
                  type="button"
                  class="template-option"
                  classList={{
                    selected: templateId() === t.id,
                    disabled: !t.enabled,
                  }}
                  role="radio"
                  aria-checked={templateId() === t.id}
                  disabled={!t.enabled}
                  title={t.description}
                  onClick={() => {
                    if (t.enabled) setTemplateId(t.id)
                  }}
                >
                  <span class="template-stack">{t.stack}</span>
                  <span class="template-name">{t.name}</span>
                  <span class="template-desc">{t.description}</span>
                  <Show when={!t.enabled}>
                    <span class="template-soon">Soon</span>
                  </Show>
                </button>
              )}
            </For>
          </div>
        </Show>
        <form class="new-app-form" onSubmit={(e) => void create(e)}>
          <input
            class="input grow"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            placeholder="Name your next app…"
            maxlength={80}
          />
          <button class="btn primary" type="submit" disabled={creating()}>
            {creating() ? "Creating…" : "New app"}
          </button>
        </form>
        <Show when={error()}>
          <p class="form-error">{error()}</p>
        </Show>
        <Show when={notice()}>
          <p class="form-notice">{notice()}</p>
        </Show>
      </div>

      <Show when={loaded()} fallback={<p class="muted center-pad">Loading projects…</p>}>
        <Show
          when={projects().length > 0}
          fallback={
            <div class="empty-projects">
              <p>No apps yet.</p>
              <p class="muted">Create one above — you will land in the agent studio.</p>
            </div>
          }
        >
          <div class="project-grid">
            <For each={projects()}>
              {(p) => (
                <article
                  class="project-card"
                  classList={{ "menu-open": menuId() === p.id, busy: busyId() === p.id }}
                >
                  <div class="card-menu">
                    <button
                      type="button"
                      class="card-menu-btn"
                      aria-label={`Actions for ${p.name}`}
                      aria-expanded={menuId() === p.id}
                      aria-haspopup="menu"
                      disabled={busyId() === p.id}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setMenuId((id) => (id === p.id ? null : p.id))
                      }}
                    >
                      ⋯
                    </button>
                    <Show when={menuId() === p.id}>
                      <div class="card-menu-dropdown" role="menu">
                        <button type="button" role="menuitem" onClick={() => viewProject(p)}>
                          View
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          disabled={busyId() === p.id}
                          onClick={() => void cloneProject(p)}
                        >
                          Clone
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          class="danger"
                          onClick={() => openDelete(p)}
                        >
                          Delete
                        </button>
                      </div>
                    </Show>
                  </div>

                  <A href={`/p/${p.id}`} class="project-card-link">
                    <div class="project-thumb" aria-hidden="true">
                      <div class="thumb-placeholder">
                        <span class="thumb-mark">B</span>
                        <span class="thumb-hint">Preview soon</span>
                      </div>
                    </div>
                    <div class="project-card-body">
                      <div class="project-card-row">
                        <h2 class="project-card-name">{p.name}</h2>
                        <span class={`status-pill status-${p.status}`}>{statusLabel(p.status)}</span>
                      </div>
                      <div class="project-card-footer">
                        <span class="stack-badge">{stackLabel(p.template_id, templates())}</span>
                        <p class="project-card-meta">Updated {formatRelative(p.updated_at)}</p>
                      </div>
                    </div>
                  </A>
                </article>
              )}
            </For>
          </div>
        </Show>
      </Show>

      <Show when={deleteTarget()}>
        {(p) => (
          <div
            class="modal-backdrop"
            role="presentation"
            onClick={() => {
              setDeleteTarget(null)
              setConfirmName("")
              setDeleteError("")
            }}
          >
            <div
              class="modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-app-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="delete-app-title" class="modal-title">
                Delete app
              </h2>
              <p class="modal-copy">
                This permanently deletes <strong>{p().name}</strong> and its workspace. Type the app
                name to confirm.
              </p>
              <form class="modal-form" onSubmit={(e) => void confirmDelete(e)}>
                <label class="field">
                  App name
                  <input
                    class="input"
                    value={confirmName()}
                    onInput={(e) => setConfirmName(e.currentTarget.value)}
                    placeholder={p().name}
                    autocomplete="off"
                    autofocus
                  />
                </label>
                <Show when={deleteError()}>
                  <p class="form-error">{deleteError()}</p>
                </Show>
                <div class="modal-actions">
                  <button
                    class="btn ghost"
                    type="button"
                    onClick={() => {
                      setDeleteTarget(null)
                      setConfirmName("")
                      setDeleteError("")
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    class="btn danger"
                    type="submit"
                    disabled={busyId() === p().id || confirmName().trim() !== p().name}
                  >
                    {busyId() === p().id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Show>
    </div>
  )
}
