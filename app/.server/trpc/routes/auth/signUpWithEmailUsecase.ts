import { commitVerificationSessionWithValue } from '@/.server/cookie-session/verification-session'
import type { Context } from '@/.server/trpc/trpc'
import { generateRandomURLString } from '@/.server/utils/auth.server'
import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { addMinutes } from 'date-fns'
import * as v from 'valibot'

export const signUpWithEmailSchema = v.object({
  email: v.pipe(v.string(), v.email()),
})

type UseCaseArgs = {
  input: v.InferInput<typeof signUpWithEmailSchema>
  ctx: Context
}
export const signUpWithEmailUsecase = async ({ ctx, input }: UseCaseArgs): Promise<{ ok: true }> => {
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

  // TODO send email
  console.log('please signup via', `${env.APP_URL}/signup/verification/${created.token}`)

  ctx.resHeaders.append('Set-Cookie', await commitVerificationSessionWithValue(ctx.req, input.email))

  return { ok: true }
}
