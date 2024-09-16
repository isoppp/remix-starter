import { env } from '@/lib/env'
import { createCookieSessionStorage } from '@remix-run/node'

export const VERIFICATION_KEY = 'verification'

export const verificationSessionStorage = createCookieSessionStorage({
  cookie: {
    name: env.APP_ENV === 'local' ? '_verification' : '__Host-verification',
    sameSite: 'lax',
    path: '/',
    httpOnly: true,
    maxAge: 60 * 60, // sec = 60min but token will be expired in 5min
    secrets: env.SESSION_SECRET.split(','),
    secure: true,
  },
})
