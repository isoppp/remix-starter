import { Logging } from '@google-cloud/logging'

// Loggingクライアントを作成
const logging = new Logging({
  projectId: 'experimental-436413',
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
})

// ログ名を指定
const logName = 'your-log-name'

// ログエントリを作成する関数
export async function writeLog(severity, message) {
  const log = logging.log(logName)

  const metadata = {
    severity: severity,
    resource: {
      type: 'global',
    },
  }

  const entry = log.entry(metadata, message)

  try {
    await log.write(entry)
    console.log(`Logged: ${message}`)
  } catch (error) {
    console.error('Error writing to log:', error)
  }
}

// 使用例
await writeLog('INFO', 'This is an info message')
await writeLog('ERROR', 'This is an error message')
