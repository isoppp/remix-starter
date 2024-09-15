import { handler } from '@/server/trpc'
import type { ActionFunction, LoaderFunction } from '@remix-run/node'

export const loader: LoaderFunction = (args) => {
  return handler(args.request)
}

export const action: ActionFunction = (args) => {
  return handler(args.request)
}
