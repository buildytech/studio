import { describe, expect, test } from "bun:test"
import { AgentEventSchema } from "@buildy/agent-contract"
import {
  ApiError,
  readAgentEventStream,
  SSE_MAX_BUFFER_BYTES,
} from "./api"

function streamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  let i = 0
  return new ReadableStream({
    pull(controller) {
      if (i >= chunks.length) {
        controller.close()
        return
      }
      controller.enqueue(enc.encode(chunks[i]!))
      i += 1
    },
  })
}

describe("readAgentEventStream (Slice A)", () => {
  test("yields schema-valid events and drops invalid JSON shapes", async () => {
    const good = {
      type: "message.delta",
      sessionId: "s1",
      role: "assistant",
      text: "hi",
    }
    const bad = { type: "message.delta", sessionId: "s1" } // missing role/text
    const body = streamFrom([
      `data: ${JSON.stringify(good)}\n\n`,
      `data: ${JSON.stringify(bad)}\n\n`,
      `data: not-json\n\n`,
    ])
    const events = []
    for await (const event of readAgentEventStream(body)) {
      events.push(event)
    }
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject(good)
    expect(AgentEventSchema.safeParse(events[0]).success).toBe(true)
  })

  test("throws when buffer exceeds cap without delimiter", async () => {
    const huge = "x".repeat(SSE_MAX_BUFFER_BYTES + 10)
    let err: unknown
    try {
      for await (const _ of readAgentEventStream(streamFrom([`data: ${huge}`]))) {
        /* drain */
      }
    } catch (cause) {
      err = cause
    }
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(502)
    expect((err as ApiError).message).toContain("too large")
  })
})
