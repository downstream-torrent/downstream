import 'babel-polyfill'
import { assert } from 'chai'
import { checkMatch } from '../src/feeds'

describe('Feed Tests', () => {
  describe('#checkMatch', () => {
    describe('when "match" is a string', () => {
      const feed = { match: '2160p' }
      const validItem = { title: '[SomeCoolTorrent].TR1P.2160p.2018' }
      const invalidItem = { title: '[SomeCoolTorrent].TR1P.1080p.2018' }

      it('returns "true" for a valid match', () => assert.isTrue(checkMatch(feed, validItem)))
      it('returns "false" for an invalid match', () => assert.isFalse(checkMatch(feed, invalidItem)))
    })

    describe('when "match" is an object', () => {
      describe('when "flags" is specified', () => {
        const feed = { match: { pattern: '2160p', flags: 'gi' } }
        const validItem = { title: '[SomeCoolTorrent].TR1P.2160P.2018' } // case changed
        const invalidItem = { title: '[SomeCoolTorrent].TR1P.1080p.2018' }

        it('returns "true" for a valid match', () => assert.isTrue(checkMatch(feed, validItem)))
        it('returns "false" for an invalid match', () => assert.isFalse(checkMatch(feed, invalidItem)))
      })

      describe('when "flags" is not specified', () => {
        const feed = { match: { pattern: '2160p' } }
        const validItem = { title: '[SomeCoolTorrent].TR1P.2160p.2018' }
        const invalidItem = { title: '[SomeCoolTorrent].TR1P.1080p.2018' }

        it('returns "true" for a valid match', () => assert.isTrue(checkMatch(feed, validItem)))
        it('returns "false" for an invalid match', () => assert.isFalse(checkMatch(feed, invalidItem)))
      })
    })
  })
})
