import { prisma } from '@/lib/prisma'
import { VERIFICATION_KEY, verificationSessionStorage } from '@/server/cookie-session/verification-session.server'
import { createTRPCRouter, publicProcedure } from '@/server/trpc/trpc'
import { generateRandomNumberString, generateRandomURLString } from '@/server/utils/auth.server'
import { TRPCError } from '@trpc/server'
import { addMinutes, isBefore } from 'date-fns'
import * as v from 'valibot'

export const authRouter = createTRPCRouter({
  getVerification: publicProcedure.query(async ({ ctx }) => {
    const session = await verificationSessionStorage.getSession(ctx.req.headers.get('Cookie'))
    const token = session.get(VERIFICATION_KEY)

    if (!token) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'unauthorized access',
      })
    }

    return prisma.verification.findUnique({
      where: {
        token,
      },
    })
  }),
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
          token: generateRandomURLString(),
          otpToken: generateRandomNumberString(),
          expiresAt: addMinutes(new Date(), 5),
          to: input.email,
        },
      })
      console.log('TODO send email: OTP = ', created.otpToken)

      const session = await verificationSessionStorage.getSession(ctx.req.headers.get('Cookie'))
      session.set(VERIFICATION_KEY, created.token)
      ctx.resHeaders.append('Set-Cookie', await verificationSessionStorage.commitSession(session))
      return created
    }),
  registerUser: publicProcedure
    .input(
      v.parser(
        v.object({
          token: v.pipe(v.string(), v.minLength(1)),
          otpToken: v.pipe(v.string(), v.minLength(1)),
        }),
      ),
    )
    .mutation(async ({ input, ctx }) => {
      console.log(input)
      await prisma
        .$transaction(async (prisma) => {
          const verification = await prisma.verification.findUnique({
            where: {
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
