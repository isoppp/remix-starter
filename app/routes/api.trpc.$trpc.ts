import { handler } from "@/server/trpc"
import type { LoaderFunction } from "@remix-run/node"

export const loader: LoaderFunction = ({ request }) => handler(request)

export const action = loader
