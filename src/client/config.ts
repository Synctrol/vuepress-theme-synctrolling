import { defineClientConfig } from 'vuepress/client'
import Layout from './layouts/Layout.vue'
import './styles/index.js'

declare const __SYNCTROL_THEME_OPTIONS__: {
  featureFont?: string
}

export default defineClientConfig({
  layouts: {
    Layout,
    // VuePress core always adds an automatic /404.html page with
    // frontmatter.layout = 'NotFound'. Register the main layout under that
    // name too, otherwise rendering the 404 page throws
    // "Cannot resolve layout: NotFound" in dev, build, and SSR.
    NotFound: Layout,
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
