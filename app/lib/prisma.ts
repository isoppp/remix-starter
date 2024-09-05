import { env } from "@/lib/env"
import { PrismaClient } from "@prisma/client"

const getPrismaClient = () => {
  const prisma = new PrismaClient({
    log: env.APP_ENV !== "production" ? ["warn", "error"] : ["error", "warn"],
  })

  // @ts-ignore
  prisma.$on("query", (e: { duration: string }) => {
    console.log(`Query took: ${e.duration}ms`)
  })

  return prisma
}

declare global {
  var prisma: undefined | ReturnType<typeof getPrismaClient>
}

// biome-ignore lint/suspicious/noRedeclare: <explanation>
export const prisma = globalThis.prisma ?? getPrismaClient()

if (env.APP_ENV !== "production") globalThis.prisma = prisma // HMR
