/**
 * DOM tests (*.dom.test.tsx): Solid JSX compiled by babel-preset-solid for the DOM, run in happy-dom.
 * Loaded by `bun test --preload ./test/dom-setup.ts --conditions browser`.
 */
import { plugin } from "bun"
import { GlobalRegistrator } from "@happy-dom/global-registrator"

GlobalRegistrator.register()

plugin({
  name: "solid-jsx",
  setup(build) {
    build.onLoad({ filter: /\.tsx$/ }, async ({ path }) => {
      const { transformAsync } = await import("@babel/core")
      const source = await Bun.file(path).text()
      const out = await transformAsync(source, {
        filename: path,
        presets: [["babel-preset-solid", { generate: "dom" }], ["@babel/preset-typescript", { isTSX: true, allExtensions: true }]],
      })
      return { contents: out?.code ?? "", loader: "js" }
    })
  },
})
