import { env } from '@/lib/env'
import { createCookieSessionStorage } from '@remix-run/node'

export const AUTH_KEY = 'verification'

export const authSessionStorage = createCookieSessionStorage({
  cookie: {
    name: env.APP_ENV === 'local' ? '_session' : '__Host-session',
    sameSite: 'lax',
    path: '/',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 180, // sec = 180days
    secrets: env.SESSION_SECRET.split(','),
    secure: true,
  },
})
