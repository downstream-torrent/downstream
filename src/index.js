import config from 'config'
import http from 'http'
import mv from 'mv'
import path from 'path'
import socket from 'socket.io'
import WebTorrent from 'webtorrent'

const app = http.createServer()
const io = socket(app)
const client = new WebTorrent()

app.listen(config.get('port') || 3000)

client.on('torrent', (torrent) => io.sockets.emit('torrentAdded', {
  infoHash: torrent.infoHash,
  magnetUri: torrent.magnetURI,
  path: torrent.path
}))

async function addTorrent (socket, uri) {
  const torrent = await client.add(uri, {
    path: config.get('paths.downloading')
  })

  // Send the progress of the torrent to all clients when data is downloaded.
  torrent.on('download', () => io.sockets.emit('torrentDownload', {
    downloadSpeed: torrent.downloadSpeed,
    infoHash: torrent.infoHash,
    magnetUri: torrent.magnetURI,
    path: torrent.path,
    progress: torrent.progress,
    uploadSpeed: torrent.uploadSpeed
  }))

  // Move files to the completed directory once a torrent is complete. If the downloading
  // and complete directories are the same the files will not be moved.
  torrent.on('done', () => {
    const downloadPath = config.get('paths.downloading')
    const completePath = config.get('paths.complete')
    if (completePath !== downloadPath) {
      torrent.files.forEach(file => {
        const oldPath = path.join(downloadPath, file.path)
        const newPath = path.join(completePath, file.path)
        mv(oldPath, newPath, { mkdirp: true }, err => {
          if (err) {
            socket.emit('torrentMoveError', err.message)
          }
        })
      })
    }

    // Send the magnet uri of the completed torrent to all clients.
    io.sockets.emit('torrentDone', torrent.magnetURI)
  })
}

io.on('connection', (socket) => {
  console.log('Connection established!')
  socket.on('add', (uri) => addTorrent(socket, uri))
})
