import pino from 'pino'
import type { LokiOptions } from 'pino-loki'

const transport = pino.transport<LokiOptions>({
  target: 'pino-loki',
  level: 'info',
  options: {
    batching: true,
    interval: 5,
    host: 'https://logs-prod-021.grafana.net',
    basicAuth: {
      username: process.env.LOGGER_TRANSPORTER_USER ?? '',
      password: process.env.LOGGER_TRANSPORTER_PASS ?? '',
    },
    labels: {
      app: 'otel-test',
      service_name: 'otel-test',
      service_namespace: 'remix-starter',
      environment: 'local',
    },
  },
})

export const cLogger = pino(transport)
cLogger.info('hello loki!')
cLogger.error({ foo: 'bar' })
