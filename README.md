# Downstream
[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

Downstream is a torrent client built on top of `webtorrent`. It provides an
easy way to add torrents, either manually via torrent urls and magnet links,
or automated through RSS feeds.

## Config
Downstream's settings can be configured using the `config/default.json` file.
This file allows you to change the port that Downstream runs on, change the
location for downloading and completed torrents, and add feeds that can be
used to automatically import torrents.

### Port
The `port` config option specifies the port where Downstream can be accessed.

### Paths
You can specify separate `downloading` (incomplete) and `completed` as full
paths in local file system. Once a torrent is finished downloading it will be
copied to the completed folder.

```json
"paths": {
  "downloading": "/Volumes/storage/torrents/downloading",
  "complete": "/Volumes/storage/torrents/complete"
}
```

## RSS Feeds
Downstream can periodically scan RSS feeds and automatically add the discovered
torrents to the download queue. You can use Regular Expressions to filter a
feed even further.

### Adding a Feed
To add an RSS feed, edit the `feeds` in `config/default.json` and

```json
"feeds": [{
  "url": "https://example.com/myrssfeed"
}]
```

### Pattern Matching
You can also add a `match` option to a feed to filter item titles for either a simple
string or a [Regular Expression](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/RegExp).

#### String
To match a string, you can simply specify a `match` option alongside the url
for your feed.

```json
"feeds": [{
  "url": "https://example.com/myrssfeed",
  "match": "2160p"
}]
```

#### Regular Expression
To match a Regular Expression you can specify both a `pattern` and the `flags`
to match against.

The following example matches any feeds that include the format
`S[number]E[number]` and `1080p`.

```json
"feeds": [{
  "url": "http://example.org/somerssfeed",
  "match": {
    "pattern": "(?=.*S\\d*E\\d*)(?=.*1080p).*",
    "flags": "gi"
  }
}]
```

_Note: You must escape (`\`) backslashes in your Regular Expression (e.g. `\d`
becomes `\\d`)._
