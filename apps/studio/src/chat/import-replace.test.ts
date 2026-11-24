import { describe, expect, test } from "bun:test"
import { shouldReplaceEmptySession } from "./import-replace"

describe("shouldReplaceEmptySession", () => {
  test("empty idle tab is replaced", () => {
    expect(
      shouldReplaceEmptySession({
        sessionId: "ses_1",
        messageCount: 0,
        agentRunning: false,
      }),
    ).toBe(true)
  })

  test("non-empty or running tab is kept", () => {
    expect(
      shouldReplaceEmptySession({
        sessionId: "ses_1",
        messageCount: 2,
        agentRunning: false,
      }),
    ).toBe(false)
    expect(
      shouldReplaceEmptySession({
        sessionId: "ses_1",
        messageCount: 0,
        agentRunning: true,
      }),
    ).toBe(false)
    expect(
      shouldReplaceEmptySession({
        sessionId: null,
        messageCount: 0,
        agentRunning: false,
      }),
    ).toBe(false)
  })
})
