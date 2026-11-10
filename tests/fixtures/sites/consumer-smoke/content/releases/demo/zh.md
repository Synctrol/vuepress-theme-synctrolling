---
title: 演示作品
description: 冒烟发布
---

<AlbumArtwork />

<AlbumIdentity src="./album.yml" />

<AlbumTracklist src="./album.yml" />

<TabView>
  <TabPanel label="试听">
    <Player type="netease_player" url="https://music.163.com/#/album?id=368479005" />
  </TabPanel>
  <TabPanel label="收听与获取">
    <Player type="spotify_player" uri="https://open.spotify.com/album/6sTGvo4ElkLW573RbrH5Yk" />
    <Button href="https://resolvers.bandcamp.com/album/gemini-fables">Bandcamp</Button>
  </TabPanel>
</TabView>

<AlbumCredit src="./album.yml" />

<Box><AlbumCovers src="./album.yml" /></Box>

中文作品正文。
