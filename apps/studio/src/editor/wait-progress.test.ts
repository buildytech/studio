import { describe, expect, test } from "bun:test"
import { formatElapsed } from "./wait-progress"

describe("formatElapsed", () => {
  test("renders whole seconds as m:ss", () => {
    expect(formatElapsed(0)).toBe("0:00")
    expect(formatElapsed(9)).toBe("0:09")
    expect(formatElapsed(35)).toBe("0:35")
    expect(formatElapsed(60)).toBe("1:00")
    expect(formatElapsed(90)).toBe("1:30")
    expect(formatElapsed(125)).toBe("2:05")
  })

  test("floors fractions and clamps invalid values", () => {
    expect(formatElapsed(1.9)).toBe("0:01")
    expect(formatElapsed(-4)).toBe("0:00")
    expect(formatElapsed(Number.NaN)).toBe("0:00")
  })
})
