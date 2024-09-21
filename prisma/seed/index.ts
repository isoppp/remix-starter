import { prisma } from '@/lib/prisma'

async function seed() {
  await prisma.user.create({
    data: {
      email: 'test@example.com',
    },
  })
  await prisma.user.create({
    data: {
      email: 'test2@example.com',
    },
  })
  await prisma.user.create({
    data: {
      email: 'test3@example.com',
    },
  })
  await prisma.example.create({
    data: {
      name: '1',
    },
  })
}

await seed()
