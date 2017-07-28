import config from 'config'
import http from 'http'
import low, { fileAsync } from 'lowdb'
import socket from 'socket.io'
import WebTorrent from 'webtorrent'

import { scanFeeds } from './feeds'
import { addTorrent, removeTorrent, pauseTorrent, resumeTorrent, listTorrents } from './torrent'

export const app = http.createServer()
export const io = socket(app)
export const client = new WebTorrent()

app.listen(config.get('port') || 3000)

// Set up the database and load initial torrents
export const db = low('db.json', { storage: fileAsync })
db.defaults({ torrents: [] }).write()
db.get('torrents').map('infoHash').value().forEach(infoHash => addTorrent(infoHash))

client.on('torrent', async torrent => {
  const torrentInfo = {
    infoHash: torrent.infoHash,
    length: torrent.length,
    magnet: torrent.magnetURI,
    name: torrent.name,
    path: torrent.path
  }
  if (!db.get('torrents').filter({ infoHash: torrent.infoHash }).size().value()) {
    await db.get('torrents').push(torrentInfo).write()
  } else {
    await db.get('torrents').find({ infoHash: torrent.infoHash }).assign(torrentInfo).write()
  }
  io.sockets.emit('torrentAdded', torrentInfo)
})

client.on('error', err => {
  console.log('Client Error:', err.message)
})

io.on('connection', async socket => {
  console.log('Connection established!')
  socket.on('add', uri => addTorrent(uri))
  socket.on('remove', torrentId => removeTorrent(torrentId))
  socket.on('pause', torrentId => pauseTorrent(torrentId))
  socket.on('resume', torrentId => resumeTorrent(torrentId))
  socket.on('list', () => listTorrents(socket))
})

// Scan feeds for new torrents
scanFeeds()
setInterval(scanFeeds, 3600000)
