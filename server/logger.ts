import winston from 'winston'

// Imports the Google Cloud client library for Winston
import { LoggingWinston } from '@google-cloud/logging-winston'

const loggingWinston = new LoggingWinston({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
})

const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  const { trace_id, span_id, trace_flags, ...rest } = metadata
  return `${timestamp} [${level}]: ${message} ${Object.keys(rest).length ? JSON.stringify(rest) : ''}`
})

export const cLogger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        customFormat,
      ),
    }),
    loggingWinston,
  ],
})

cLogger.info('hello winston!')
cLogger.error('error test', { foo: 'bar' })
