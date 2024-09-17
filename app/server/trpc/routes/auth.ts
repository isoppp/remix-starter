import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { AUTH_KEY, authSessionStorage } from '@/server/cookie-session/auth-session.server'
import { VERIFICATION_KEY, verificationSessionStorage } from '@/server/cookie-session/verification-session.server'
import { createTRPCRouter, publicProcedure } from '@/server/trpc/trpc'
import { generateRandomURLString } from '@/server/utils/auth.server'
import { addMinutes, isBefore } from 'date-fns'
import * as v from 'valibot'

export const authRouter = createTRPCRouter({
  signupWithEmail: publicProcedure
    .input(
      v.parser(
        v.object({
          email: v.pipe(v.string(), v.email()),
        }),
      ),
    )
    .mutation(async ({ input, ctx }) => {
      const existingUser = await prisma.user.findUnique({
        where: {
          email: input.email,
        },
      })

      // Don't send any detailed message but may be good to send sign-in email instead.
      if (existingUser) {
        return { ok: true }
      }

      const created = await prisma.verification.create({
        data: {
          type: 'email',
          token: generateRandomURLString(128),
          expiresAt: addMinutes(new Date(), 5),
          to: input.email,
        },
      })
      console.log('please signup via', `${env.APP_URL}/signup/verification/${created.token}`)

      const session = await verificationSessionStorage.getSession(ctx.req.headers.get('Cookie'))
      session.set(VERIFICATION_KEY, input.email)
      ctx.resHeaders.append('Set-Cookie', await verificationSessionStorage.commitSession(session))
      return { ok: true }
    }),
  signInWithEmail: publicProcedure
    .input(
      v.parser(
        v.object({
          email: v.pipe(v.string(), v.email()),
        }),
      ),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await prisma.user.findUnique({
        where: {
          email: input.email,
        },
      })

      if (!user) return { ok: true }

      const created = await prisma.verification.create({
        data: {
          type: 'email',
          token: generateRandomURLString(128),
          expiresAt: addMinutes(new Date(), 5),
          to: input.email,
        },
      })

      console.log('please signin via', `${env.APP_URL}/signin/verification/${created.token}`)

      const session = await verificationSessionStorage.getSession(ctx.req.headers.get('Cookie'))
      session.set(VERIFICATION_KEY, input.email)
      ctx.resHeaders.append('Set-Cookie', await verificationSessionStorage.commitSession(session))
      return { ok: true }
    }),
  signInVerification: publicProcedure
    .input(
      v.parser(
        v.object({
          token: v.pipe(v.string(), v.minLength(1)),
        }),
      ),
    )
    .mutation(async ({ input, ctx }) => {
      const vSession = await verificationSessionStorage.getSession(ctx.req.headers.get('Cookie'))
      const email = vSession.get(VERIFICATION_KEY)
      if (!email) {
        return { ok: false }
      }

      const res = await prisma.$transaction(async (prisma) => {
        const verification = await prisma.verification.findUnique({
          where: {
            to: email,
            token: input.token,
          },
        })

        if (!verification) {
          return { ok: false }
        }

        const updatedVerification = await prisma.verification.update({
          where: {
            id: verification.id,
          },
          data: {
            attempt: {
              increment: 1,
            },
          },
        })
        const attemptExceeded = updatedVerification.attempt > 3

        if (attemptExceeded) {
          return { ok: false, attemptExceeded }
        }

        if (verification.usedAt) {
          return { ok: false, attemptExceeded }
        }

        await prisma.verification.update({
          where: {
            id: verification.id,
          },
          data: {
            usedAt: new Date(),
          },
        })

        const user = await prisma.user.findUnique({
          where: {
            email: email,
          },
        })

        return user ? { ok: true, user } : { ok: false, attemptExceeded }
      })

      if (!res.user || !res.ok) return { ok: false, attemptExceeded: res.attemptExceeded }

      const session = await authSessionStorage.getSession(ctx.req.headers.get('Cookie'))
      session.set(AUTH_KEY, res.user.id)
      ctx.resHeaders.append('Set-Cookie', await authSessionStorage.commitSession(session))
      ctx.resHeaders.append('Set-Cookie', await verificationSessionStorage.destroySession(vSession))
      return { ok: true }
    }),
  signUpVerification: publicProcedure
    .input(
      v.parser(
        v.object({
          token: v.pipe(v.string(), v.minLength(1)),
        }),
      ),
    )
    .mutation(async ({ input, ctx }) => {
      const session = await verificationSessionStorage.getSession(ctx.req.headers.get('Cookie'))
      const email = session.get(VERIFICATION_KEY)
      if (!email) {
        return { ok: false, attemptExceeded: false }
      }

      const txRes = await prisma.$transaction(async (prisma) => {
        const verification = await prisma.verification.findUnique({
          where: {
            to: email,
            token: input.token,
          },
        })

        if (!verification) {
          return { ok: false, attemptExceeded: false }
        }

        const updatedVerification = await prisma.verification.update({
          where: {
            id: verification.id,
          },
          data: {
            attempt: {
              increment: 1,
            },
          },
        })
        const attemptExceeded = updatedVerification.attempt > 3

        if (attemptExceeded) {
          return { ok: false, attemptExceeded }
        }

        if (verification.usedAt) {
          return { ok: false, attemptExceeded }
        }

        if (isBefore(verification.expiresAt, new Date())) {
          return { ok: false, attemptExceeded }
        }

        await prisma.verification.update({
          where: {
            id: verification.id,
          },
          data: {
            usedAt: new Date(),
          },
        })

        const existing = await prisma.user.findUnique({
          where: {
            email: verification.to,
          },
        })
        if (existing) {
          return { ok: false, attemptExceeded }
        }
        await prisma.user.create({
          data: {
            email: verification.to,
          },
        })

        return {
          ok: true,
        }
      })

      if (!txRes.ok) return txRes

      ctx.resHeaders.append('Set-Cookie', await verificationSessionStorage.destroySession(session))
      return {
        ok: true,
      }
    }),
})
