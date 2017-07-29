import config from 'config'
import mv from 'mv'
import path from 'path'
import { client, db, io } from './server'

export function getTorrentInfo (torrent) {
  return {
    infoHash: torrent.infoHash,
    length: torrent.length,
    magnet: torrent.magnetURI,
    name: torrent.name,
    path: torrent.path,
    downloaded: torrent.downloaded,
    downloadSpeed: torrent.downloadSpeed,
    uploaded: torrent.uploaded,
    uploadSpeed: torrent.uploadSpeed,
    progress: torrent.progress,
    ratio: torrent.ratio,
    numPeers: torrent.numPeers,
    status: 'unknown',
    timeRemaining: torrent.timeRemaining,
    files: torrent.files.map(file => ({
      name: file.name,
      path: file.path,
      length: file.length,
      progress: file.progress
    }))
  }
}

/**
 * Updates the database and notify all clients whenever data is downloaded for
 * a torrent.
 *
 * @param {object} torrent - the torrent with newly downloaded data
 */
export async function onDownload (torrent) {
  const torrentInfo = getTorrentInfo(torrent)
  torrentInfo.queuePosition = db.get('torrents').find({ infoHash: torrent.infoHash }).value().queuePosition

  if (torrent.progress === 1) {
    torrentInfo.status = 'complete'
  } else if (torrent.downloadSpeed > 0) {
    torrentInfo.status = 'downloading'
  }

  await db.get('torrents').find({ infoHash: torrent.infoHash }).assign(torrentInfo).write()
  io.sockets.emit('torrent_download', torrentInfo)
}

/**
 * Updates the database and notify all clients whenever data is uploaded for
 * a torrent.
 *
 * @param {object} torrent - the torrent with newly uploaded data
 */
export async function onUpload (torrent) {
  const torrentInfo = getTorrentInfo(torrent)
  torrentInfo.queuePosition = db.get('torrents').find({ infoHash: torrent.infoHash }).value().queuePosition

  if (torrent.uploadSpeed > 0 && torrent.downloadSpeed === 0) {
    torrentInfo.status = 'seeding'
  }

  await db.get('torrents').find({ infoHash: torrent.infoHash }).assign(torrentInfo).write()
  io.sockets.emit('torrent_upload', torrentInfo)
}

/**
 * Moves the completed torrent if the "complete" path is specified and differs
 * from the download path. Updates the status of the torrent in the database
 * and notifies all clients.
 *
 * @param {object} torrent - the torrent that has just completed
 */
export async function onDone (torrent) {
  await db.get('torrents').find({ infoHash: torrent.infoHash }).assign({ status: 'done' }).write()

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

export async function onNoPeers (torrent) {
  const currentStatus = db.get('torrents').find({ infoHash: torrent.infoHash }).value()
  if (currentStatus !== 'paused') {
    await db.get('torrents').find({ infoHash: torrent.infoHash }).assign({ status: 'stalled' }).write()
  }

  const torrentEntry = db.get('torrents').find({ infoHash: torrent.infoHash }).value()
  io.sockets.emit('torrent_stalled', torrentEntry)
}

export async function onTorrent (torrent, socket = null) {
  const torrentInfo = getTorrentInfo(torrent)

  if (!db.get('torrents').find({ infoHash: torrent.infoHash }).value()) {
    const numTorrents = db.get('torrents').size().value()
    torrentInfo.queuePosition = numTorrents + 1
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
  torrent.on('upload', () => onUpload(torrent))
  torrent.on('done', () => onDone(torrent))
  torrent.on('warning', err => console.log('Torrent Warning:', err.message))
  torrent.on('error', err => console.log('Torrent Error:', err.message))
  torrent.on('noPeers', () => onNoPeers(torrent))
}

export function addTorrent (id, socket = null) {
  if (client.get(id)) {
    if (socket) {
      socket.emit('torrent_add_error', 'Error: Torrent has already been added')
    }
    return
  }

  client.add(id, { path: config.get('paths.downloading') }, torrent => onTorrent(torrent, socket))
}

export function removeTorrent (id, socket) {
  const torrent = client.get(id)
  if (!torrent) {
    socket.emit('torrent_remove_error', 'Error: Torrent does not exist')
    return
  }
  const torrentInfo = db.get('torrents').find({ infoHash: torrent.infoHash }).value()

  client.remove(id, async err => {
    if (err) {
      socket.emit('torrent_remove_error', err)
      return
    }

    await db.get('torrents').remove({ infoHash: torrent.infoHash }).write()
    socket.broadcast.emit('torrent_removed', torrentInfo)
    socket.emit('torrent_removed_reply', torrentInfo)
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
