import { describe, expect, test } from "bun:test"
import { HOST_DESKTOP_ROUTES, HOST_SEAM_PREFIX, HOST_SEAM_ROUTES, type HostSeamRoute } from "@buildy/agent-contract"
import { HttpHostClient, type HostClient } from "./host-client"

type Call = { method: string; url: string; body?: unknown }

/** A transport that records every request and answers what each route needs. */
function recordingFetch(calls: Call[]): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({ method: (init?.method ?? "GET").toUpperCase(), url, body: init?.body })
    if (url.endsWith("/events")) {
      return new Response(new ReadableStream({ start: (c) => c.close() }), { status: 200 })
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }) as typeof fetch
}

function routeRegex(r: HostSeamRoute): RegExp {
  const p = r.path.replace(/:[a-zA-Z]+/g, "[^/?]+")
  return new RegExp(`^${HOST_SEAM_PREFIX}${p}(\\?.*)?$`)
}

function matchRoute(c: Call): HostSeamRoute | undefined {
  const path = c.url.replace(/^https?:\/\/[^/]+/, "")
  return [...HOST_SEAM_ROUTES, ...HOST_DESKTOP_ROUTES].find((r) => r.method === c.method && routeRegex(r).test(path))
}

/** Calls every HostClient method once with sample arguments. */
async function exercise(h: HostClient): Promise<void> {
  const file = new File([new Uint8Array([1])], "shot.png", { type: "image/png" })
  await h.hostCapabilities()
  await h.desktopConnection()
  await h.desktopConnect({ address: "srv.example", user: "vibechat-tunnel", token: "t" })
  await h.desktopDisconnect(true)
  await h.desktopProvision()
  await h.desktopProvisionStart({ address: "203.0.113.5", password: "pw" })
  await h.desktopSaveArchive({ projectId: "p1" })
  await h.cursorAccount()
  await h.listMyCredentials()
  await h.putMyCredential("cursor-sdk", "cursor", "k")
  await h.deleteMyCredential("cursor-sdk", "cursor")
  await h.listTemplates()
  await h.listProjects()
  await h.createProject("A", "vite-svelte-bun")
  await h.cloneProject("p1", "B")
  await h.deleteProject("p1", "A")
  await h.ensure("p1")
  await h.stop("p1")
  await h.status("p1")
  await h.previewGrant("p1")
  await h.listProjectFiles("p1")
  await h.readProjectFile("p1", "src/App.svelte")
  await h.writeProjectFile("p1", "src/App.svelte", "x")
  await h.exportProjectBrief("p1")
  await h.importProjectBrief("p1", {})
  await h.projectArchiveCheck("p1")
  await h.importProjectZip("p1", file)
  await h.briefFromImage("p1", file)
  await h.agentCapabilities("p1")
  await h.agentSessions("p1")
  await h.createAgentSession("p1")
  await h.deleteAgentSession("p1", "s1")
  await h.promptAgent("p1", "s1", "hi", "auto")
  await h.agentTranscript("p1", "s1", 3)
  await h.openAgentEvents("p1", "s1")
  await h.exportAgentSession("p1", "s1")
  await h.abortAgent("p1", "s1")
  await h.importAgentSession("p1", {})
  await h.runFeedback("p1", "r1", { rating: "up" })
}

describe("HostClient ↔ host seam contract (docs/adr/0002)", () => {
  test("every call maps to a seam route and every seam route has a call", async () => {
    const calls: Call[] = []
    await exercise(new HttpHostClient({ baseUrl: HOST_SEAM_PREFIX, fetch: recordingFetch(calls) }))
    const unmatched = calls.filter((c) => !matchRoute(c)).map((c) => `${c.method} ${c.url}`)
    expect(unmatched).toEqual([])
    const covered = new Set(calls.map((c) => matchRoute(c)!).map((r) => `${r.method} ${r.path}`))
    const missing = [...HOST_SEAM_ROUTES, ...HOST_DESKTOP_ROUTES].map((r) => `${r.method} ${r.path}`).filter((k) => !covered.has(k))
    expect(missing).toEqual([])
  })

  test("the archive URL is the seam route, for a browser download", () => {
    const h = new HttpHostClient({ baseUrl: HOST_SEAM_PREFIX, fetch: recordingFetch([]) })
    expect(matchRoute({ method: "GET", url: h.projectArchiveUrl("p1") })?.path).toBe("/projects/:id/archive.zip")
  })

  test("a cloud base URL prefixes every request and the auth hook adds headers", async () => {
    const calls: Call[] = []
    const seen: string[] = []
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      seen.push(new Headers(init?.headers).get("Authorization") ?? "")
      return recordingFetch(calls)(input, init)
    }) as typeof fetch
    const h = new HttpHostClient({
      baseUrl: `https://cloud.example${HOST_SEAM_PREFIX}`,
      fetch: fetchImpl,
      headers: () => ({ Authorization: "Bearer t" }),
    })
    await h.listProjects()
    await h.promptAgent("p1", "s1", "hi", "auto")
    expect(calls.every((c) => c.url.startsWith(`https://cloud.example${HOST_SEAM_PREFIX}/`))).toBe(true)
    expect(seen).toEqual(["Bearer t", "Bearer t"])
  })

  test("errors carry the host's { error } message and status", async () => {
    const h = new HttpHostClient({
      baseUrl: HOST_SEAM_PREFIX,
      fetch: (async () =>
        new Response(JSON.stringify({ error: "nope" }), { status: 501 })) as unknown as typeof fetch,
    })
    await expect(h.listProjects()).rejects.toMatchObject({ status: 501, message: "nope" })
  })
})
