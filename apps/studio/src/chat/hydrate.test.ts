import { describe, expect, test } from "bun:test"

/** Mirrors ChatPanel.hydrateFromServer mapping (S2.3). */
function mapTranscript(
  transcript: Array<{
    id: string
    role: "user" | "assistant"
    content: string
    runId: string | null
    feedback?: "up" | "down"
  }>,
) {
  return transcript.map((m) => ({
    id: `srv-${m.id}`,
    role: m.role,
    text: m.content,
    streaming: false as const,
    ...(m.runId ? { runId: m.runId } : {}),
    ...(m.feedback === "up" || m.feedback === "down"
      ? { feedback: m.feedback }
      : {}),
  }))
}

describe("hydrateFromServer mapping (S2.3)", () => {
  test("server transcript wins shape with runId", () => {
    const hydrated = mapTranscript([
      {
        id: "m1",
        role: "user",
        content: "hi",
        runId: null,
      },
      {
        id: "m2",
        role: "assistant",
        content: "hello",
        runId: "run-9",
      },
    ])
    expect(hydrated).toEqual([
      { id: "srv-m1", role: "user", text: "hi", streaming: false },
      {
        id: "srv-m2",
        role: "assistant",
        text: "hello",
        streaming: false,
        runId: "run-9",
      },
    ])
  })

  test("restores latched feedback so 👍/👎 is not offered again", () => {
    const hydrated = mapTranscript([
      {
        id: "m2",
        role: "assistant",
        content: "done",
        runId: "run-1",
        feedback: "up",
      },
    ])
    expect(hydrated[0]).toMatchObject({
      runId: "run-1",
      feedback: "up",
    })
  })
})
