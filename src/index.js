import config from 'config'
import http from 'http'
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
  const torrent = await client.add(uri)
  torrent.on('download', () => io.sockets.emit('torrentDownload', {
    downloadSpeed: torrent.downloadSpeed,
    infoHash: torrent.infoHash,
    magnetUri: torrent.magnetURI,
    path: torrent.path,
    progress: torrent.progress,
    uploadSpeed: torrent.uploadSpeed
  }))
  torrent.on('done', () => {
    io.sockets.emit('torrentDone', torrent.magnetURI)
  })
}

io.on('connection', (socket) => {
  console.log('Connection established!')
  socket.on('add', (uri) => addTorrent(socket, uri))
})
