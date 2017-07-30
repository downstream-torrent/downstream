import config from '../config'
import http from 'http'
import low, { fileAsync } from 'lowdb'
import socket from 'socket.io'
import WebTorrent from 'webtorrent'

import { scanFeeds } from './feeds'
import { addTorrent, removeTorrent, pauseTorrent, resumeTorrent, listTorrents } from './torrent'

export const app = http.createServer()
export const io = socket(app)
export const db = low('db.json', { storage: fileAsync })
export const client = new WebTorrent()

export async function start () {
  app.listen(config.get('port') || 9001)

  // Set up the database and load initial torrents
  await db.defaults({ torrents: [] }).write()
  db.get('torrents').map('infoHash').value().forEach(infoHash => addTorrent(infoHash))

  io.on('connection', socket => {
    socket.on('add_torrent', id => addTorrent(id, socket))
    socket.on('remove_torrent', id => removeTorrent(id, socket))
    socket.on('pause', torrentId => pauseTorrent(torrentId))
    socket.on('resume', torrentId => resumeTorrent(torrentId))
    socket.on('list_torrents', () => listTorrents(socket))
  })

  client.on('error', err => {
    console.log('Client Error:', err.message)
  })

  // Scan feeds for new torrents
  scanFeeds()
  setInterval(scanFeeds, 3600000)
}
