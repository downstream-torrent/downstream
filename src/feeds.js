import config from 'config'
import FeedParser from 'feedparser'
import request from 'request'

import { addTorrent } from './torrent'

const feeds = config.get('feeds')

export function scanFeeds () {
  feeds.forEach(feed => {
    const feedParser = new FeedParser()

    feedParser.on('error', err => {
      console.log('Error parsing feed', err)
    })

    feedParser.on('readable', () => {
      let item
      while ((item = feedParser.read())) {
        addTorrent(item.link)
      }
    })

    const req = request(feed.url, {
      headers: {
        'user-agent': 'downstream'
      }
    })

    req.on('error', err => {
      console.log('Error fetching feed', err)
    })

    req.on('response', (res) => {
      if (res.statusCode !== 200) {
        console.log('Error retrieving feed: non 200 status code')
        return
      }

      return req.pipe(feedParser)
    })
  })
}
