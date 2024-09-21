import { commitVerificationSessionWithValue } from '@/.server/cookie-session/verification-session'
import type { Context } from '@/.server/trpc/trpc'
import { generateRandomURLString } from '@/.server/utils/auth.server'
import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'
import { addMinutes } from 'date-fns'
import * as v from 'valibot'

export const signInWithEmailSchema = v.object({
  email: v.pipe(v.string(), v.email()),
})

type UseCaseArgs = {
  input: v.InferInput<typeof signInWithEmailSchema>
  ctx: Context
}
export const signInWithEmailUsecase = async ({ ctx, input }: UseCaseArgs): Promise<{ ok: true }> => {
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
}
