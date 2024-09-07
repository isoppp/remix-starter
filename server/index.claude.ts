// File: src/server.ts

import crypto from 'node:crypto'
import { createRequestHandler } from '@remix-run/express'
import type { ServerBuild } from '@remix-run/node'
import chalk from 'chalk'
import closeWithGrace from 'close-with-grace'
import compression from 'compression'
import express from 'express'
import rateLimit from 'express-rate-limit'
import getPort, { portNumbers } from 'get-port'
import helmet from 'helmet'

// File: src/config.ts
const MODE = process.env.NODE_ENV ?? 'development'
const IS_PROD = MODE === 'production'
const IS_DEV = MODE === 'development'
const ALLOW_INDEXING = process.env.ALLOW_INDEXING !== 'false'

// File: src/vite-dev-server.ts
let viteDevServer
if (!IS_PROD) {
  viteDevServer = await import('vite').then((vite) => vite.createServer({ server: { middlewareMode: true } }))
}

// File: src/app.ts
const app = express()

// File: src/middleware/security.ts
app.set('trust proxy', true)

app.use((req, res, next) => {
  if (req.method !== 'GET') return next()
  const proto = req.get('X-Forwarded-Proto')
  const host = req.get('X-Forwarded-Host') ?? req.get('host') ?? ''
  if (proto === 'http') {
    res.set('X-Forwarded-Proto', 'https')
    res.redirect(`https://${host}${req.originalUrl}`)
    return
  }
  next()
})

app.get('*', (req, res, next) => {
  if (req.path.endsWith('/') && req.path.length > 1) {
    const query = req.url.slice(req.path.length)
    const safepath = req.path.slice(0, -1).replace(/\/+/g, '/')
    res.redirect(302, safepath + query)
  } else {
    next()
  }
})

app.use(compression())
app.disable('x-powered-by')

// File: src/middleware/static-files.ts
if (viteDevServer) {
  app.use(viteDevServer.middlewares)
} else {
  app.use('/assets', express.static('build/client/assets', { immutable: true, maxAge: '1y' }))
  app.use(express.static('build/client', { maxAge: '1h' }))
}

app.get(['/img/*', '/favicons/*'], (_req, res) => {
  return res.status(404).send('Not found')
})

// TODO: リクエストロガー

// File: src/middleware/csp.ts
app.use((_, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('hex')
  next()
})

app.use(
  helmet({
    xPoweredBy: false,
    referrerPolicy: { policy: 'same-origin' },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      reportOnly: true,
      directives: {
        'connect-src': [MODE === 'development' ? 'ws:' : null, "'self'"].filter(Boolean),
        'font-src': ["'self'"],
        'frame-src': ["'self'"],
        'img-src': ["'self'", 'data:'],
        'script-src': ["'strict-dynamic'", "'self'", (_, res) => `'nonce-${res.locals.cspNonce}'`],
        'script-src-attr': [(_, res) => `'nonce-${res.locals.cspNonce}'`],
        'upgrade-insecure-requests': null,
      },
    },
  }),
)

// File: src/middleware/rate-limit.ts
const maxMultiple = !IS_PROD || process.env.PLAYWRIGHT_TEST_BASE_URL ? 10_000 : 1
const rateLimitDefault = {
  windowMs: 60 * 1000,
  max: 1000 * maxMultiple,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
}

const strongestRateLimit = rateLimit({
  ...rateLimitDefault,
  windowMs: 60 * 1000,
  max: 10 * maxMultiple,
})

const strongRateLimit = rateLimit({
  ...rateLimitDefault,
  windowMs: 60 * 1000,
  max: 100 * maxMultiple,
})

const generalRateLimit = rateLimit(rateLimitDefault)

app.use((req, res, next) => {
  const strongPaths = [
    '/login',
    '/signup',
    '/verify',
    '/admin',
    '/onboarding',
    '/reset-password',
    '/settings/profile',
    '/resources/login',
    '/resources/verify',
  ]
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (strongPaths.some((p) => req.path.includes(p))) {
      return strongestRateLimit(req, res, next)
    }
    return strongRateLimit(req, res, next)
  }
  if (req.path.includes('/verify')) {
    return strongestRateLimit(req, res, next)
  }
  return generalRateLimit(req, res, next)
})

// File: src/remix-handler.ts
async function getBuild() {
  const build = viteDevServer
    ? viteDevServer.ssrLoadModule('virtual:remix/server-build')
    : await import('../build/server/index.js')
  return build as unknown as ServerBuild
}

if (!ALLOW_INDEXING) {
  app.use((_, res, next) => {
    res.set('X-Robots-Tag', 'noindex, nofollow')
    next()
  })
}

app.all(
  '*',
  createRequestHandler({
    getLoadContext: (_, res) => ({
      cspNonce: res.locals.cspNonce,
      serverBuild: getBuild(),
    }),
    mode: MODE,
    build: getBuild,
  }),
)

// File: src/server-startup.ts
const desiredPort = Number(process.env.PORT || 3000)
const portToUse = await getPort({ port: portNumbers(desiredPort, desiredPort + 100) })
const portAvailable = desiredPort === portToUse

if (!portAvailable && !IS_DEV) {
  console.log(`! Port ${desiredPort} is not available.`)
  process.exit(1)
}

const server = app.listen(portToUse, () => {
  if (!portAvailable) {
    console.warn(chalk.yellow(`! Port ${desiredPort} is not available, using ${portToUse} instead.`))
  }
  console.log(`🚀 We have liftoff!`)
  const localUrl = `http://localhost:${portToUse}`
  console.log(
    ` ${chalk.bold('Local:')} ${chalk.cyan(localUrl)}
    ${chalk.bold('Press Ctrl+C to stop')}
    `.trim(),
  )
})

closeWithGrace(async () => {
  await new Promise((resolve, reject) => {
    server.close((e) => (e ? reject(e) : resolve('ok')))
  })
})
