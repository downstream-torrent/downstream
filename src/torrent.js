import config from 'config'
import mv from 'mv'
import path from 'path'
import { client, db, io } from './server'

/**
 * Updates the database and notify all clients whenever data is downloaded for
 * a torrent.
 *
 * @param {object} torrent - the torrent with newly downloaded data
 */
export async function onDownload (torrent) {
  const torrentInfo = {
    downloaded: torrent.downloaded,
    downloadSpeed: torrent.downloadSpeed,
    uploaded: torrent.uploaded,
    uploadSpeed: torrent.uploadSpeed,
    progress: torrent.progress,
    ratio: torrent.ratio,
    numPeers: torrent.numPeers,
    timeRemaining: torrent.timeRemaining
  }
  await db.get('torrents').find({ infoHash: torrent.infoHash }).assign(torrentInfo).write()
  io.sockets.emit('torrent_download', torrentInfo)
}

/**
 * Moves the completed torrent if the "complete" path is specified and differs
 * from the download path. Updates the status of the torrent in the database
 * and notifies all clients.
 *
 * @param {object} torrent - the torrent that has just completed
 */
export async function onDone (torrent) {
  const downloadPath = config.get('paths.downloading')
  const completePath = config.get('paths.complete')
  if (completePath && completePath !== downloadPath) {
    torrent.files.forEach(file => {
      const oldPath = path.join(downloadPath, file.path)
      const newPath = path.join(completePath, file.path)
      mv(oldPath, newPath, { mkdirp: true }, err => {
        if (err) {
          io.sockets.emit('torrent_move_error', err.message)
        }
      })
    })
  }

  const torrentEntry = db.get('torrents').find({ infoHash: torrent.infoHash }).assign({
    path: completePath,
    status: 'complete'
  })
  await torrentEntry.write()
  io.sockets.emit('torrent_complete', torrentEntry.value())
}

export async function onTorrent (torrent, socket = null) {
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

  if (socket) {
    socket.broadcast.emit('torrent_added', torrentInfo)
    socket.emit('torrent_added_reply', torrentInfo)
  } else {
    io.sockets.emit('torrent_added', torrentInfo)
  }

  torrent.on('download', () => onDownload(torrent))
  torrent.on('done', () => onDone(torrent))
}

export function addTorrent (id, socket = null) {
  if (client && client.get(id)) {
    if (socket) {
      socket.emit('torrent_add_error', 'Error: Torrent has already been added')
    }
    return
  }

  client.add(id, { path: config.get('paths.downloading') }, torrent => onTorrent(torrent, socket))
}

export function removeTorrent (torrentId) {
  client.remove(torrentId, err => {
    if (err) {
      console.log(`[Torrent ${torrentId}] Error removing torrent:`, err.message)
      return
    }

    console.log(`Removed torrent ${torrentId}`)
    io.sockets.emit('torrent_removed', torrentId)
  })
}

export function pauseTorrent (torrentId) {
  const torrent = client.get(torrentId)
  torrent.pause()
}

export function resumeTorrent (torrentId) {
  const torrent = client.get(torrentId)
  torrent.resume()
}

export function listTorrents (socket) {
  const torrents = db.get('torrents').value()
  socket.emit('torrent_list', torrents)
}
