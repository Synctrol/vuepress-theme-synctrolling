import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPage } from 'vuepress/core'
import type { App, Page, ThemeObject } from 'vuepress/core'
import type { HeadConfig } from 'vuepress/shared'
import { buildColorModeBootScript } from '../client/color-mode/boot-script.js'
import { collectCspFromEntries } from '../platforms/collect-csp.js'
import { resolvePlatformTypes } from '../platforms/registry.js'
import { toClientThemeOptions } from '../shared/client-options.js'
import { resolveMultilanguage } from '../shared/multilanguage.js'
import type { SynctrolThemeOptions } from '../shared/options.js'
import { resolveThemeOptions } from '../shared/options.js'
import type { CompiledPage } from '../shared/route-types.js'
import type { HeadTag } from '../shared/seo/types.js'
import type { RouteContentPackage } from '../shared/types.js'
import { compileAssets } from './assets/compile-assets.js'
import { selectAssetPackageSources } from './assets/select-asset-package-sources.js'
import { createSynctrolBackgroundsVitePlugin } from './backgrounds/vite-plugin.js'
import { buildSite, SYNCTROL_CONTENT_DIR, type BuiltSite } from './build-site.js'
import { collectVisiblePlatformEntries } from './platforms/collect-visible-platform-entries.js'
import { writeSynctrolCspJson } from './platforms/write-csp-artifact.js'
import { buildHomeFrontmatterForPage } from './home/build-home-frontmatter.js'
import { registerHomeFormatters } from './markdown/home-formatters.js'
import { buildNewsFrontmatterForPage } from './news/attach-news-page-data.js'
import { buildPageFrontmatterForPage } from './page/attach-page-page-data.js'
import { buildReleaseFrontmatterForPage } from './release/inject-release-frontmatter.js'
import {
  buildSeoContentContext,
  emitSeoAndFeeds,
  type EmitSeoAndFeedsResult,
} from './seo/index.js'

type VuePressHeadTag = HeadConfig

function toVuePressHead(tags: readonly HeadTag[]): VuePressHeadTag[] {
  return tags.map((tag) =>
    tag.text === undefined
      ? ([tag.tag, tag.attrs ?? {}] as HeadConfig)
      : ([tag.tag, tag.attrs ?? {}, tag.text] as HeadConfig),
  )
}

const __dirname = dirname(fileURLToPath(import.meta.url))

function isContentSourcePage(page: Page): boolean {
  const relative = page.filePathRelative
  if (relative === null) return false
  return (
    relative === SYNCTROL_CONTENT_DIR ||
    relative.startsWith(`${SYNCTROL_CONTENT_DIR}/`)
  )
}

function bodyFor(
  compiled: CompiledPage,
  byDir: Map<string, RouteContentPackage>,
  contentAssets: Record<string, string>,
): string {
  if (compiled.packagePath === undefined) return ''
  let body = byDir.get(compiled.packagePath)?.locales[compiled.bodyLocale]?.body ?? ''
  // Replace the longest refs first so `./assets/x` wins over the bare
  // `assets/x` alias registered by the asset registry.
  const entries = Object.entries(contentAssets).sort(
    ([a], [b]) => b.length - a.length,
  )
  for (const [ref, publicPath] of entries) {
    body = body.split(ref).join(publicPath)
  }
  return body
}

