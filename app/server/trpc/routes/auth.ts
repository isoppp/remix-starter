import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { AUTH_KEY, authSessionStorage } from '@/server/cookie-session/auth-session.server'
import { VERIFICATION_KEY, verificationSessionStorage } from '@/server/cookie-session/verification-session.server'
import { createTRPCRouter, publicProcedure } from '@/server/trpc/trpc'
import { generateRandomURLString } from '@/server/utils/auth.server'
import { TRPCError } from '@trpc/server'
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
      // TODO how to handle exsing user
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
      return created
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

      const verification = await prisma.verification.findUnique({
        where: {
          to: email,
          token: input.token,
        },
      })

      if (!verification) {
        return { ok: false }
      }

      const user = await prisma.user.findUnique({
        where: {
          email: email,
        },
      })

      if (!user) return { ok: false }

      const session = await authSessionStorage.getSession(ctx.req.headers.get('Cookie'))
      session.set(AUTH_KEY, user.id)

      ctx.resHeaders.append('Set-Cookie', await authSessionStorage.commitSession(session))
      ctx.resHeaders.append('Set-Cookie', await verificationSessionStorage.destroySession(vSession))
      return { ok: true }
    }),
  registerUser: publicProcedure
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
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '',
        })
      }

      await prisma
        .$transaction(async (prisma) => {
          const verification = await prisma.verification.findUnique({
            where: {
              to: email,
              token: input.token,
            },
          })
          if (!verification) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Invalid token',
            })
          }

          if (verification.usedAt) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Token already used',
            })
          }

          if (isBefore(verification.expiresAt, new Date())) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Expired',
            })
          }

          const isValid = verification?.otpToken === input.otpToken
          if (!isValid) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
            })
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
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'User already exists',
            })
          }
          await prisma.user.create({
            data: {
              email: verification.to,
            },
          })

          const session = await verificationSessionStorage.getSession(ctx.req.headers.get('Cookie'))
          ctx.resHeaders.append('Set-Cookie', await verificationSessionStorage.destroySession(session))
        })
        .catch((error) => {
          throw error
        })

      return {
        ok: true,
      }
    }),
})
