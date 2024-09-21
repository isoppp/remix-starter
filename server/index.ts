/**
 * This file is initially referenced the epic stack server/index.ts file and refactored for me.
 */

import crypto from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import { getAuthSessionIdForPostGraphile } from '@/.server/cookie-session/auth-session'
import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { createRequestHandler } from '@remix-run/express'
import type { ServerBuild } from '@remix-run/node'
import chalk from 'chalk'
import closeWithGrace from 'close-with-grace'
import compression from 'compression'
import express from 'express'
import rateLimit from 'express-rate-limit'
import getPort, { portNumbers } from 'get-port'
import helmet, { type HelmetOptions } from 'helmet'
import morgan from 'morgan'
import { postgraphile } from 'postgraphile'
import type { SchemaBuilder } from 'postgraphile'

const IS_LOCAL = process.env.APP_ENV === 'local'
const ALLOW_INDEXING = false
const STRONGEST_RATE_LIMIT_PATH: string[] = ['/signin', '/signup']

const HELMET_OPTIONS: HelmetOptions = {
  xPoweredBy: false,
  referrerPolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    reportOnly: true, // TODO enable in the future
    directives: {
      'connect-src': [IS_LOCAL ? 'ws:' : null, "'self'"].filter((v) => typeof v === 'string'),
      'font-src': ["'self'"],
      'frame-src': ["'self'"],
      'img-src': ["'self'", 'data:'],
      // @ts-expect-error
      'script-src': ["'strict-dynamic'", "'self'", (_, res) => `'nonce-${res.locals.cspNonce}'`],
      // @ts-expect-error
      'script-src-attr': [(_, res) => `'nonce-${res.locals.cspNonce}'`],
      'upgrade-insecure-requests': null,
    },
  },
}

// Development-only: Vite Dev Server
const viteDevServer = IS_LOCAL
  ? await import('vite').then((vite) => vite.createServer({ server: { middlewareMode: true } }))
  : undefined

// Express app setup
const app = express()

// postgraphile
const createIgnoreTablesPlugin = (ignoredTables: string[]) => {
  return function IgnoreTablesPlugin(builder: SchemaBuilder) {
    builder.hook('build', (build) => {
      const { pgIntrospectionResultsByKind } = build

      pgIntrospectionResultsByKind.class = pgIntrospectionResultsByKind.class.filter(
        (table: { name: string }) => !ignoredTables.includes(table.name),
      )
      return build
    })
  }
}
const getUserIdBySessionForPostgraphile = async (req: IncomingMessage) => {
  const sessionId = await getAuthSessionIdForPostGraphile(req)
  if (sessionId) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, user: true },
    })
    const userId = session?.user.id
    if (userId) return userId
  }

  if (env.APP_ENV === 'local') {
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    })
    if (user) return user.id
  }
  return '-1'
}
const databaseUrl = process.env.DATABASE_URL || 'postgres://user:pass@host:5432/dbname'
app.use(
  postgraphile(databaseUrl, 'public', {
    appendPlugins: [createIgnoreTablesPlugin(['_prisma_migrations', 'Verification'])],
    watchPg: true,
    graphiql: env.APP_ENV === 'local',
    enhanceGraphiql: env.APP_ENV === 'local',
    ignoreRBAC: false,
    exportGqlSchemaPath: 'schema.graphql',
    pgSettings: async (req) => {
      const userId = await getUserIdBySessionForPostgraphile(req)
      return {
        role: 'postgraphile',
        'app.current_user_id': userId,
      }
    },
  }),
)

// Middleware: Compression
app.use(compression())

// HTTPS redirection
app.use((req, res, next) => {
  if (req.method !== 'GET') return next()
  const proto = req.get('X-Forwarded-Proto')
  if (proto === 'http') {
    res.redirect(`https://${req.get('host')}${req.originalUrl}`)
    return
  }
  next()
})

