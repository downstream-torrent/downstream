import config from 'config'
import FeedParser from 'feedparser'
import request from 'request'

import { addTorrent } from './torrent'

const feeds = config.get('feeds')

export function scanFeeds () {
  console.log(`Scanning ${feeds.length} feeds`)
  feeds.forEach(feed => {
    const feedParser = new FeedParser()
    let regex

    if (feed.match) {
      if (typeof feed.match === 'object') {
        if (feed.match.flags) {
          regex = new RegExp(feed.match.pattern, feed.match.flags)
        } else {
          regex = new RegExp(feed.match.pattern)
        }
      } else {
        regex = new RegExp(feed.match)
      }
    }

    feedParser.on('error', err => {
      console.log('Error parsing feed', err)
    })

    feedParser.on('readable', () => {
      let item
      while ((item = feedParser.read())) {
        if (feed.match && !regex.test(item.title)) {
          return
        }

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
