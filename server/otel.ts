import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import * as opentelemetry from '@opentelemetry/sdk-node'

const sdk = new opentelemetry.NodeSDK({
  traceExporter: new TraceExporter({
    projectId: 'experimental-436413',
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // we recommend disabling fs autoinstrumentation since it can be noisy
      // and expensive during startup
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
    }),
  ],
})

sdk.start()
