import { env } from '@/lib/env'
import { createCookieSessionStorage } from '@remix-run/node'

export const AUTH_KEY = 'verification'
export const AUTH_SESSION_EXPIRATION_SEC = 60 * 60 * 24 * 30 // 180days
export const authSessionStorage = createCookieSessionStorage({
  cookie: {
    name: env.APP_ENV === 'local' ? '_session' : '__Host-session',
    sameSite: 'lax',
    path: '/',
    httpOnly: true,
    maxAge: AUTH_SESSION_EXPIRATION_SEC, // sec
    secrets: env.SESSION_SECRET.split(','),
    secure: true,
  },
})
