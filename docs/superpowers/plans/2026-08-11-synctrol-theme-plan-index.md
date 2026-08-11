# Synctrol Theme Implementation Plan Index

> Spec: `docs/superpowers/specs/2026-08-11-synctrol-vuepress-theme-design.md`  
> Date: 2026-08-11

This index sequences independent, testable plans for `vuepress-theme-synctrolling`. Execute them in order. Each plan produces a reviewable, verifiable deliverable before the next plan starts.

## Sequence

| # | Plan file | Deliverable |
| --- | --- | --- |
| 01 | `2026-08-11-01-package-foundation.md` | Theme package, shared types, option defaults, tokens, Vitest harness |
| 02 | `2026-08-11-02-content-compiler.md` | Content package discovery, YAML schemas, definitions, Book validation |
| 03 | `2026-08-11-03-locale-route-compiler.md` | Locale negotiation, URL segments, drafts/fallback, virtual collections |
| 04 | `2026-08-11-04-asset-pipeline.md` | Package/global/theme assets, hashing, Markdown assets, base path |
| 05 | `2026-08-11-05-global-shell.md` | Header, Navigation, Footer, SocialLinks, LanguageSwitcher, ThemeMode |
| 06 | `2026-08-11-06-background-runtime.md` | Type-based background modules with update/dispose lifecycle |
| 07 | `2026-08-11-07-platform-system.md` | Built-in platform types, custom registration, lazy embeds, CSP audit |
| 08 | `2026-08-11-08-release.md` | Release index/detail, Album/Gift Book rendering, structured data |
| 09 | `2026-08-11-09-news-and-page.md` | News indexes/tags/pagination, Page layout, list fallback behavior |
| 10 | `2026-08-11-10-seo-and-feeds.md` | Canonical, Open Graph, JSON-LD, hreflang, RSS, Sitemap |
| 11 | `2026-08-11-11-npm-package-publish.md` | Publish `vuepress-theme-synctrolling` as an npm package |

## Execution Rules

1. Use the linked plan's checkbox steps exactly.
2. Prefer `superpowers:subagent-driven-development` for execution.
3. Do not start plan *N+1* until plan *N* tests pass and the plan commit is pushed.
4. Accessibility and performance checks belonging to a subsystem live inside that plan, not only in the final publish plan.
5. Brand tokens, shell geometry, and draft/fallback rules are fixed by the spec and must not be softened by convenience configuration.
6. This repository publishes the theme package. Synctrol.com (or any other site) is a separate consumer and is not the Plan 11 deliverable.

## Current Status

- [x] Spec approved for implementation planning
- [x] Plans 01–11 written
- [ ] Execution started
