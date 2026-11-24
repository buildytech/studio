import { AgentEventSchema, type AgentEvent } from "@buildy/agent-contract"
import { ApiError } from "../chat/banner"

/** Max accumulated SSE bytes before a delimiter (Slice A / finding 4). */
export const SSE_MAX_BUFFER_BYTES = 1_048_576

/** Parse an SSE byte stream from the Agent Gateway into contract events. */
export async function* readAgentEventStream(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<AgentEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  try {
    while (true) {
      if (signal?.aborted) break
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      if (buffer.length > SSE_MAX_BUFFER_BYTES) {
        throw new ApiError(502, "Event stream: frame too large")
      }
      let sep: number
      while ((sep = buffer.indexOf("\n\n")) >= 0) {
        const chunk = buffer.slice(0, sep)
        buffer = buffer.slice(sep + 2)
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data:")) continue
          const raw = line.slice(5).trim()
          if (!raw || raw === "[DONE]") continue
          try {
            const json: unknown = JSON.parse(raw)
            const parsed = AgentEventSchema.safeParse(json)
            if (parsed.success) yield parsed.data
          } catch {
            /* drop malformed frames */
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
