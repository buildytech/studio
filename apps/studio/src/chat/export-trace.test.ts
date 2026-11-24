import { describe, expect, test } from "bun:test"
import {
  chatBundleChecksum,
  traceFromUiMessages,
  withExportTrace,
  type ExportableChatBundle,
} from "./export-trace"
import type { CachedChatMessage } from "../chat-store"

describe("export-trace", () => {
  test("traceFromUiMessages keeps finished thinking/tool only", () => {
    const messages: CachedChatMessage[] = [
      { id: "1", role: "user", text: "hi" },
      { id: "2", role: "thinking", text: "plan", streaming: true },
      {
        id: "3",
        role: "thinking",
        text: "done plan",
        runId: "r1",
        meta: { durationMs: 12 },
      },
      {
        id: "4",
        role: "tool",
        text: "edit",
        meta: { toolStatus: "running" },
      },
      {
        id: "5",
        role: "tool",
        text: "edit — a.ts",
        runId: "r1",
        meta: { toolStatus: "done" },
      },
      { id: "6", role: "assistant", text: "ok", runId: "r1" },
    ]
    expect(traceFromUiMessages(messages)).toEqual([
      {
        role: "thinking",
        text: "done plan",
        runId: "r1",
        meta: { durationMs: 12 },
      },
      {
        role: "tool",
        text: "edit — a.ts",
        runId: "r1",
        meta: { toolStatus: "done" },
      },
    ])
  })

  test("withExportTrace resigns checksum; empty/absent classic stays valid shape", async () => {
    const classic: ExportableChatBundle = {
      format: "buildy.chat.v1",
      exportedAt: "2026-07-20T00:00:00.000Z",
      projectId: "p1",
      session: { id: "s1", title: "T", runtime: "cursor-sdk" },
      messages: [
        { role: "user", text: "hi", createdAt: "t1", seq: 1 },
      ],
      checksum: "sha256:" + "0".repeat(64),
    }
    // Fix checksum to the real classic digest first.
    const classicSigned: ExportableChatBundle = {
      ...classic,
      checksum: await chatBundleChecksum({
        format: classic.format,
        exportedAt: classic.exportedAt,
        projectId: classic.projectId,
        session: classic.session,
        messages: classic.messages,
      }),
    }
    expect(classicSigned.trace).toBeUndefined()

    const traced = await withExportTrace(classicSigned, [
      { role: "thinking", text: "plan" },
    ])
    expect(traced.trace).toEqual([{ role: "thinking", text: "plan" }])
    expect(traced.checksum).not.toBe(classicSigned.checksum)
    expect(traced.checksum).toBe(
      await chatBundleChecksum({
        format: traced.format,
        exportedAt: traced.exportedAt,
        projectId: traced.projectId,
        session: traced.session,
        messages: traced.messages,
        trace: traced.trace,
      }),
    )
  })
})
