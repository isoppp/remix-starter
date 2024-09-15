import { trpc } from '@/lib/trpcClient'
import type { MetaFunction } from '@remix-run/node'
import { useNavigate } from '@remix-run/react'

export const meta: MetaFunction = () => {
  return [{ title: 'Signup' }, { name: 'description', content: 'Signup' }]
}

export default function Signup() {
  const navigate = useNavigate()
  const mutation = trpc.auth.signupWithEmail.useMutation({
    onSuccess: async () => {
      console.log('success')
    },
  })
  const onSubmit = async (e) => {
    e.preventDefault()
    const res = await mutation.mutateAsync({ email: 'text@Example.com' })
    navigate(`/verification/${res.token}`)
  }
  return (
    <form onSubmit={onSubmit}>
      <input type='text' defaultValue={'test@example.com'} />
      <button type='submit'>submit</button>
    </form>
  )
}
