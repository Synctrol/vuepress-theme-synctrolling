import { defineClientConfig } from 'vuepress/client'
import Layout from './layouts/Layout.vue'
import './styles/index.js'

export default defineClientConfig({
  layouts: {
    Layout,
  },
})
