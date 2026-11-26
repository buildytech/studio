import { ApiError } from "../chat/banner"
import type { HostClient } from "../host/host-client"

export type ArchiveResult = { kind: "saved"; file?: string } | { kind: "canceled" } | { kind: "browser" }

/**
 * The project's ZIP. In the desktop app the app saves it (its Save dialog; the webviews do not all save downloads);
 * anywhere else (404 for the desktop route) the browser downloads the route after a check, so a refusal such as
 * "too large" comes back as an error here, not as a JSON page in the window.
 */
export async function downloadArchive(
  host: Pick<HostClient, "desktopSaveArchive" | "projectArchiveCheck" | "projectArchiveUrl">,
  projectId: string,
  navigate: (url: string) => void,
): Promise<ArchiveResult> {
  try {
    const r = await host.desktopSaveArchive({ projectId })
    return r.saved ? { kind: "saved", file: r.file } : { kind: "canceled" }
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 404) throw e
  }
  await host.projectArchiveCheck(projectId)
  navigate(host.projectArchiveUrl(projectId))
  return { kind: "browser" }
}