export function synctrolTheme(options: SynctrolThemeOptions) {
  const resolved = resolveThemeOptions(options)
  const clientOptions = toClientThemeOptions(resolved)
  const boot = buildColorModeBootScript(resolved.defaultColorMode)
  let built: BuiltSite | undefined
  let seoAndFeeds: EmitSeoAndFeedsResult | undefined

  return {
    name: 'vuepress-theme-synctrolling',
    clientConfigFile: resolve(__dirname, '../client/config.js'),
    define: {
      __SYNCTROL_THEME_OPTIONS__: clientOptions,
    },
    extendsMarkdown: (md): void => {
      registerHomeFormatters(md)
    },
    onInitialized: async (app: App): Promise<void> => {
      app.siteData.head.push(['script', {}, boot])

      built = buildSite({
        sourceDir: app.dir.source(),
        configDir: app.dir.source('.vuepress'),
        options: resolved,
        base: app.options.base,
        ...(resolved.definitionsPath === undefined
          ? {}
          : { definitionsPath: resolved.definitionsPath }),
      })

      // Only packages that contribute published pages enter asset compilation
      // (Plan 03 availability). Skipped drafts must not fail on missing assets
      // or raw HTML. themeAssetPaths may be [] until a theme static root is
      // configured; themeAssetsRoot is only consulted when that list is non-empty.
      const assetSources = selectAssetPackageSources({
        compiledPackages: built.compiledPackages,
        packages: built.packages,
        pages: built.site.pages,
      })

      const assetManifest = compileAssets({
        packages: assetSources,
        themeOptions: resolved,
        configDir: app.dir.source('.vuepress'),
        themeAssetsRoot: app.dir.source('.vuepress'),
        themeAssetPaths: [],
        base: app.options.base,
        destDir: app.dir.dest(),
      })

      const seoPackageDirs = new Set(
        built.site.pages.flatMap((page) =>
          page.packagePath === undefined ? [] : [page.packagePath],
        ),
      )
      const seoContent = buildSeoContentContext({
        assetManifest,
        // Only packages that contribute published pages: skipped drafts are
        // excluded from asset compilation (Plan 04) and must not fail SEO
        // cover resolution for missing hashed assets.
        packages: built.packages.filter((pkg) => seoPackageDirs.has(pkg.dir)),
        compiledPackages: built.compiledPackages.filter((pkg) =>
          seoPackageDirs.has(pkg.dir),
        ),
        definitions: built.definitions,
        options: resolved,
      })
      seoAndFeeds = emitSeoAndFeeds({
        site: built.site,
        options: resolved,
        content: seoContent,
        base: app.options.base,
      })

      // VuePress globs every markdown file under the source dir, which would
      // otherwise publish the content tree at /content/**. Pages with a null
      // filePathRelative (the automatic 404) are kept.
      app.pages = app.pages.filter((page) => !isContentSourcePage(page))

      const byDir = new Map(built.packages.map((pkg) => [pkg.dir, pkg]))
      const allPages = built.site.pages
      const packages = built.packages
      const compiledPackages = built.compiledPackages
      const platformDefinitions = built.definitions.platforms
      const emittedSeo = seoAndFeeds

      for (const compiled of allPages) {
        const contentAssets =
          assetManifest.contentPublicPaths[compiled.identity] ?? {}
        const alternates = allPages
          .filter((p) => p.identity === compiled.identity)
          .map((p) => ({
            locale: p.locale,
            publicPath: p.url.publicPath,
          }))

        const localeMessages =
          resolved.locales[compiled.locale]?.messages ??
          resolved.locales[resolved.mainLocale].messages

        const collectionTitle = resolveMultilanguage(
          resolved.seo.collections.release.title,
          compiled.locale,
          resolved.mainLocale,
        ).text

        const release = buildReleaseFrontmatterForPage({
          compiled,
          allPages,
          packages,
          compiledPackages,
          assetManifest,
          releaseOptions: resolved.release,
          showDrafts: resolved.showDrafts,
          mainLocale: resolved.mainLocale,
          messages: localeMessages,
          collectionTitle,
          definitions: platformDefinitions,
          platformTypes: resolvePlatformTypes(resolved.platforms.types),
        })

        const resolveCoverPublicPath = (
          pkg: RouteContentPackage,
          relativePath: string,
        ): string | undefined =>
          assetManifest.contentPublicPaths[pkg.identity]?.[relativePath]

        const news = buildNewsFrontmatterForPage({
          compiled,
          allPages,
          packages,
          options: resolved,
          definitions: built.definitions,
          resolveCoverPublicPath,
          base: app.options.base,
        })

        const pageFrontmatter = buildPageFrontmatterForPage({
          compiled,
          packages,
          options: resolved,
          resolveCoverPublicPath,
        })

        const home = buildHomeFrontmatterForPage({
          compiled,
          packages,
        })

        const seoKey = `${compiled.locale}:${compiled.url.routePath}`
        const seoForPage = emittedSeo.pageSeo.get(seoKey)
        const headForPage = emittedSeo.headTagsByRoute.get(seoKey) ?? []

        const page = await createPage(app, {
          // VuePress sanitizes and re-encodes this itself; Task 3's routable
          // gate guarantees the result equals compiled.url.routePath.
          path: decodeURI(compiled.url.routePath),
          content: bodyFor(compiled, byDir, contentAssets),
          frontmatter: {
            lang:
              seoForPage?.lang ??
              resolved.locales[compiled.locale]?.lang ??
              compiled.locale,
            title: seoForPage?.title ?? compiled.title,
            ...(seoForPage?.description === undefined
              ? compiled.description === undefined
                ? {}
                : { description: compiled.description }
              : { description: seoForPage.description }),
            head: toVuePressHead(headForPage),
            synctrol: {
              identity: compiled.identity,
              locale: compiled.locale,
              contentType: compiled.contentType,
              isFallback: compiled.isFallback,
              isDraft: compiled.isDraft,
              noindex: compiled.noindex,
              bodyLocale: compiled.bodyLocale,
              canonicalLocale: compiled.canonicalLocale,
              routePath: compiled.url.routePath,
              contentAssets,
              alternates,
              platformDefinitions,
              ...(release === null ? {} : { release }),
              ...(news === null ? {} : { news }),
              ...(pageFrontmatter === null ? {} : { page: pageFrontmatter }),
              ...(home === null ? {} : { home }),
            },
          },
        })
        app.pages.push(page)
      }

      // Root language router page: in dev (and anywhere the static
      // onGenerated index.html is not used) the SPA route "/" renders the
      // Root layout, which redirects to the negotiated locale home with a
      // client-side location.replace (never a permanent HTTP redirect).
      app.pages.push(
        await createPage(app, {
          path: '/',
          content: '',
          frontmatter: { layout: 'Root' },
        }),
      )
    },
    // Vite bundler only for this plan: mutates viteOptions.plugins on the
    // opaque BundlerOptions record (webpack / other bundlers are out of scope).
    extendsBundlerOptions: (bundlerOptions, app) => {
      const configDir = app.dir.source('.vuepress')
      const viteOptions = ((
        bundlerOptions as { viteOptions?: { plugins?: unknown[] } }
      ).viteOptions ??= {})
      viteOptions.plugins ??= []
      viteOptions.plugins.push(
        createSynctrolBackgroundsVitePlugin({
          backgrounds: resolved.backgrounds,
          configDir,
        }),
      )
    },
    onGenerated: (app: App): void => {
      if (built === undefined) return

      const target = app.dir.dest('index.html')
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, built.site.rootRouterHtml, 'utf8')

      for (const file of seoAndFeeds?.filesToWrite ?? []) {
        const feedTarget = app.dir.dest(file.outputPath)
        mkdirSync(dirname(feedTarget), { recursive: true })
        writeFileSync(feedTarget, file.contents, 'utf8')
      }

      const types = resolvePlatformTypes(resolved.platforms.types)
      const platformTypes = Object.fromEntries(
        Object.entries(built.definitions.platforms).map(([key, def]) => [
          key,
          def.type,
        ]),
      )
      const entries = collectVisiblePlatformEntries({
        compiledPackages: built.compiledPackages,
        packages: built.packages,
        pages: built.site.pages,
        platformTypes,
      })
      const csp = collectCspFromEntries(entries, types)
      writeSynctrolCspJson(app.dir.dest(), csp)
      console.log(
        `[vuepress-theme-synctrolling] synctrol-csp.json: ${csp['frame-src'].length} frame-src, ${csp['media-src'].length} media-src, ${csp['connect-src'].length} connect-src`,
      )
    },
  } satisfies ThemeObject
}
