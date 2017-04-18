/* eslint no-process-env: 0 */

const fs = require('fs')

const config = module.exports = {
  port                : process.env.PORT,
  recordingDirectory  : process.env.RECORDING_DIRECTORY || process.cwd(),
  macsToRecord        : (process.env.MACS_TO_RECORD || '').split(' '),
  montrolHost         : process.env.MONTROL_HOST,
  montrolKey          : process.env.MONTROL_KEY,
  basicAuthPassword   : process.env.BASIC_AUTH_PASSWORD,
  sslCertPath         : process.env.SSL_CERTIFICATE_PATH,
  sslKeyPath          : process.env.SSL_PRIVATE_KEY_PATH
}

config.https = config.sslKeyPath && config.sslCertPath ? {
  key: fs.readFileSync(config.sslKeyPath),
  cert: fs.readFileSync(config.sslCertPath)
} : null
