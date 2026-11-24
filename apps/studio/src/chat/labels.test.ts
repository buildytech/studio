import { describe, expect, test } from "bun:test"
import {
  formatTokenCount,
  formatUsdCost,
  formatUsageLine,
  formatUsageTitle,
} from "./labels"

describe("usage formatting", () => {
  test("formatTokenCount", () => {
    expect(formatTokenCount(42)).toBe("42")
    expect(formatTokenCount(1_200)).toBe("1.2k")
    expect(formatTokenCount(12_000)).toBe("12k")
  })

  test("formatUsdCost", () => {
    expect(formatUsdCost(0)).toBe("$0")
    expect(formatUsdCost(0.0042)).toBe("$0.0042")
    expect(formatUsdCost(0.42)).toBe("$0.420")
    expect(formatUsdCost(1.5)).toBe("$1.50")
  })

  test("formatUsageLine includes cost when present", () => {
    expect(
      formatUsageLine({ tokensIn: 1200, tokensOut: 300 }),
    ).toBe("1.2k → 300")
    expect(
      formatUsageLine({ tokensIn: 1200, tokensOut: 300, costUsd: 0.04 }),
    ).toBe("1.2k → 300 · $0.040")
  })

  test("formatUsageTitle lists cache fields", () => {
    const title = formatUsageTitle({
      tokensIn: 10,
      tokensOut: 2,
      cacheReadTokens: 100,
      cacheWriteTokens: 5,
      costUsd: 0.01,
    })
    expect(title).toContain("cache read 100")
    expect(title).toContain("cache write 5")
    expect(title).toContain("cost $0.010")
  })
})
