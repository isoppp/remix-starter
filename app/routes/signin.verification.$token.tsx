import { trpc } from '@/lib/trpcClient'
import type { MetaFunction } from '@remix-run/node'
import { useNavigate, useParams } from '@remix-run/react'

export const meta: MetaFunction = () => {
  return [{ title: 'Signup' }, { name: 'description', content: 'Signup' }]
}

export default function VerificationToken() {
  const params = useParams()
  const navigate = useNavigate()
  const mutation = trpc.auth.signInVerification.useMutation()

  const onSubmit = async (e) => {
    e.preventDefault()
    const res = await mutation.mutateAsync({ token: params.token })
    if (res.ok) {
      console.log('signin success!')
      navigate('/authenticated-example')
    } else {
      console.log('failed to signin')
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <button type='submit'>submit</button>
    </form>
  )
}
