module.exports = log

function log() {
  console.log.apply(console, arguments) // eslint-disable-line
}

log.error = function() {
  console.error.apply(console, arguments) // eslint-disable-line
}
