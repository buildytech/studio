import { createContext, useContext, type JSX } from "solid-js"
import type { HostClient } from "./host-client"

const HostContext = createContext<HostClient>()

/** Provides the HostClient to the tree (dependency injection; tests pass a fake). */
export function HostProvider(props: { client: HostClient; children: JSX.Element }): JSX.Element {
  return <HostContext.Provider value={props.client}>{props.children}</HostContext.Provider>
}

/** The HostClient of the nearest HostProvider. */
export function useHost(): HostClient {
  const client = useContext(HostContext)
  if (!client) throw new Error("useHost: no HostProvider above this component")
  return client
}
