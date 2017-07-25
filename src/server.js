import config from 'config'
import http from 'http'
import socket from 'socket.io'
import WebTorrent from 'webtorrent'

import { scanFeeds } from './feeds'
import { addTorrent, removeTorrent, pauseTorrent, resumeTorrent, listTorrents } from './torrent'

export const app = http.createServer()
export const io = socket(app)
export const client = new WebTorrent()

app.listen(config.get('port') || 3000)

client.on('torrent', (torrent) => io.sockets.emit('torrentAdded', {
  hash: torrent.infoHash,
  magnet: torrent.magnetURI,
  path: torrent.path
}))

io.on('connection', (socket) => {
  console.log('Connection established!')
  socket.on('add', uri => addTorrent(uri))
  socket.on('remove', torrentId => removeTorrent(torrentId))
  socket.on('pause', torrentId => pauseTorrent(torrentId))
  socket.on('resume', torrentId => resumeTorrent(torrentId))
  socket.on('list', () => listTorrents(socket))
})

// Scan feeds for new torrents
scanFeeds()
