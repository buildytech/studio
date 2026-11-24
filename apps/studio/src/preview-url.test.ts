import { describe, expect, test } from "bun:test"
import { previewUrlWithoutGrant } from "./api"

describe("previewUrlWithoutGrant", () => {
  test("strips the short-lived grant query and keeps other params", () => {
    const raw =
      "https://proj.preview.localhost/?__buildy_grant=abc.def&theme=dark#main"
    expect(previewUrlWithoutGrant(raw)).toBe(
      "https://proj.preview.localhost/?theme=dark#main",
    )
  })

  test("is a no-op when no grant is present", () => {
    const clean = "https://proj.preview.localhost/"
    expect(previewUrlWithoutGrant(clean)).toBe(clean)
  })
})
