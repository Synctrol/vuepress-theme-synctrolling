import { describe, expect, it } from 'vitest'
import * as compilerApi from '../src/compiler/index'
import type {
  CompileContentOptions,
  CompileContentResult,
  DiagnosticSeverity,
  SynctrolDiagnostic,
} from '../src/compiler/index'
import {
  assertNoCspMetaInjection,
  buildPageSeo,
  buildSeoContentContext,
  collectPackageDeclaredPaths,
  compileAssets,
  compileContent,
  createDiagnostic,
  discoverContentPackages,
  emitSeoAndFeeds,
  enMessages,
  fail,
  formatMessage,
  isDiagnosticError,
  loadContentDefinitions,
  parseBook,
  parseContentManifest,
  resolveMultilanguage,
  resolveDefinitionsPath,
  resolvePlatformTypes,
  resolveThemeOptions,
  SynctrolDiagnosticError,
  toAssetPackageSource,
  validatePlatformEntry,
  writeSynctrolCspJson,
  zhMessages,
} from '../src/index'
import type { CompiledContentPackage } from '../src/index'
import * as clientApi from '../src/client/index'

describe('root public exports', () => {
  it('exposes messages, the multilanguage resolver, and option resolution', () => {
    expect(zhMessages.draft).toBe('草稿')
    expect(enMessages.draft).toBe('DRAFT')
    expect(resolveMultilanguage('Synctrol', 'en', 'zh')).toEqual({
      text: 'Synctrol',
      locale: 'en',
      fellBack: false,
    })
    expect(typeof resolveThemeOptions).toBe('function')
  })

  it('exposes the compiler API from its barrel and the package root', () => {
    const rootExports = [
      compileContent,
      createDiagnostic,
      discoverContentPackages,
      fail,
      isDiagnosticError,
      loadContentDefinitions,
      parseBook,
      parseContentManifest,
      resolveDefinitionsPath,
      SynctrolDiagnosticError,
      validatePlatformEntry,
      compilerApi.buildReleaseIndexModel,
      compilerApi.buildReleaseDetailModel,
      compilerApi.buildReleaseFrontmatterForPage,
    ]

    expect(rootExports.every((value) => typeof value === 'function')).toBe(
      true,
    )
    expect(Object.keys(compilerApi).sort()).toEqual([
      'SynctrolDiagnosticError',
      'buildReleaseDetailModel',
      'buildReleaseFrontmatterForPage',
      'buildReleaseIndexModel',
      'compileContent',
      'createDiagnostic',
      'discoverContentPackages',
      'fail',
      'isDiagnosticError',
      'loadContentDefinitions',
      'parseBook',
      'parseContentManifest',
      'resolveDefinitionsPath',
      'validatePlatformEntry',
    ])
    expect(compilerApi).not.toHaveProperty('assertMultilanguage')
    expect(compilerApi).not.toHaveProperty('loadYamlFile')
    expect(compilerApi).not.toHaveProperty('parseAlbumBook')
    expect(compilerApi).not.toHaveProperty('parseGiftBook')
  })

  it('exposes the Node asset API from the package root (not the Plan-02 compiler barrel)', () => {
    expect(typeof compileAssets).toBe('function')
    expect(typeof toAssetPackageSource).toBe('function')
    expect(typeof collectPackageDeclaredPaths).toBe('function')
    expect(compilerApi).not.toHaveProperty('compileAssets')
    expect(compilerApi).not.toHaveProperty('toAssetPackageSource')
    expect(compilerApi).not.toHaveProperty('collectPackageDeclaredPaths')
  })

  it('exposes platform registry and CSP helpers from the package root', () => {
    expect(typeof resolvePlatformTypes).toBe('function')
    expect(typeof formatMessage).toBe('function')
    expect(typeof writeSynctrolCspJson).toBe('function')
    expect(typeof assertNoCspMetaInjection).toBe('function')
    expect(Object.keys(resolvePlatformTypes({}))).toEqual(
      expect.arrayContaining(['youtube_player', 'bilibili_player', 'link']),
    )
  })

  it('exposes SEO emit helpers from the package root', () => {
    expect(typeof buildPageSeo).toBe('function')
    expect(typeof buildSeoContentContext).toBe('function')
    expect(typeof emitSeoAndFeeds).toBe('function')
  })

  it('exposes PlatformEmbed and PlatformLinks from the client entry (no SFC re-exports)', () => {
    expect(clientApi).toHaveProperty('PlatformEmbed')
    expect(clientApi).toHaveProperty('PlatformLinks')
    expect(clientApi).toHaveProperty('resolveContentAsset')
    expect(clientApi).not.toHaveProperty('Layout')
    expect(clientApi).not.toHaveProperty('BackgroundHost')
  })

  it('exposes compiler and compiled-package type contracts', () => {
    const severity: DiagnosticSeverity = 'warning'
    const diagnostic: SynctrolDiagnostic = {
      severity,
      code: 'EXAMPLE',
      message: 'example',
    }
    const options: CompileContentOptions = {
      contentRoot: '/site/content',
      sourceDir: '/site',
      configDir: '/site/.vuepress',
      mainLocale: 'zh',
    }
    const pkg: CompiledContentPackage = {
      dir: '/site/content/home',
      identity: 'home',
      manifest: { type: 'home', draft: false },
    }
    const result: CompileContentResult = {
      definitions: { tags: {}, platforms: {} },
      packages: [pkg],
      warnings: [diagnostic],
    }

    expect(options.mainLocale).toBe('zh')
    expect(result.packages[0].identity).toBe('home')
    expect(result.warnings[0].severity).toBe('warning')
  })
})
