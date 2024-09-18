import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { AUTH_KEY, authSessionStorage } from '@/server/cookie-session/auth-session.server'
import { TRPCError, initTRPC } from '@trpc/server'

export async function createContext({
  req,
  resHeaders,
}: {
  req: Request
  resHeaders: Headers
}) {
  return { req, resHeaders, user: null }
}

export type Context = Awaited<ReturnType<typeof createContext>>

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
export const t = initTRPC.context<Context>().create({
  errorFormatter({ shape }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
  isDev: env.APP_ENV === 'local',
})

/** Reusable middleware that enforces users are logged in before running the procedure. */
const enforceUserIsAuthed = t.middleware(async ({ ctx, next }) => {
  const session = await authSessionStorage.getSession(ctx.req.headers.get('Cookie'))
  const sessionId = session.get(AUTH_KEY)

  if (!sessionId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  const sessionData = await prisma.session.findUnique({ where: { id: sessionId }, select: { id: true, user: true } })

  if (!sessionData?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  return next({
    ctx: {
      ...ctx,
      user: sessionData.user,
    },
  })
})

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed)

export const createTRPCRouter = t.router

export async function createContextInner() {
  return {}
}

export function createInternalContext({
  req,
}: {
  req: Request
}) {
  return { req }
}

export type InternalContext = Awaited<ReturnType<typeof createInternalContext>>
