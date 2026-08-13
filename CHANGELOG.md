# Changelog

All notable changes to `vuepress-theme-synctrolling` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- 重写中文 README：按步骤说明如何安装和配置主题；标明仅供 Synctrol 团队使用，改设计请自行 fork。

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
