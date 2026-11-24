import { describe, expect, test } from "bun:test"
import {
  shouldAutoMountPreview,
  stableStatusWhileFramed,
} from "./preview-lifecycle"

describe("stableStatusWhileFramed", () => {
  test("without frame, !ready running → starting", () => {
    expect(stableStatusWhileFramed("running", false, false)).toBe("starting")
  })

  test("with frame, !ready running stays running (HMR / Vite blip)", () => {
    expect(stableStatusWhileFramed("running", false, true)).toBe("running")
  })

  test("stopped is always reported", () => {
    expect(stableStatusWhileFramed("stopped", false, true)).toBe("stopped")
  })
})

describe("shouldAutoMountPreview", () => {
  const live = {
    status: "running",
    ready: true,
    previewOpen: true,
    hasFrame: false,
    booting: false,
    attempted: false,
  }

  test("mounts an already-live preview on project open", () => {
    expect(shouldAutoMountPreview(live)).toBe(true)
  })

  test("does not mount until the runner is ready", () => {
    expect(shouldAutoMountPreview({ ...live, ready: false })).toBe(false)
    expect(shouldAutoMountPreview({ ...live, status: "starting" })).toBe(false)
  })

  test("does not load a collapsed preview", () => {
    expect(shouldAutoMountPreview({ ...live, previewOpen: false })).toBe(false)
  })

  test("switching panels keeps a framed preview stable without reminting", () => {
    expect(stableStatusWhileFramed("running", false, true)).toBe("running")
    expect(
      shouldAutoMountPreview({
        ...live,
        previewOpen: false,
        hasFrame: true,
      }),
    ).toBe(false)
  })

  test("polling cannot mount twice or compete with Start", () => {
    expect(shouldAutoMountPreview({ ...live, hasFrame: true })).toBe(false)
    expect(shouldAutoMountPreview({ ...live, booting: true })).toBe(false)
    expect(shouldAutoMountPreview({ ...live, attempted: true })).toBe(false)
  })
})
