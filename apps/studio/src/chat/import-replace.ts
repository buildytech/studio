/** True when Import should retire the current empty tab after creating a new session. */
export function shouldReplaceEmptySession(opts: {
  sessionId: string | null | undefined
  messageCount: number
  agentRunning: boolean
}): boolean {
  return (
    Boolean(opts.sessionId)
    && opts.messageCount === 0
    && !opts.agentRunning
  )
}
