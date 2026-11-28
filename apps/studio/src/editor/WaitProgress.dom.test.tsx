import { describe, expect, test } from "bun:test"
import { render } from "solid-js/web"
import { WaitProgress } from "./WaitProgress"

function mount(el: () => import("solid-js").JSX.Element): HTMLElement {
  const host = document.createElement("div")
  document.body.append(host)
  render(el, host)
  return host
}

describe("WaitProgress", () => {
  test("shows the step, elapsed time and an indeterminate progress, without inline styles", () => {
    const host = mount(() => (
      <WaitProgress
        title="Importing the ZIP"
        step="Uploading and unpacking the project"
        hint="A Go template usually takes about half a minute."
        startedAt={Date.now() - 72_000}
      />
    ))
    expect(host.querySelector("[style]")).toBeNull()
    expect(host.querySelector(".ws-wait")?.getAttribute("role")).toBe("status")
    expect(host.querySelector(".ws-wait")?.getAttribute("aria-busy")).toBe("true")
    expect(host.querySelector(".ws-wait-title")?.textContent).toBe("Importing the ZIP")
    expect(host.querySelector(".ws-wait-step")?.textContent).toBe("Uploading and unpacking the project")
    expect(host.querySelector(".ws-wait-hint")?.textContent).toContain("half a minute")
    expect(host.querySelector(".ws-wait-elapsed")?.textContent).toBe("Elapsed 1:12")
    expect(host.querySelector("progress")).not.toBeNull()
    expect(host.querySelector("progress")?.hasAttribute("value")).toBe(false)
    expect(host.querySelector(".ws-wait-bar-fill")).not.toBeNull()
  })
})
