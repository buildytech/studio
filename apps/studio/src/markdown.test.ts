import { beforeAll, describe, expect, test } from "bun:test"
import { JSDOM } from "jsdom"

beforeAll(() => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>")
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: dom.window,
  })
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: dom.window.document,
  })
  Object.defineProperty(globalThis, "HTMLAnchorElement", {
    configurable: true,
    value: dom.window.HTMLAnchorElement,
  })
  Object.defineProperty(globalThis, "HTMLElement", {
    configurable: true,
    value: dom.window.HTMLElement,
  })
})

describe("renderMarkdown XSS vectors", () => {
  test("strips script tags", async () => {
    const { renderMarkdown } = await import("./markdown")
    const html = renderMarkdown("Hello <script>alert(1)</script> world")
    expect(html.toLowerCase()).not.toContain("<script")
    expect(html).toContain("Hello")
  })

  test("strips inline event handlers", async () => {
    const { renderMarkdown } = await import("./markdown")
    const html = renderMarkdown('<img src=x onerror="alert(1)">')
    expect(html.toLowerCase()).not.toContain("onerror")
  })

  test("neutralizes javascript: links", async () => {
    const { renderMarkdown } = await import("./markdown")
    const html = renderMarkdown("[x](javascript:alert(1))")
    expect(html.toLowerCase()).not.toContain("javascript:")
  })

  test("external http links get noopener noreferrer", async () => {
    const { renderMarkdown } = await import("./markdown")
    const html = renderMarkdown("[docs](https://example.com)")
    expect(html).toContain("noopener")
    expect(html).toContain("noreferrer")
    expect(html).toContain('target="_blank"')
  })
})

describe("renderMarkdown Mermaid fences", () => {
  test("promotes mermaid fence to pre.mermaid and escapes markup", async () => {
    const { renderMarkdown, normalizeMermaidSource } = await import("./markdown")
    expect(normalizeMermaidSource("A<br/>B")).toBe("A\nB")

    const fence = ["```mermaid", "flowchart TB", 'A["x<br/>y"]', "```"].join(
      "\n",
    )
    const html = renderMarkdown(fence)
    expect(html).toContain('class="mermaid"')
    expect(html).not.toContain("language-mermaid")
    expect(html).toContain("flowchart TB")
    expect(html).toContain("x\ny")
    expect(html.toLowerCase()).not.toContain("<br")
    expect(html.toLowerCase()).not.toContain("<script")
  })

  test("non-mermaid fences stay as code blocks", async () => {
    const { renderMarkdown } = await import("./markdown")
    const html = renderMarkdown(["```ts", "const x = 1", "```"].join("\n"))
    expect(html).toContain('class="language-ts"')
    expect(html).not.toContain('class="mermaid"')
  })

  test("hydrateMermaid soft-fails without throwing", async () => {
    const { hydrateMermaid } = await import("./markdown")
    const root = document.createElement("div")
    root.innerHTML = `<pre class="mermaid">flowchart TB\nA--&gt;B</pre>`
    await hydrateMermaid(root, {
      load: async () => {
        throw new Error("mermaid unavailable")
      },
    })
    const node = root.querySelector("pre.mermaid")
    expect(node?.classList.contains("mermaid-error")).toBe(true)
    expect(node?.getAttribute("data-mermaid-done")).toBe("error")
  })

  test("hydrateMermaid no-ops when no fences", async () => {
    const { hydrateMermaid } = await import("./markdown")
    const root = document.createElement("div")
    root.innerHTML = `<p>plain</p>`
    await hydrateMermaid(root, {
      load: async () => {
        throw new Error("should not load")
      },
    })
    expect(root.innerHTML).toContain("<p>plain</p>")
  })
})
