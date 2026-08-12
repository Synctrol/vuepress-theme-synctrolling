import type { LocaleMarkdown, ContentType } from './types.js'
import type { ResolvedSynctrolThemeOptions } from './options.js'

export type AssetKind = 'content' | 'global' | 'theme'

export interface ResolvedAsset {
  kind: AssetKind
  /** Absolute filesystem path of the source file */
  sourcePath: string
  /** Locale-free logical path beginning with /assets/… including content hash */
  assetPath: string
  /** VuePress-base-prefixed browser path */
  publicPath: string
  /** siteUrl + publicPath */
  absoluteUrl: string
  /** SHA-256 truncated content hash used in the filename */
  contentHash: string
}

export interface AssetManifest {
  assets: ResolvedAsset[]
  /** Absolute source path → ResolvedAsset */
  bySourcePath: Record<string, ResolvedAsset>
  /**
   * Per content package identity → original relative ref → publicPath.
   * Identity uses Plan 02 rules: `home` or `{type}:{slug}`.
   */
  contentPublicPaths: Record<string, Record<string, string>>
  /** Config-relative original ref → publicPath for hashed global option assets */
  globalPublicPaths: Record<string, string>
}

/** Subset of Plan 03 LocaleMarkdown used for Markdown asset scanning. */
export type AssetLocaleMarkdown = Pick<LocaleMarkdown, 'filePath' | 'body'>

export interface AssetPackageSource {
  /** Absolute package directory (contains content.yml) */
  packageDir: string
  type: ContentType
  /** null for Home — emits /assets/content/home/… */
  slug: string | null
  /** Package-relative refs already known from manifest/book (./assets/…) */
  declaredPaths: string[]
  localeMarkdown: AssetLocaleMarkdown[]
}

export type CompileAssetsThemeOptions = Pick<
  ResolvedSynctrolThemeOptions,
  'siteUrl' | 'socialLinks' | 'release' | 'seo'
>

export interface CompileAssetsOptions {
  packages: AssetPackageSource[]
  themeOptions: CompileAssetsThemeOptions
  /** Absolute directory containing the VuePress config file */
  configDir: string
  /** Absolute directory of explicit theme static assets (package theme/assets) */
  themeAssetsRoot: string
  /** Explicit theme-relative paths under themeAssetsRoot to hash (may be empty) */
  themeAssetPaths: string[]
  /** VuePress base, e.g. `/` or `/docs/` */
  base: string
  /** Absolute build destination root; hashed files are written here */
  destDir: string
}
