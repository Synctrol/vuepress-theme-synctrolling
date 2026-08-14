import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { viteBundler } from '@vuepress/bundler-vite'
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
  bundler: viteBundler(),
  head: [
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap',
      },
    ],
  ],
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
    topbarText: 'SYNCTROL © 2026',
    footbarText: '敬请期待 · STAY TUNED',
    featureFont: "'Archivo Black', 'Arial Black', Arial, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif",
    navigation: {
      items: [
        {
          label: 'RELEASE',
          href: '/releases/',
          icon: '/assets/icons/github.svg',
        },
        { label: 'NEWS', href: '/news/' },
        { label: 'ABOUT', href: '/about/' },
      ],
    },
    socialLinks: {
      items: [
        {
          label: 'Forums',
          icon: '/assets/icons/forums.svg',
          url: 'https://github.com/orgs/Synctrol/discussions',
        },
        {
          label: 'Bilibili',
          icon: '/assets/icons/bilibili.svg',
          url: 'https://space.bilibili.com/3546856898431612',
        },
        {
          label: 'GitHub',
          icon: '/assets/icons/github.svg',
          url: 'https://github.com/synctrol',
        },
      ],
    },
    linkCloud: {
      items: [
        { label: { zh: '文档', en: 'Docs' }, href: '/docs/' },
        { label: { zh: '博客', en: 'Blog' }, href: '/blog/' },
        { label: { zh: '联系方式', en: 'Contact' }, href: '/contact/' },
        { label: { zh: '支持', en: 'Support' }, href: '/support/' },
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
