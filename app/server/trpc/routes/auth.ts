import { prisma } from '@/lib/prisma'
import { createTRPCRouter, publicProcedure } from '@/server/trpc/trpc'
import { generateRandomNumberString, generateRandomURLString } from '@/server/utils/auth.server'
import { TRPCError } from '@trpc/server'
import { addMinutes, isBefore } from 'date-fns'
import * as v from 'valibot'

export const authRouter = createTRPCRouter({
  getVerification: publicProcedure
    .input(
      v.parser(
        v.object({
          token: v.string(),
        }),
      ),
    )
    .query(async ({ input }) => {
      return prisma.verification.findUnique({
        where: {
          token: input.token,
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
    .mutation(async ({ input }) => {
      // TODO how to handle exsing user
      // if response something attacker can guess whether user is already registered

      const created = await prisma.verification.create({
        data: {
          type: 'email',
          token: generateRandomURLString(),
          otpToken: generateRandomNumberString(),
          expiresAt: addMinutes(new Date(), 5),
          to: input.email,
        },
      })
      console.log(created)
      console.log('TODO send email: OTP = ', created.otpToken)
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
    .mutation(async ({ input }) => {
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
          await prisma.user.create({
            data: {
              email: verification.to,
            },
          })
        })
        .catch((error) => {
          throw error
        })

      return {
        ok: true,
      }
    }),
})
