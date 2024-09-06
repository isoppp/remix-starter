import { prisma } from '@/lib/prisma'
import { type AppRouter, createCaller } from '@/server/trpc'
import { createContextInner } from '@/server/trpc/context'
import type { inferProcedureInput } from '@trpc/server'

test('creates example record', async () => {
  const ctx = await createContextInner()
  const caller = createCaller(ctx)
  const input: inferProcedureInput<AppRouter['example']['create']> = {
    name: '1234',
  }

  const created = await caller.example.create(input)
  expect(
    await prisma.example.findUnique({
      where: {
        id: created.id,
      },
    }),
  ).not.toBeNull()
})
