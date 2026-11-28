import {
  Show,
  createEffect,
  createSignal,
  onCleanup,
  type JSX,
} from "solid-js"
import { api } from "../../api"
import { countTreeFiles } from "../../editor/tree-count"
import {
  shouldAutoMountPreview,
  stableStatusWhileFramed,
} from "../../preview-lifecycle"
import type { StudioPanelProps } from "./types"
import { Box, Button, Input, Text } from "../../primitives"
import { AppIcon } from "../../app-icons"
import { PreviewFrame } from "../../vendor-ui/PreviewFrame"
import { t } from "../../i18n"

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
    // An empty project cannot start: the Editor and its Import ZIP instead of the host's 409.
    const files = await api.listProjectFiles(id).catch(() => null)
    if (files && countTreeFiles(files.tree) === 0) {
      props.onActivate("code")
      return
    }
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
    <Box class="studio-panel-surface preview-panel-surface">
      <Box class="panel-provider-toolbar preview-provider-toolbar">
        <Box class="side-route">
          <Input
            class="side-route-input"
            type="text"
            value={routeDraft()}
            spellcheck={false}
            autocomplete="off"
            aria-label={t("preview.previewRoute")}
            placeholder="/"
            onInput={(event) => setRouteDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              openPreviewInNewTab()
            }}
          />
          <Button
            type="button"
            class="side-icon-btn"
            title={t("preview.openInNewWindow")}
            aria-label={t("preview.openPreviewInNew")}
            onClick={openPreviewInNewTab}
          >
            <AppIcon name="external-link" size={15} />
          </Button>
        </Box>
        <Box class="side-toolbar-actions" role="group" aria-label={t("preview.runner")}>
          <Show
            when={runnerLive()}
            fallback={
              <Button
                type="button"
                class="side-icon-btn primary"
                title={runnerStarting() ? t("preview.starting") : t("preview.startShort")}
                aria-label={runnerStarting() ? t("preview.startingPreview") : t("preview.start")}
                disabled={runnerStarting()}
                onClick={() => void ensure()}
              >
                <AppIcon name="play" size={15} filled />
              </Button>
            }
          >
            <Button
              type="button"
              class="side-icon-btn"
              title={t("common.stop")}
              aria-label={t("preview.stopPreview")}
              onClick={() => void stop()}
            >
              <AppIcon name="stop" size={14} filled />
            </Button>
          </Show>
          <Button
            type="button"
            class="side-icon-btn"
            title={t("preview.refresh")}
            aria-label={t("preview.refreshPreview")}
            disabled={runnerStarting()}
            onClick={() => void ensure()}
          >
            <AppIcon name="refresh" size={15} />
          </Button>
        </Box>
      </Box>

      <Box class="studio-panel-content preview-pane">
        <Show
          when={frameGen() > 0}
          fallback={
            <Box class="pane-empty">
              <Show
                when={booting() || status() === "starting"}
                fallback={
                  <Show
                    when={status() !== "running"}
                    fallback={<Text>{t("preview.readyLead")}</Text>}
                  >
                    <Box class="flex flex-col items-center gap-3">
                      <Text>{t("preview.stoppedLead")}</Text>
                      <Button
                        type="button"
                        class="btn primary"
                        disabled={runnerStarting()}
                        onClick={() => void ensure()}
                      >
                        <AppIcon name="play" size={14} filled />
                        {t("preview.start")}
                      </Button>
                    </Box>
                  </Show>
                }
              >
                <Text>
                  {status() === "running"
                    ? t("preview.openingLivePreview")
                    : t("preview.startingRunner")}
                </Text>
              </Show>
            </Box>
          }
        >
          <Box class="preview-frame-wrap">
            <PreviewFrame
              ref={bindPreviewFrame}
              title={t("preview.appPreview")}
              class="frame preview-frame"
              onLoad={() => setBooting(false)}
            />
            <Show when={booting()}>
              <Box class="preview-frame-overlay" aria-live="polite">
                {t("preview.startingPreviewEllipsis")}
              </Box>
            </Show>
          </Box>
        </Show>
      </Box>
    </Box>
  )
}

