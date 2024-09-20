import {
  AUTH_SESSION_EXPIRATION_SEC,
  commitAuthSessionWithValue,
  destroyStrAuthSession,
  getAuthSessionId,
} from '@/.server/cookie-session/auth-session'
import {
  commitVerificationSessionWithValue,
  destroyStrVerificationSession,
  getVerificationSessionEmail,
} from '@/.server/cookie-session/verification-session'
import { createTRPCRouter, p } from '@/.server/trpc/trpc'
import { generateRandomURLString } from '@/.server/utils/auth.server'
import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'
import { addMinutes, addSeconds, isBefore } from 'date-fns'
import * as v from 'valibot'

export const authRouter = createTRPCRouter({
  isSignedIn: p.auth.query(async ({ ctx }) => {
    const sessionId = await getAuthSessionId(ctx.req)
    if (!sessionId) return { ok: false }

    const row = await prisma.session.findUnique({
      where: {
        id: sessionId,
      },
    })

    if (!row || isBefore(row?.expiresAt, new Date())) {
      ctx.resHeaders.append('Set-Cookie', await destroyStrAuthSession(ctx.req))
      return { ok: false }
    }

    return { ok: true }
  }),
  signupWithEmail: p.public
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

      ctx.resHeaders.append('Set-Cookie', await commitVerificationSessionWithValue(ctx.req, input.email))
      return { ok: true }
    }),
  signInWithEmail: p.public
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

      const hasValidVerification = await prisma.verification.findFirst({
        where: {
          to: input.email,
          expiresAt: {
            gte: new Date(),
          },
          attempt: {
            lte: 3,
          },
        },
      })

      if (hasValidVerification) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Email is already sent. Please check your email for verification',
        })
      }

      const created = await prisma.verification.create({
        data: {
          type: 'email',
          token: generateRandomURLString(128),
          expiresAt: addMinutes(new Date(), 5),
          to: input.email,
        },
      })

      console.log('please signin via', `${env.APP_URL}/signin/verification/${created.token}`)

      ctx.resHeaders.append('Set-Cookie', await commitVerificationSessionWithValue(ctx.req, input.email))
      return { ok: true }
    }),
  signInVerification: p.public
    .input(
      v.parser(
        v.object({
          token: v.pipe(v.string(), v.minLength(1)),
        }),
      ),
    )
    .mutation(async ({ input, ctx }) => {
      const email = await getVerificationSessionEmail(ctx.req)
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

        const createdUser = await prisma.user.findUnique({
          where: {
            email: email,
          },
        })

        if (!createdUser) return { ok: false, attemptExceeded }

        const createdSession = await prisma.session.create({
          data: {
            expiresAt: addSeconds(new Date(), AUTH_SESSION_EXPIRATION_SEC),
            userId: createdUser.id,
          },
        })

        return {
          ok: true,
          sessionId: createdSession.id,
        }
      })

      if (!res.ok) return { ok: false, attemptExceeded: res.attemptExceeded }

      ctx.resHeaders.append('Set-Cookie', await commitAuthSessionWithValue(ctx.req, res.sessionId))
      ctx.resHeaders.append('Set-Cookie', await destroyStrVerificationSession(ctx.req))
      return { ok: true }
    }),
  signUpVerification: p.public
    .input(
      v.parser(
        v.object({
          token: v.pipe(v.string(), v.minLength(1)),
        }),
      ),
    )
    .mutation(async ({ input, ctx }) => {
      const email = await getVerificationSessionEmail(ctx.req)
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
        const createdUser = await prisma.user.create({
          data: {
            email: verification.to,
          },
        })

        const createdSession = await prisma.session.create({
          data: {
            expiresAt: addSeconds(new Date(), AUTH_SESSION_EXPIRATION_SEC),
            userId: createdUser.id,
          },
        })

        return {
          ok: true,
          sessionId: createdSession.id,
        }
      })

      if (!txRes.ok) return txRes

      ctx.resHeaders.append('Set-Cookie', await commitAuthSessionWithValue(ctx.req, txRes.sessionId))
      ctx.resHeaders.append('Set-Cookie', await destroyStrVerificationSession(ctx.req))
      return {
        ok: true,
      }
    }),
})
