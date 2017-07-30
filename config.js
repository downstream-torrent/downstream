const Configstore = require('configstore')

module.exports = new Configstore('downstream', {
  port: 9001,
  paths: {
    downloading: '/tmp/webtorrent',
    complete: '/tmp/webtorrent'
  },
  feeds: []
})
