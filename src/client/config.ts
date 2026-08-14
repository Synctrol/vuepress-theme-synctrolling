import { defineClientConfig } from 'vuepress/client'
import Layout from './layouts/Layout.vue'
import Root from './layouts/Root.vue'
import Button from './components/Button.vue'
import ButtonGroup from './components/ButtonGroup.vue'
import AlbumArtwork from './components/release/AlbumArtwork.vue'
import AlbumIdentity from './components/release/AlbumIdentity.vue'
import AlbumTracklist from './components/release/AlbumTracklist.vue'
import AlbumCredit from './components/release/AlbumCredit.vue'
import AlbumCovers from './components/release/AlbumCovers.vue'
import AlbumPlatform from './components/release/AlbumPlatform.vue'
import GiftItem from './components/release/GiftItem.vue'
import TabPanel from './components/release/TabPanel.vue'
import TabView from './components/release/TabView.vue'
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
    app.component('Button', Button)
    app.component('ButtonGroup', ButtonGroup)
    app.component('AlbumArtwork', AlbumArtwork)
    app.component('AlbumIdentity', AlbumIdentity)
    app.component('AlbumTracklist', AlbumTracklist)
    app.component('AlbumCredit', AlbumCredit)
    app.component('AlbumCovers', AlbumCovers)
    app.component('AlbumPlatform', AlbumPlatform)
    app.component('GiftItem', GiftItem)
    app.component('TabPanel', TabPanel)
    app.component('TabView', TabView)
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
