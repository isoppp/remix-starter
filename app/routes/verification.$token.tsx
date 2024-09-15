import { trpc } from '@/lib/trpcClient'
import type { MetaFunction } from '@remix-run/node'
import { useParams } from '@remix-run/react'

export const meta: MetaFunction = () => {
  return [{ title: 'Signup' }, { name: 'description', content: 'Signup' }]
}

export default function VerificationToken() {
  const params = useParams()
  const { data, isLoading } = trpc.auth.getVerification.useQuery({
    token: params.token ?? '',
  })
  const mutation = trpc.auth.registerUser.useMutation()

  if (isLoading || !data) return <div>loading...</div>

  const onSubmit = async (e) => {
    e.preventDefault()
    const res = await mutation.mutateAsync({
      token: data.token,
      otpToken: data.otpToken,
    })
    if (res.ok) alert('created')
  }

  return (
    <form onSubmit={onSubmit}>
      <input type='text' defaultValue={data.otpToken} />
      <button type='submit'>submit</button>
    </form>
  )
}
