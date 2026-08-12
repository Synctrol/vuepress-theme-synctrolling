import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineUserConfig } from 'vuepress'
import {
  enMessages,
  synctrolTheme,
  zhMessages,
} from 'vuepress-theme-synctrolling'

const configDir = resolve(fileURLToPath(new URL('.', import.meta.url)))

export default defineUserConfig({
  base: '/',
  dest: resolve(configDir, 'dist'),
  locales: {
    '/zh/': { lang: 'zh-CN' },
    '/en/': { lang: 'en-US' },
  },
  theme: synctrolTheme({
    siteUrl: 'https://example.com',
    mainLocale: 'zh',
    locales: {
      zh: { lang: 'zh-CN', label: '中文', messages: zhMessages },
      en: { lang: 'en-US', label: 'English', messages: enMessages },
    },
    copyright: 'Copyright Synctrol',
    navigation: {
      items: [
        { label: { zh: '作品', en: 'Releases' }, href: '/releases/' },
        { label: { zh: '新闻', en: 'News' }, href: '/news/' },
        { label: { zh: '关于', en: 'About' }, href: '/about/' },
      ],
    },
    seo: {
      name: { zh: 'Consumer Smoke', en: 'Consumer Smoke' },
      description: {
        zh: '主题消费冒烟站点',
        en: 'Theme consumer smoke site',
      },
      defaultImage: './assets/social-default.svg',
      organization: {
        name: 'Synctrol',
        logo: './assets/logo.svg',
      },
      collections: {
        release: {
          title: { zh: '作品', en: 'Releases' },
          description: { zh: '作品列表', en: 'Releases list' },
        },
        news: {
          title: { zh: '新闻', en: 'News' },
          description: { zh: '新闻列表', en: 'News list' },
        },
      },
    },
  }),
})
