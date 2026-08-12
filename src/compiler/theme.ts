import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { createPage } from 'vuepress/core'
import type { App, Page, ThemeObject } from 'vuepress/core'
import { toClientThemeOptions } from '../shared/client-options.js'
import type { SynctrolThemeOptions } from '../shared/options.js'
import { resolveThemeOptions } from '../shared/options.js'
import type { CompiledPage } from '../shared/route-types.js'
import type { RouteContentPackage } from '../shared/types.js'
import { compileAssets } from './assets/compile-assets.js'
import { toAssetPackageSource } from './assets/to-asset-package-source.js'
import { buildSite, SYNCTROL_CONTENT_DIR, type BuiltSite } from './build-site.js'

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
  let built: BuiltSite | undefined

  return {
    name: 'vuepress-theme-synctrolling',
    define: {
      __SYNCTROL_THEME_OPTIONS__: clientOptions,
    },
    onInitialized: async (app: App): Promise<void> => {
      built = buildSite({
        sourceDir: app.dir.source(),
        configDir: app.dir.source('.vuepress'),
        options: resolved,
        base: app.options.base,
        ...(resolved.definitionsPath === undefined
          ? {}
          : { definitionsPath: resolved.definitionsPath }),
      })

      // themeAssetPaths may be [] until a theme static root is configured;
      // themeAssetsRoot is only consulted when that list is non-empty.
      const assetSources = built.compiledPackages.map((compiled) => {
        const routed = built!.packages.find(
          (pkg) => pkg.dir === compiled.dir && pkg.identity === compiled.identity,
        )
        if (!routed) {
          throw new Error(`Missing routed package for ${compiled.identity}`)
        }
        return toAssetPackageSource(compiled, routed)
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

      for (const compiled of built.site.pages) {
        const contentAssets =
          assetManifest.contentPublicPaths[compiled.identity] ?? {}
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
              contentAssets,
            },
          },
        })
        app.pages.push(page)
      }
    },
    onGenerated: (app: App): void => {
      if (built === undefined) return
      const target = app.dir.dest('index.html')
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, built.site.rootRouterHtml, 'utf8')
    },
  } satisfies ThemeObject
}
