import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import * as opentelemetry from '@opentelemetry/sdk-node'
import p from '@prisma/instrumentation'
import { RemixInstrumentation } from 'opentelemetry-instrumentation-remix'

const sdk = new opentelemetry.NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [
    getNodeAutoInstrumentations({
      // we recommend disabling fs autoinstrumentation since it can be noisy
      // and expensive during startup
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
    }),
    new p.PrismaInstrumentation(),
    new RemixInstrumentation(),
  ],
})

sdk.start()
