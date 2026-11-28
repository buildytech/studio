import { LanguageSupport, StreamLanguage, type StreamParser, type StringStream } from "@codemirror/language"
import { go } from "@codemirror/legacy-modes/mode/go"
import { html } from "@codemirror/legacy-modes/mode/xml"

/**
 * A templ grammar is not published for CodeMirror 6. This mode switches between
 * the legacy Go and HTML stream parsers: Go for the package preamble and for
 * `{ expressions }`, HTML for the markup inside `templ` / `css` / `script` bodies.
 */
type State = {
  mode: "go" | "markup"
  go: unknown
  html: unknown
  markupDepth: number
  interp: number
  pendingMarkup: boolean
  inGoHead: boolean
}

const openers = /^(templ|css|script)$/
const resetPending = /^(package|import|func|var|const|type|return|if|for|switch)$/

function copySub(parser: { copyState?: (state: unknown) => unknown }, state: unknown): unknown {
  return parser.copyState ? parser.copyState(state) : { ...(state as object) }
}

function startSub(parser: { startState?: (indentUnit: number) => unknown }): unknown {
  return parser.startState ? parser.startState(2) : {}
}

function tokenSub(
  parser: { token?: (stream: StringStream, state: unknown) => string | null },
  stream: StringStream,
  state: unknown,
): string | null {
  return parser.token ? parser.token(stream, state) : (stream.next(), null)
}

const templParser: StreamParser<State> = {
  startState() {
    return {
      mode: "go",
      go: startSub(go),
      html: startSub(html),
      markupDepth: 0,
      interp: 0,
      pendingMarkup: false,
      inGoHead: false,
    }
  },
  copyState(state) {
    return {
      mode: state.mode,
      go: copySub(go, state.go),
      html: copySub(html, state.html),
      markupDepth: state.markupDepth,
      interp: state.interp,
      pendingMarkup: state.pendingMarkup,
      inGoHead: state.inGoHead,
    }
  },
  token(stream, state) {
    if (state.mode === "go") {
      const style = tokenSub(go, stream, state.go)
      const cur = stream.current()
      if (openers.test(cur)) state.pendingMarkup = true
      else if (resetPending.test(cur) && cur !== "if" && cur !== "for" && cur !== "switch") {
        state.pendingMarkup = false
      }
      if (cur === "{" && state.pendingMarkup) {
        state.pendingMarkup = false
        state.mode = "markup"
        state.markupDepth = 1
      }
      return style
    }

    if (state.interp > 0) {
      if (stream.peek() === "}" && state.interp === 1) {
        stream.next()
        state.interp = 0
        return "bracket"
      }
      const style = tokenSub(go, stream, state.go)
      const cur = stream.current()
      if (cur === "{") state.interp += 1
      else if (cur === "}") state.interp -= 1
      return style
    }

    if (state.inGoHead) {
      if (stream.peek() === "{") {
        stream.next()
        state.inGoHead = false
        state.markupDepth += 1
        return "bracket"
      }
      return tokenSub(go, stream, state.go)
    }

    if (stream.eatSpace()) return null

    if (stream.sol() && stream.match(/^(else\s+if|else|if|for|switch|case|default)\b/)) {
      state.inGoHead = true
      return "keyword"
    }

    const peek = stream.peek()
    if (peek === "{") {
      stream.next()
      if (state.pendingMarkup) {
        state.pendingMarkup = false
        state.markupDepth += 1
        return "bracket"
      }
      state.interp = 1
      return "bracket"
    }
    if (peek === "}") {
      stream.next()
      state.markupDepth -= 1
      if (state.markupDepth <= 0) {
        state.markupDepth = 0
        state.mode = "go"
        state.pendingMarkup = false
        state.inGoHead = false
      }
      return "bracket"
    }

    return tokenSub(html, stream, state.html)
  },
  languageData: {
    commentTokens: { line: "//", block: { open: "/*", close: "*/" } },
  },
}

const templStream = StreamLanguage.define(templParser)

/** Language support for `.templ` files (Go + HTML). */
export function templLanguage(): LanguageSupport {
  return new LanguageSupport(templStream)
}