// Trailing slash redirection for SEO reasons
// https://github.com/epicweb-dev/epic-stack/discussions/108
app.get('*', (req, res, next) => {
  if (req.path.endsWith('/') && req.path.length > 1) {
    const query = req.url.slice(req.path.length)
    const safepath = req.path.slice(0, -1).replace(/\/+/g, '/')
    res.redirect(302, safepath + query)
  } else {
    next()
  }
})

// Static assets serving
if (viteDevServer) {
  app.use(viteDevServer.middlewares)
} else {
  app.use('/assets', express.static('build/client/assets', { immutable: true, maxAge: '1y' }))
  app.use(express.static('build/client', { maxAge: '1h' }))
}

app.get(['/images/*', '/favicons/*'], (_req, res) => res.status(404).send('Not found'))

// Request logger
morgan.token('url', (req) => decodeURIComponent(req.url ?? ''))
app.use(morgan('tiny', {}))

// Trust proxy
app.set('trust proxy', true)

// Robots.txt
if (!ALLOW_INDEXING) {
  app.use((_, res, next) => {
    res.set('X-Robots-Tag', 'noindex, nofollow')
    next()
  })
}

// Middleware: CSP nonce and Helmet for security headers (these orders are important)
app.use((_, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('hex')
  next()
})
app.use(helmet(HELMET_OPTIONS))

// Rate limiting settings
const maxMultiple = IS_LOCAL || process.env.PLAYWRIGHT_TEST_BASE_URL ? 10_000 : 1
const rateLimitDefault: Parameters<typeof rateLimit>[0] = {
  windowMs: 60 * 1000,
  max: 1000 * maxMultiple,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  keyGenerator: (req) => `${req.ip}`,
}

const strongestRateLimit = rateLimit({ ...rateLimitDefault, windowMs: 60 * 1000, max: 10 * maxMultiple })
const strongRateLimit = rateLimit({ ...rateLimitDefault, windowMs: 60 * 1000, max: 100 * maxMultiple })
const generalRateLimit = rateLimit(rateLimitDefault)

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (STRONGEST_RATE_LIMIT_PATH.some((p) => req.path.includes(p))) {
      return strongestRateLimit(req, res, next)
    }
    return strongRateLimit(req, res, next)
  }
  if (req.path.includes('/verify')) {
    return strongestRateLimit(req, res, next)
  }
  return generalRateLimit(req, res, next)
})

// Get Remix build
async function getBuild() {
  const build = viteDevServer
    ? await viteDevServer.ssrLoadModule('virtual:remix/server-build')
    : // @ts-ignore this should exist before running the server in production
      await import('../build/server/index.js')
  return build as unknown as ServerBuild
}

// Remix request handler
app.all(
  '*',
  createRequestHandler({
    getLoadContext: (_, res) => ({ cspNonce: res.locals.cspNonce, serverBuild: getBuild() }),
    mode: process.env.APP_ENV,
    build: getBuild,
  }),
)

// Server startup
const desiredPort = Number(process.env.PORT || 3000)
const portToUse = await getPort({ port: portNumbers(desiredPort, desiredPort + 100) })

const portAvailable = desiredPort === portToUse
if (!portAvailable && !IS_LOCAL) {
  console.log(`! Port ${desiredPort} is not available.`)
  process.exit(1)
}

const server = app.listen(portToUse, () => {
  console.log({ NODE_ENV: process.env.NODE_ENV, APP_ENV: process.env.APP_ENV })
  console.log('🚀 We have liftoff!')
  console.log(` ${chalk.bold('Local:')}            ${chalk.cyan(`http://localhost:${portToUse}`)}`)

  console.log(`${chalk.bold('Press Ctrl+C to stop')}`)
})

// Graceful shutdown
closeWithGrace(async () => {
  await new Promise((resolve, reject) => {
    server.close((e) => (e ? reject(e) : resolve('ok')))
  })
})
