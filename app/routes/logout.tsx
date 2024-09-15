import type { MetaFunction } from '@remix-run/node'

export const meta: MetaFunction = () => {
  return [{ title: 'Logout' }, { name: 'description', content: 'Logout' }]
}
export default function Logout() {
  return <div>Logout</div>
}
