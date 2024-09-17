import { authSessionStorage } from '@/server/cookie-session/auth-session.server'
import { commitMultipleSessions } from '@/server/cookie-session/commit-multiple-session'
import { type LoaderFunctionArgs, type MetaFunction, redirect } from '@remix-run/node'

export const meta: MetaFunction = () => {
  return [{ title: 'Logout' }, { name: 'description', content: 'Logout' }]
}

export const loader = async (ctx: LoaderFunctionArgs) => {
  const session = await authSessionStorage.getSession(ctx.request.headers.get('Cookie'))
  return redirect('/signin', {
    headers: {
      'Set-Cookie': await commitMultipleSessions(authSessionStorage.destroySession(session)),
    },
  })
}

export default function Signout() {
  return <div>Logout</div>
}
