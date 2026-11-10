---
title: Demo Release
description: Smoke release
---

<AlbumArtwork />

<AlbumIdentity src="./album.yml" />

<AlbumTracklist src="./album.yml" />

<TabView>
  <TabPanel label="Preview">
    <Player type="netease_player" url="https://music.163.com/#/album?id=368479005" />
  </TabPanel>
  <TabPanel label="Listen & Get">
    <Player type="spotify_player" uri="https://open.spotify.com/album/6sTGvo4ElkLW573RbrH5Yk" />
    <Button href="https://resolvers.bandcamp.com/album/gemini-fables">Bandcamp</Button>
  </TabPanel>
</TabView>

<Box><AlbumCovers src="./album.yml" /></Box>

<AlbumCredit src="./album.yml" />

English release body.
