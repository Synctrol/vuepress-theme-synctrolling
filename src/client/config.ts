import { defineClientConfig } from 'vuepress/client'
import Layout from './layouts/Layout.vue'
import Root from './layouts/Root.vue'
import AlbumArtwork from './components/release/AlbumArtwork.vue'
import AlbumIdentity from './components/release/AlbumIdentity.vue'
import AlbumCopyright from './components/release/AlbumCopyright.vue'
import AlbumPreviews from './components/release/AlbumPreviews.vue'
import AlbumPlatformLinks from './components/release/AlbumPlatformLinks.vue'
import AlbumTracklist from './components/release/AlbumTracklist.vue'
import AlbumCredit from './components/release/AlbumCredit.vue'
import AlbumCovers from './components/release/AlbumCovers.vue'
import GiftItem from './components/release/GiftItem.vue'
import './styles/index.js'

declare const __SYNCTROL_THEME_OPTIONS__: {
  featureFont?: string
}

export default defineClientConfig({
  layouts: {
    Layout,
    Root,
    // VuePress core always adds an automatic /404.html page with
    // frontmatter.layout = 'NotFound'. Register the main layout under that
    // name too, otherwise rendering the 404 page throws
    // "Cannot resolve layout: NotFound" in dev, build, and SSR.
    NotFound: Layout,
  },
  enhance({ app }) {
    app.component('AlbumArtwork', AlbumArtwork)
    app.component('AlbumIdentity', AlbumIdentity)
    app.component('AlbumCopyright', AlbumCopyright)
    app.component('AlbumPreviews', AlbumPreviews)
    app.component('AlbumPlatformLinks', AlbumPlatformLinks)
    app.component('AlbumTracklist', AlbumTracklist)
    app.component('AlbumCredit', AlbumCredit)
    app.component('AlbumCovers', AlbumCovers)
    app.component('GiftItem', GiftItem)
  },
  setup() {
    const featureFont = __SYNCTROL_THEME_OPTIONS__.featureFont
    if (featureFont !== undefined && typeof document !== 'undefined') {
      document.documentElement.style.setProperty(
        '--syn-font-display',
        featureFont,
      )
    }
  },
})
