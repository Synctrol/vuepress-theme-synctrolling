# Changelog

All notable changes to `vuepress-theme-synctrolling` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- 重写中文 README：按步骤说明如何安装和配置主题；标明仅供 Synctrol 团队使用，改设计请自行 fork。
- 新闻文章详情 URL 与新闻索引/标签 URL 解耦：新增 `news.articleUrlSegment`（默认 `article`），详情 URL 改为 `/{news.articleUrlSegment}/{slug}/`，索引与标签仍用 `news.urlSegment`。

### Fixed

- 消费端冒烟检查与现行根语言路由器对齐：根页只做跳转，不再要求可见语言链接。

## [0.1.0] - 2026-08-11

### Added

- First public release of the Synctrol VuePress 2 theme package.
- Content compiler for colocated `home`, `release`, `news`, and `page` packages.
- Locale route compiler with mandatory locale prefixes, fallback handling, drafts, collections, and root language router emission for static hosts.
- Asset pipeline with hashed content/global/theme URLs.
- Global shell with navigation, footer, social links, language switching, and color mode.
- Background runtime by content type.
- Platform registry, embeds, links, and `synctrol-csp.json` audit artifact.
- Release index/detail rendering with optional Album/Gift books.
- News indexes, tag archives, pagination, and general Page/Home rendering.
- SEO metadata, JSON-LD, locale RSS, and Sitemap generation.
- Publish pipeline with `dist/` build, pack/export assertions, consumer fixture smoke, and tag-based npm publish workflow.
