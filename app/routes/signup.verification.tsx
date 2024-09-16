import { trpc } from '@/lib/trpcClient'
import type { MetaFunction } from '@remix-run/node'
import { Link } from '@remix-run/react'

export const meta: MetaFunction = () => {
  return [{ title: 'Signup' }, { name: 'description', content: 'Signup' }]
}

export default function VerificationToken() {
  const { data, error, isLoading } = trpc.auth.getVerification.useQuery(undefined, {
    retry: false,
  })
  const mutation = trpc.auth.registerUser.useMutation()

  if (error) {
    return (
      <div>
        <div>
          Please <Link to='/signup'>sign-up again</Link> from first step or again or check that you already signed up.
        </div>
      </div>
    )
  }

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
