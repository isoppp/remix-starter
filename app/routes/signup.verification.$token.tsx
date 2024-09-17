import { trpc } from '@/lib/trpcClient'
import type { MetaFunction } from '@remix-run/node'
import { useParams } from '@remix-run/react'

export const meta: MetaFunction = () => {
  return [{ title: 'Signup' }, { name: 'description', content: 'Signup' }]
}

export default function VerificationToken() {
  const params = useParams()
  const mutation = trpc.auth.signUpVerification.useMutation()

  const onSubmit = async (e) => {
    e.preventDefault()
    const res = await mutation.mutateAsync({ token: params.token })
    if (res.ok) alert('created')
  }

  return (
    <form onSubmit={onSubmit}>
      <button type='submit'>submit</button>
    </form>
  )
}
