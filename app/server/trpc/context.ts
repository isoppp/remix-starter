export async function createContextInner() {
  return {}
}

export async function createContext({
  req,
  resHeaders,
}: {
  req: Request
  resHeaders: Headers
}) {
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
