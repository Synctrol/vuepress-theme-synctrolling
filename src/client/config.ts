import { defineClientConfig } from 'vuepress/client'
import Layout from './layouts/Layout.vue'
import './styles/index.js'

export default defineClientConfig({
  layouts: {
    Layout,
    // VuePress core always adds an automatic /404.html page with
    // frontmatter.layout = 'NotFound'. Register the main layout under that
    // name too, otherwise rendering the 404 page throws
    // "Cannot resolve layout: NotFound" in dev, build, and SSR.
    NotFound: Layout,
  },
})
