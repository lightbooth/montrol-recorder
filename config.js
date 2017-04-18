/* eslint no-process-env: 0 */

module.exports = {
  port                : process.env.PORT,
  recordingDirectory  : process.env.RECORDING_DIRECTORY || process.cwd(),
  macsToRecord        : (process.env.MACS_TO_RECORD || '').split(' '),
  montrolHost         : process.env.MONTROL_HOST,
  montrolKey          : process.env.MONTROL_KEY
}
