import { HOST_SEAM_PREFIX } from "@buildy/agent-contract"
import { HttpHostClient, type HostClient, type HostTransportConfig } from "./host-client"

export { HttpHostClient, type HostClient, type HostTransportConfig } from "./host-client"
export { readAgentEventStream, SSE_MAX_BUFFER_BYTES } from "./sse"
export * from "./types"

/**
 * The build's HostClient: same origin by default (the desktop host serves the bundle and answers `/runtime/v1`);
 * `VITE_API_URL` points a dev server or a cloud build at another seam root.
 */
export function createHostClient(config: Partial<HostTransportConfig> = {}): HostClient {
  const baseUrl = config.baseUrl ?? (import.meta.env?.VITE_API_URL || HOST_SEAM_PREFIX)
  return new HttpHostClient({ ...config, baseUrl })
}
