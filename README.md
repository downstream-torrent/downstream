# Downstream
[![Build Status](https://travis-ci.org/nerdenough/downstream.svg?branch=master)](https://travis-ci.org/nerdenough/downstream)

[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

Downstream is a torrent client built on top of `webtorrent`. It provides an
easy way to add torrents, either manually via torrent urls and magnet links,
or automated through RSS feeds.

## Usage
### Requirements
- macOS or Linux
- [Node.js](https://nodejs.org) (>= 6)

### Installing and Running
1. Clone (or download) this repository to your local machine.
2. Open your terminal in the root of the Downstream directory and run `npm install`
to install the dependencies.
3. Customise your config (see the config section below)
4. Run Downstream using `npm start`

## Command Line
You can use the Downstream command line by running `./bin/downstream`. This will
automatically connect to the Downstream service if it is running and allows you to
manually manage torrents being downloaded by Downstream.

### Commands
- `add <magnet|torrent>` - Adds the magnet uri or torrent url and begins downloading
- `remove <torrent id>` - Removes the torrent matching the specified id
- `list` - Shows the status, id, progress, and other information for each torrent added
to Downstream

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
