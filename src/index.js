import config from 'config'
import http from 'http'
import socket from 'socket.io'

const app = http.createServer(handler)
const io = socket(app)

app.listen(config.get('port') || 3000)

function handler (req, res) {
  res.end('hello world')
}

io.on('connection', (socket) => {
  console.log('Connection established!')
})
