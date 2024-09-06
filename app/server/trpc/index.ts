import { createContext, createInternalContext } from '@/server/trpc/context'
import { exampleRouter } from '@/server/trpc/routes/example'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { router, t } from './trpc'

const appRouter = router({
  example: exampleRouter,
})

export type AppRouter = typeof appRouter

export const handler = (request: Request, endpoint = '/api/trpc') =>
  fetchRequestHandler({
    endpoint,
    req: request,
    router: appRouter,
    createContext,
  })

export const createCaller = t.createCallerFactory(appRouter)

export const createInternalTrpcServer = (req: Request) => createCaller(() => createInternalContext({ req }))
