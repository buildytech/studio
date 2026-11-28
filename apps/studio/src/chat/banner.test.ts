import { describe, expect, test } from "bun:test"
import {
  ApiError,
  classifyChatError,
  isTerminalSseError,
  streamCaughtUpBanner,
  streamReconnectBanner,
} from "./banner"

describe("classifyChatError", () => {
  test("503 missing key → Settings", () => {
    const b = classifyChatError(
      new ApiError(503, "Cursor API key not configured. Add it in Settings."),
    )
    expect(b.settingsHref).toBe("/settings/models")
    expect(b.tone).toBe("danger")
  })

  test("401 → re-auth copy, no Settings", () => {
    const b = classifyChatError(new ApiError(401, "Unauthorized"))
    expect(b.settingsHref).toBeUndefined()
    expect(b.message.toLowerCase()).toContain("sign in")
  })

  test("terminal SSE statuses", () => {
    expect(isTerminalSseError(new ApiError(401, "x"))).toBe(true)
    expect(isTerminalSseError(new ApiError(404, "x"))).toBe(true)
    expect(isTerminalSseError(new ApiError(503, "x"))).toBe(false)
  })

  test("403 model → Settings", () => {
    const b = classifyChatError(
      new ApiError(403, "Model not allowed for this project"),
    )
    expect(b.settingsHref).toBe("/settings/models")
  })

  test("generic error has no Settings link", () => {
    expect(classifyChatError(new Error("Preview failed")).settingsHref)
      .toBeUndefined()
  })

  test("reconnect warn tone", () => {
    expect(streamReconnectBanner("blip").tone).toBe("warn")
    expect(streamCaughtUpBanner().message).toContain("reconnected")
  })
})
