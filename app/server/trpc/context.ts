import type { NodeHTTPCreateContextOption } from "@trpc/server/adapters/node-http"
export function createContext({ req, resHeaders }: NodeHTTPCreateContextOption) {
  return { req, resHeaders }
}

export type Context = Awaited<ReturnType<typeof createContext>>

export function createInternalContext({
  req,
}: {
  req: Request
}) {
  return { req }
}

export type InternalContext = Awaited<ReturnType<typeof createInternalContext>>
