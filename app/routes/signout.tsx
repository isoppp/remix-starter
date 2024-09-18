import { prisma } from '@/lib/prisma'
import { AUTH_KEY, authSessionStorage } from '@/server/cookie-session/auth-session.server'
import { type LoaderFunctionArgs, type MetaFunction, redirect } from '@remix-run/node'

export const meta: MetaFunction = () => {
  return [{ title: 'Logout' }, { name: 'description', content: 'Logout' }]
}

export const loader = async (ctx: LoaderFunctionArgs) => {
  const session = await authSessionStorage.getSession(ctx.request.headers.get('Cookie'))
  const sessionId = session.get(AUTH_KEY)
  await prisma.session.delete({ where: { id: sessionId } })
  return redirect('/signin', {
    headers: {
      'Set-Cookie': await authSessionStorage.destroySession(session),
    },
  })
}

export default function Signout() {
  return <div>Logout</div>
}
