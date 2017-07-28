import config from 'config'
import mv from 'mv'
import path from 'path'
import { client, db, io } from './server'

export function addTorrent (uri) {
  if (client.get(uri)) {
    console.log(`Torrent ${uri} has already been added`)
    return
  }

  client.add(uri, { path: config.get('paths.downloading') }, torrent => {
    console.log(`Added torrent ${torrent.infoHash}`)

    // Send the progress of the torrent to all clients when data is downloaded.
    torrent.on('download', async () => {
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
      io.sockets.emit('torrentDownload', torrentInfo)
    })

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
  const torrents = db.get('torrents').value()
  socket.emit('list', torrents)
}
