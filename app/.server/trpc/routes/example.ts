import { createTRPCRouter, publicProcedure } from '@/.server/trpc/trpc'
import { prisma } from '@/lib/prisma'
import * as v from 'valibot'

export const exampleRouter = createTRPCRouter({
  hello: publicProcedure.query(() => 'world'),
  list: publicProcedure.query(async () => {
    return prisma.example.findMany()
  }),
  create: publicProcedure
    .input(
      v.parser(
        v.object({
          name: v.pipe(v.string(), v.nonEmpty(), v.maxLength(4)),
        }),
      ),
    )
    .mutation(async ({ input }) => {
      return prisma.example.create({
        data: input,
      })
    }),
})
