import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { HOST_SEAM_JSON_PATH, hostSeamJson } from "./host-seam"

describe("host-seam.json", () => {
  test("is up to date with agent-contract host.ts (run `bun run gen:host-seam`)", () => {
    const committed = readFileSync(join(import.meta.dir, "..", "..", HOST_SEAM_JSON_PATH), "utf8")
    expect(committed).toBe(hostSeamJson())
  })
})
