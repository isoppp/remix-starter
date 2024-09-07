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

const MODE = process.env.NODE_ENV ?? 'development'
const IS_PROD = MODE === 'production'
const IS_DEV = MODE === 'development'
const ALLOW_INDEXING = process.env.ALLOW_INDEXING !== 'false'

// Development-only: Vite Dev Server
let viteDevServer
if (IS_DEV) {
  viteDevServer = await import('vite').then((vite) => vite.createServer({ server: { middlewareMode: true } }))
}

// Express app setup
const app = express()

// Middleware: Compression
app.use(compression())

// Middleware: Helmet for security headers
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

// Middleware: CSP nonce
app.use((_, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('hex')
  next()
})

// Static assets serving
if (viteDevServer) {
  app.use(viteDevServer.middlewares)
} else {
  app.use('/assets', express.static('build/client/assets', { immutable: true, maxAge: '1y' }))
  app.use(express.static('build/client', { maxAge: '1h' }))
}

app.get(['/img/*', '/favicons/*'], (_req, res) => res.status(404).send('Not found'))

// TODO: リクエストロガーを追加

// Rate limiting settings
const maxMultiple = !IS_PROD || process.env.PLAYWRIGHT_TEST_BASE_URL ? 10_000 : 1
const rateLimitDefault = {
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

// HTTPS and trailing slash redirection
app.set('trust proxy', true)

app.use((req, res, next) => {
  if (req.method !== 'GET') return next()
  const proto = req.get('X-Forwarded-Proto')
  if (proto === 'http') {
    res.redirect(`https://${req.get('host')}${req.originalUrl}`)
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

// Get Remix build
async function getBuild() {
  const build = viteDevServer
    ? viteDevServer.ssrLoadModule('virtual:remix/server-build')
    : await import('../build/server/index.js')
  return build as unknown as ServerBuild
}

// Robots.txt
if (!ALLOW_INDEXING) {
  app.use((_, res, next) => {
    res.set('X-Robots-Tag', 'noindex, nofollow')
    next()
  })
}

// Remix request handler
app.all(
  '*',
  createRequestHandler({
    getLoadContext: (_, res) => ({ cspNonce: res.locals.cspNonce, serverBuild: getBuild() }),
    mode: MODE,
    build: getBuild,
  }),
)

// Server startup
const desiredPort = Number(process.env.PORT || 3000)
const portToUse = await getPort({ port: portNumbers(desiredPort, desiredPort + 100) })
const server = app.listen(portToUse, () => {
  console.log(`🚀 We have liftoff!`)
  console.log(` ${chalk.bold('Local:')} ${chalk.cyan(`http://localhost:${portToUse}`)}`)
  console.log(`${chalk.bold('Press Ctrl+C to stop')}`)
})

// Graceful shutdown
closeWithGrace(async () => {
  await new Promise((resolve, reject) => {
    server.close((e) => (e ? reject(e) : resolve('ok')))
  })
})
