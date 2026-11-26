import { describe, expect, test } from "bun:test"
import { ApiError } from "../chat/banner"
import { downloadArchive } from "./archive"

const url = (id: string) => `/runtime/v1/projects/${id}/archive.zip`

describe("downloadArchive", () => {
  test("the desktop app saves it: no browser download", async () => {
    const went: string[] = []
    const r = await downloadArchive(
      { desktopSaveArchive: async () => ({ saved: true, file: "/home/a/site.zip" }), projectArchiveCheck: async () => { throw new Error("no") }, projectArchiveUrl: url },
      "p1", (u) => went.push(u))
    expect(r).toEqual({ kind: "saved", file: "/home/a/site.zip" })
    expect(went).toEqual([])
  })

  test("a closed Save dialog is not an error", async () => {
    const r = await downloadArchive(
      { desktopSaveArchive: async () => ({ saved: false }), projectArchiveCheck: async () => ({ name: "a.zip", files: 1, bytes: 1 }), projectArchiveUrl: url },
      "p1", () => {})
    expect(r).toEqual({ kind: "canceled" })
  })

  test("outside the app (404) the browser downloads the route after the check", async () => {
    const went: string[] = []
    const r = await downloadArchive(
      { desktopSaveArchive: async () => { throw new ApiError(404, "Not found") }, projectArchiveCheck: async () => ({ name: "a.zip", files: 1, bytes: 1 }), projectArchiveUrl: url },
      "p1", (u) => went.push(u))
    expect(r).toEqual({ kind: "browser" })
    expect(went).toEqual([url("p1")])
  })

  test("a refused check and a desktop failure are errors, and nothing downloads", async () => {
    const went: string[] = []
    const tooLarge = downloadArchive(
      { desktopSaveArchive: async () => { throw new ApiError(404, "Not found") }, projectArchiveCheck: async () => { throw new ApiError(413, "too large") }, projectArchiveUrl: url },
      "p1", (u) => went.push(u))
    await expect(tooLarge).rejects.toThrow("too large")
    const broken = downloadArchive(
      { desktopSaveArchive: async () => { throw new ApiError(502, "unreachable") }, projectArchiveCheck: async () => ({ name: "a.zip", files: 1, bytes: 1 }), projectArchiveUrl: url },
      "p1", (u) => went.push(u))
    await expect(broken).rejects.toThrow("unreachable")
    expect(went).toEqual([])
  })
})
