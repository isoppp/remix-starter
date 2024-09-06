import { prisma } from "@/lib/prisma"
import { createContext } from "@/server/trpc/context"
import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import * as v from "valibot"
import { publicProcedure, router, t } from "./trpc"

const appRouter = router({
  hello: publicProcedure.query(() => "world"),
  exampleList: publicProcedure.query(async () => {
    return prisma.example.findMany()
  }),
  exampleCreate: publicProcedure
    .input(
      v.parser(
        v.object({
          name: v.pipe(v.string(), v.nonEmpty(), v.maxLength(4)),
        }),
      ),
    )
    .query(async ({ input }) => {
      return prisma.example.create({
        data: input,
      })
    }),
})

export type AppRouter = typeof appRouter

export const handler = (request: Request, endpoint = "/api/trpc") =>
  fetchRequestHandler({
    endpoint,
    req: request,
    router: appRouter,
    createContext,
  })

const createCaller = t.createCallerFactory(appRouter)
export const createTrpcServer = (req: Request, resHeaders: Headers) =>
  createCaller(() => createContext({ req, resHeaders }))

export const createInternalTrpcServer = (req: Request) => createCaller(() => createContext({ req }))
