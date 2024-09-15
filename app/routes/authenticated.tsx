import type { MetaFunction } from '@remix-run/node'

export const meta: MetaFunction = () => {
  return [{ title: 'Authenticated' }, { name: 'description', content: 'Authenticated' }]
}
export default function Authenticated() {
  return <div>Authenticated</div>
}
