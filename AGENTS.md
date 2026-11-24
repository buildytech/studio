# AGENTS.md — buildytech/studio

- UI8Kit rules: [ui8kit/contract](https://github.com/ui8kit/contract) `AGENTS.md`, `.cursor/rules`, `.cursor/skills`
  (copied into `.cursor/`). The Studio is the **app layer**: no 8+4 / ui8px, but primitives with `tag` only (no bare
  tags), ARIA through primitive props, colors via tokens, Lucide icons, no inline `style`, texts from the dictionary.
- The host seam is a contract: change `packages/agent-contract/src/host.ts`, run `bun run gen:host-seam`, commit the
  JSON; hosts pin a commit and test against it.
- Done means `bun run verify` green and a clean `git diff`. Commits go to `main` (no PRs, no force pushes).
