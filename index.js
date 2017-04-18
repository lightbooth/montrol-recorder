const WebSocket = require('ws')
    , config = require('./config')
    , Pws = require('pws')
    , path = require('path')
    , fs = require('fs-extra')
    , log = require('./log')
    , cp = require('child_process')
    , serveIndex = require('serve-index')
    , serveStatic = require('serve-static')
    , final = require('finalhandler')
    , https = require('https')
    , http = require('http')
    , basicAuth = require('basic-auth')

const serve = serveStatic(config.recordingDirectory)
    , index = serveIndex(config.recordingDirectory, {
      icons: true,
      filter: (filename, _, __, dir) => {
        dir = path.relative(config.recordingDirectory, dir)
        return !dir || path.relative(config.recordingDirectory, dir).split('/').length === 0
                    || filename.endsWith('.mp4')
      }
    })

function app(req, res) {
  const auth = basicAuth(req)

  if (!auth || auth.name !== 'admin' || auth.pass !== config.basicAuthPassword) {
    res.setHeader('WWW-Authenticate', 'Basic realm="montrol"')
    res.statusCode = 401
    return res.end('Unauthorized')
  }

  const done = final(req, res)
  serve(req, res, err => err ? done(err) : index(req, res, done))
}

const server = config.https
    ? https.createServer(config.https, app)
    : http.createServer(app)

server.listen(config.port)
server.on('listening', () => log('Listening on port', config.port))

config.macsToRecord.forEach(startRecording)

function startRecording(mac) {

  const url = 'wss://' + config.montrolHost + '/devices/' + mac + '/desktop?key=' + config.montrolKey
      , socket = new Pws(url, WebSocket, { pingTimeout: false })
      , images = path.join(config.recordingDirectory, mac)
      , currentFolder = new Date().toISOString().slice(0, 13).replace(/[-T:]/g, '')

  let counter = 0

  fs.mkdirpSync(images)

  try {
    const first = fs.readdirSync(path.join(images, currentFolder)).sort().reverse()[0]
    if (first)
      counter = parseInt(first.replace('.jpg', ''))
  } catch (err) {
    // Don't care
  }

  socket.onopen = () => log(mac, 'connected')

  socket.onmessage = e => {
    if (typeof e.data === 'string')
      return log(mac, e.data)

    counter++
    writeJpeg(new Buffer(e.data))
  }

  function writeJpeg(data) {
    const hourFolder = new Date().toISOString().slice(0, 13).replace(/[-T:]/g, '')
    fs.writeFile(path.join(images, hourFolder, padToSix(counter) + '.jpg'), data, 'binary', err => {
      if (!err)
        return

      if (err.code !== 'ENOENT')
        return log.error(mac, err)

      counter = 0
      encodeVideo()
      fs.mkdir(path.join(images, hourFolder), err => {
        if (err)
          return log.error(mac, err)

        writeJpeg(data)
      })
    })
  }

  function encodeVideo() {
    const hourFolder = new Date(Date.now() - 1000 * 60 * 30).toISOString().slice(0, 13).replace(/[-T:]/g, '')

    if (!fs.existsSync(path.join(images, hourFolder)))
      return

    cp.exec('ffmpeg -loglevel 0 -pix_fmt yuv420p -framerate 10 -pattern_type glob -i \''
      + path.join(images, hourFolder) + '/*.jpg\' -crf 30 -vf hflip -preset ultrafast '
      + path.join(images, hourFolder) + '.mp4'
    , (err, stderr, stdout) => {
      if (err || stderr)
        return log.error(mac, err, stderr)

      fs.remove(path.join(images, hourFolder), err => err && log.error(mac, err))
    })
  }

  socket.onclose = () => {
    log(mac, 'closed')
  }

  socket.onerror = err => {
    log.error(mac, 'socket error', err)
  }

}

function padToSix(number) {
  return number <= 999999 ? ('00000' + number).slice(-6) : number
}

