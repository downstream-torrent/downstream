import config from 'config'
import http from 'http'
import socket from 'socket.io'
import WebTorrent from 'webtorrent'

import { scanFeeds } from './feeds'
import { addTorrent, removeTorrent, listTorrents } from './torrent'

export const app = http.createServer()
export const io = socket(app)
export const client = new WebTorrent()

app.listen(config.get('port') || 3000)

client.on('torrent', (torrent) => io.sockets.emit('torrentAdded', {
  infoHash: torrent.infoHash,
  magnetUri: torrent.magnetURI,
  path: torrent.path
}))

io.on('connection', (socket) => {
  console.log('Connection established!')
  socket.on('add', uri => addTorrent(uri))
  socket.on('remove', torrentId => removeTorrent(torrentId))
  socket.on('list', () => listTorrents(socket))
})

// Scan feeds for new torrents
scanFeeds()
