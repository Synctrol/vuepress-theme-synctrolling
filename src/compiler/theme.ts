import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPage } from 'vuepress/core'
import type { App, Page, ThemeObject } from 'vuepress/core'
import { buildColorModeBootScript } from '../client/color-mode/boot-script.js'
import { collectCspFromEntries } from '../platforms/collect-csp.js'
import { resolvePlatformTypes } from '../platforms/registry.js'
import { toClientThemeOptions } from '../shared/client-options.js'
import { resolveMultilanguage } from '../shared/multilanguage.js'
import type { SynctrolThemeOptions } from '../shared/options.js'
import { resolveThemeOptions } from '../shared/options.js'
import type { CompiledPage } from '../shared/route-types.js'
import type { RouteContentPackage } from '../shared/types.js'
import { compileAssets } from './assets/compile-assets.js'
import { selectAssetPackageSources } from './assets/select-asset-package-sources.js'
import { createSynctrolBackgroundsVitePlugin } from './backgrounds/vite-plugin.js'
import { buildSite, SYNCTROL_CONTENT_DIR, type BuiltSite } from './build-site.js'
import { collectVisiblePlatformEntries } from './platforms/collect-visible-platform-entries.js'
import { writeSynctrolCspJson } from './platforms/write-csp-artifact.js'
import { buildReleaseFrontmatterForPage } from './release/inject-release-frontmatter.js'

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
): string {
  if (compiled.packagePath === undefined) return ''
  return byDir.get(compiled.packagePath)?.locales[compiled.bodyLocale]?.body ?? ''
}

export function synctrolTheme(options: SynctrolThemeOptions) {
  const resolved = resolveThemeOptions(options)
  const clientOptions = toClientThemeOptions(resolved)
  const boot = buildColorModeBootScript(resolved.defaultColorMode)
  let built: BuiltSite | undefined

  return {
    name: 'vuepress-theme-synctrolling',
    clientConfigFile: resolve(__dirname, '../client/config.js'),
    define: {
      __SYNCTROL_THEME_OPTIONS__: clientOptions,
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

      // VuePress globs every markdown file under the source dir, which would
      // otherwise publish the content tree at /content/**. Pages with a null
      // filePathRelative (the automatic 404) are kept.
      app.pages = app.pages.filter((page) => !isContentSourcePage(page))

      const byDir = new Map(built.packages.map((pkg) => [pkg.dir, pkg]))
      const allPages = built.site.pages
      const packages = built.packages
      const compiledPackages = built.compiledPackages
      const platformDefinitions = built.definitions.platforms

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
          formatDate: (yyyyMmDd) => {
            // minimal stable formatter for v1; locale dateFormat from options may be used
            return yyyyMmDd
          },
          releaseIndexHrefForLocale: (locale) => {
            const index = allPages.find(
              (p) =>
                p.locale === locale &&
                p.contentType === 'release-collection' &&
                p.collection?.page === 1,
            )
            // Only a real emitted collection page yields a return link.
            // When index is disabled (or missing), return null — no synthetic href.
            return index?.url.publicPath ?? null
          },
        })

        const page = await createPage(app, {
          // VuePress sanitizes and re-encodes this itself; Task 3's routable
          // gate guarantees the result equals compiled.url.routePath.
          path: decodeURI(compiled.url.routePath),
          content: bodyFor(compiled, byDir),
          frontmatter: {
            lang: resolved.locales[compiled.locale]?.lang ?? compiled.locale,
            title: compiled.title,
            ...(compiled.description === undefined
              ? {}
              : { description: compiled.description }),
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
            },
          },
        })
        app.pages.push(page)
      }
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
