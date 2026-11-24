import {
  Show,
  createEffect,
  createSignal,
  onCleanup,
  type JSX,
} from "solid-js"
import { api } from "../../api"
import {
  shouldAutoMountPreview,
  stableStatusWhileFramed,
} from "../../preview-lifecycle"
import type { StudioPanelProps } from "./types"

function PlayIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function StopIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  )
}

function RefreshIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.6-6.2" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

function ExternalIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  )
}

export default function PreviewPanel(props: StudioPanelProps): JSX.Element {
  const [status, setStatus] = createSignal("idle")
  const [booting, setBooting] = createSignal(false)
  const [frameGen, setFrameGen] = createSignal(0)
  const [routeDraft, setRouteDraft] = createSignal("/")

  /** Grant URL for the current frame generation; assigned to the iframe once. */
  let armedGrant: string | null = null
  let frameRequestGen = 0
  let autoFrameAttemptedProjectId: string | null = null

  const updateStatus = (value: string) => {
    setStatus(value)
    props.onStatusChange(value)
  }

  const clearFrame = (options?: { clearBooting?: boolean }) => {
    frameRequestGen += 1
    armedGrant = null
    setFrameGen(0)
    if (options?.clearBooting !== false) setBooting(false)
  }

  const runnerStarting = () =>
    booting() || status() === "starting" || status() === "created"
  const runnerLive = () => status() === "running"

  createEffect(() => {
    props.projectId
    autoFrameAttemptedProjectId = null
    clearFrame()
    updateStatus("idle")
  })

  const mintPreviewFrame = async (
    id: string,
    options?: { requireOpen?: boolean },
  ): Promise<"mounted" | "superseded" | "closed"> => {
    const requestGen = ++frameRequestGen
    let url: string
    try {
      url = (await api.previewGrant(id)).url
    } catch (cause) {
      if (requestGen !== frameRequestGen || props.projectId !== id) {
        return "superseded"
      }
      throw cause
    }
    if (requestGen !== frameRequestGen || props.projectId !== id) {
      return "superseded"
    }
    if (options?.requireOpen && !props.active) return "closed"
    armedGrant = url
    setFrameGen((generation) => generation + 1)
    return "mounted"
  }

  const bindPreviewFrame = (element: HTMLIFrameElement) => {
    const grant = armedGrant
    if (!grant || element.dataset.armed === grant) return
    element.dataset.armed = grant
    element.src = grant
  }

  // Polling may mount one already-ready frame on entry. It never remounts a
  // framed preview and inactive panels cannot acquire a new grant.
  createEffect(() => {
    const id = props.projectId
    const previewOpen = props.active
    if (!id) return
    let cancelled = false
    const tick = async () => {
      try {
        const next = await api.status(id)
        if (cancelled) return
        const framed = frameGen() > 0
        updateStatus(stableStatusWhileFramed(next.status, next.ready, framed))
        if (
          shouldAutoMountPreview({
            status: next.status,
            ready: next.ready,
            previewOpen,
            hasFrame: framed,
            booting: booting(),
            attempted: autoFrameAttemptedProjectId === id,
          })
        ) {
          autoFrameAttemptedProjectId = id
          setBooting(true)
          try {
            const result = await mintPreviewFrame(id, { requireOpen: true })
            if (result === "closed") {
              if (autoFrameAttemptedProjectId === id) {
                autoFrameAttemptedProjectId = null
              }
              setBooting(false)
            }
          } catch (cause) {
            if (!cancelled && props.projectId === id) {
              setBooting(false)
              props.onError(
                cause instanceof Error
                  ? cause.message
                  : "Could not open the live preview",
              )
            }
          }
        }
      } catch {
        // A transient status failure must not tear down a healthy frame.
      }
    }
    void tick()
    const interval = setInterval(() => void tick(), 4000)
    onCleanup(() => {
      cancelled = true
      clearInterval(interval)
    })
  })

  const ensure = async () => {
    const id = props.projectId
    if (!id) return
    props.onError("")
    autoFrameAttemptedProjectId = id
    clearFrame({ clearBooting: false })
    setBooting(true)
    updateStatus("starting")
    props.onActivate("preview")
    try {
      const result = await api.ensure(id)
      updateStatus(result.status)
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const next = await api.status(id)
        if (next.status === "running" && next.ready) {
          updateStatus("running")
          props.onActivate("preview")
          await mintPreviewFrame(id)
          break
        }
        if (
          next.status === "exited"
          || next.status === "stopped"
          || next.status === "not_found"
        ) {
          updateStatus(next.status)
          setBooting(false)
          break
        }
        updateStatus("starting")
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
      if (frameGen() === 0) setBooting(false)
      const projects = await api.listProjects()
      props.onProjectChange(
        projects.projects.find((project) => project.id === id) ?? null,
      )
    } catch (cause) {
      props.onError(cause instanceof Error ? cause.message : "Ensure failed")
      updateStatus("error")
      setBooting(false)
    }
  }

  const stop = async () => {
    const id = props.projectId
    if (!id) return
    autoFrameAttemptedProjectId = id
    clearFrame()
    updateStatus("stopped")
    try {
      await api.stop(id)
      const projects = await api.listProjects()
      props.onProjectChange(
        projects.projects.find((project) => project.id === id) ?? null,
      )
    } catch (cause) {
      props.onError(cause instanceof Error ? cause.message : "Stop failed")
    }
  }

  const openPreviewInNewTab = () => {
    const id = props.projectId
    if (!id) return
    const rawPath = routeDraft().trim() || "/"
    const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`
    void api
      .previewGrant(id)
      .then(({ url }) => {
        let target = url
        try {
          const destination = new URL(url)
          const grant = new URL(url)
          destination.pathname = path
          destination.search = grant.search
          destination.hash = ""
          target = destination.toString()
        } catch {
          // Use the grant URL unchanged.
        }
        window.open(target, "_blank", "noopener,noreferrer")
      })
      .catch(() => {
        // Grant failure leaves the user safely inside Studio.
      })
  }

  return (
    <div class="studio-panel-surface preview-panel-surface">
      <div class="panel-provider-toolbar preview-provider-toolbar">
        <div class="side-route">
          <input
            class="side-route-input"
            type="text"
            value={routeDraft()}
            spellcheck={false}
            autocomplete="off"
            aria-label="Preview route"
            placeholder="/"
            onInput={(event) => setRouteDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              openPreviewInNewTab()
            }}
          />
          <button
            type="button"
            class="side-icon-btn"
            title="Open in new window"
            aria-label="Open preview in new window"
            onClick={openPreviewInNewTab}
          >
            <ExternalIcon />
          </button>
        </div>
        <div class="side-toolbar-actions" role="group" aria-label="Runner">
          <Show
            when={runnerLive()}
            fallback={
              <button
                type="button"
                class="side-icon-btn primary"
                title={runnerStarting() ? "Starting…" : "Start"}
                aria-label={runnerStarting() ? "Starting preview" : "Start preview"}
                disabled={runnerStarting()}
                onClick={() => void ensure()}
              >
                <PlayIcon />
              </button>
            }
          >
            <button
              type="button"
              class="side-icon-btn"
              title="Stop"
              aria-label="Stop preview"
              onClick={() => void stop()}
            >
              <StopIcon />
            </button>
          </Show>
          <button
            type="button"
            class="side-icon-btn"
            title="Refresh"
            aria-label="Refresh preview"
            disabled={runnerStarting()}
            onClick={() => void ensure()}
          >
            <RefreshIcon />
          </button>
        </div>
      </div>

      <div class="studio-panel-content preview-pane">
        <Show
          when={frameGen() > 0}
          fallback={
            <div class="pane-empty">
              <Show
                when={booting() || status() === "starting"}
                fallback={
                  <p>
                    {status() === "running"
                      ? "The live preview is ready. Use Refresh to open it."
                      : `Preview is ${status() === "exited" ? "stopped" : status()}. Use Play to boot the Vite runner.`}
                    {" "}Edits use HMR — the frame is not remounted automatically.
                  </p>
                }
              >
                <p>
                  {status() === "running"
                    ? "Opening live preview…"
                    : "Starting runner…"}
                </p>
              </Show>
            </div>
          }
        >
          <div class="preview-frame-wrap">
            <iframe
              ref={bindPreviewFrame}
              title="App preview"
              class="frame preview-frame"
              // Cross-origin preview (app.* → *.preview.*) needs explicit
              // Permissions-Policy delegation or Clipboard API paste/copy fails
              // (Simple Table / spreadsheet Ctrl+V → "blocked by permissions policy").
              allow="clipboard-read *; clipboard-write *"
              onLoad={() => setBooting(false)}
            />
            <Show when={booting()}>
              <div class="preview-frame-overlay" aria-live="polite">
                Starting preview…
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  )
}

