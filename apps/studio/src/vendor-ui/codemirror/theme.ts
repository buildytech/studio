import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { EditorView } from "@codemirror/view"
import { tags as t } from "@lezer/highlight"
import "./syntax.css"

/** Editor chrome on the Studio tokens: follows the light / dark mode and the skin (ADR 0007). */
export const studioEditorTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      fontSize: "0.78rem",
      backgroundColor: "var(--bg)",
      color: "var(--text)",
    },
    ".cm-scroller": {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      lineHeight: "1.45",
    },
    ".cm-content": {
      caretColor: "var(--brand)",
      padding: "0.5rem 0",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--brand)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "color-mix(in srgb, var(--brand) 22%, transparent) !important",
      },
    ".cm-activeLine": {
      backgroundColor: "color-mix(in srgb, var(--foreground) 3%, transparent)",
    },
    ".cm-gutters": {
      backgroundColor: "var(--bg-elevated)",
      color: "var(--text-muted)",
      border: "none",
      borderRight: "1px solid var(--border)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "color-mix(in srgb, var(--foreground) 4%, transparent)",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "var(--panel-muted)",
      border: "none",
      color: "var(--text-muted)",
    },
    ".cm-tooltip": {
      backgroundColor: "var(--panel)",
      border: "1px solid var(--border)",
      color: "var(--text)",
    },
  },
)

/** Syntax palette: the --syn-* tokens of ./syntax.css (a dark and a light set, AA on the editor). */
const studioHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "var(--syn-keyword)" },
  { tag: t.operator, color: "var(--syn-operator)" },
  { tag: t.special(t.variableName), color: "var(--syn-special)" },
  { tag: t.typeName, color: "var(--syn-type)" },
  { tag: t.className, color: "var(--syn-type)" },
  { tag: t.propertyName, color: "var(--syn-property)" },
  { tag: t.variableName, color: "var(--syn-variable)" },
  { tag: t.definition(t.variableName), color: "var(--syn-variable)" },
  { tag: t.function(t.variableName), color: "var(--syn-function)" },
  { tag: t.string, color: "var(--syn-string)" },
  { tag: t.special(t.string), color: "var(--syn-string)" },
  { tag: t.number, color: "var(--syn-number)" },
  { tag: t.bool, color: "var(--syn-number)" },
  { tag: t.null, color: "var(--syn-number)" },
  { tag: t.comment, color: "var(--syn-comment)", fontStyle: "italic" },
  { tag: t.meta, color: "var(--syn-meta)" },
  { tag: t.tagName, color: "var(--syn-keyword)" },
  { tag: t.attributeName, color: "var(--syn-type)" },
  { tag: t.attributeValue, color: "var(--syn-string)" },
  { tag: t.heading, color: "var(--syn-special)", fontWeight: "bold" },
  { tag: t.link, color: "var(--syn-function)" },
  { tag: t.url, color: "var(--syn-function)" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.invalid, color: "var(--syn-invalid)" },
])

export const studioSyntaxHighlighting = syntaxHighlighting(studioHighlight)
