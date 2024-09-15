import type { MetaFunction } from '@remix-run/node'

export const meta: MetaFunction = () => {
  return [{ title: 'Login' }, { name: 'description', content: 'Login' }]
}
export default function Login() {
  return <div>Login</div>
}
