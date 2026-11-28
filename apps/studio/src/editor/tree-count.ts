import type { WorkspaceTreeNode } from "../host/types"

/** Files in a project tree (folders do not count): 0 means the project is empty (the Empty template, before a ZIP). */
export function countTreeFiles(nodes: readonly WorkspaceTreeNode[]): number {
  let n = 0
  for (const node of nodes) {
    if (node.type === "file") n += 1
    if (node.children?.length) n += countTreeFiles(node.children)
  }
  return n
}
