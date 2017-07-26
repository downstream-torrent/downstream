import config from 'config'
import mv from 'mv'
import path from 'path'
import { client, io } from './server'

export function addTorrent (uri) {
  if (client.get(uri)) {
    console.log(`Torrent ${uri} has already been added`)
    return
  }

  client.add(uri, { path: config.get('paths.downloading') }, torrent => {
    console.log(`Added torrent ${torrent.infoHash}`)

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
              io.sockets.emit('torrentMoveError', err.message)
            }
          })
        })
      }

      // Send the magnet uri of the completed torrent to all clients.
      io.sockets.emit('torrentDone', torrent.magnetURI)
    })
  })
}

export function removeTorrent (torrentId) {
  client.remove(torrentId, err => {
    if (err) {
      console.log(`[Torrent ${torrentId}] Error removing torrent:`, err.message)
      return
    }

    console.log(`Removed torrent ${torrentId}`)
    io.sockets.emit('remove', torrentId)
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
  const torrents = client.torrents.map(torrent => ({
    hash: torrent.infoHash,
    magnet: torrent.magnetURI,
    timeRemaining: torrent.timeRemaining,
    received: torrent.received,
    downloaded: torrent.downloaded,
    uploaded: torrent.downloaded,
    downloadSpeed: torrent.downloadSpeed,
    uploadSpeed: torrent.uploadSpeed,
    progress: torrent.progress,
    ratio: torrent.ratio,
    peers: torrent.numPeers,
    path: torrent.path
  }))

  socket.emit('list', torrents)
}
