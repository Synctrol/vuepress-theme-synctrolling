# Reference Site Style Alignment (synctrol.com)

Date: 2026-08-12
Status: Approved design (user: 全站统一设计语言，保留现有结构；背景装饰不做；字体族不改)

## Context

The consumer site synctrol.com is a hand-written static page whose `style.css`
(9.2 KB) defines the Synctrol design language: black/white + 3px borders,
golden-ratio grid, black top/bottom bars, deco-colored link panels, tight
display typography. The theme (`vuepress-theme-synctrolling`) shares only the
token *names* (e.g. `--syn-font-display`) but renders with none of the
reference styles: transparent header, unstyled home logo (32px Helvetica vs
clamp(48px, 9vw, 96px) w900), no bar colors, no deco column.

This spec restyles the theme to match the reference's style and layout while
keeping the theme's existing information architecture (navigation, language
switcher, dock, drawer) and its color-mode cycle interaction.

## Out of scope (user decisions)

- **Background decorations** (grid lines / scanline / noise / flowing shapes):
  not required to match; the solid `var(--syn-bg)` background stays.
- **Font families**: no webfont, no font-family changes. Only sizes, weights,
  letter-spacing, line-height, text-transform metrics are transferred.
- **Theme toggle interaction**: the AUTO→LIGHT→DARK cycle button stays; only
  styling changes.
- **Page layout/IA**: navigation column, dock, drawer, language switcher stay
  where they are.

## Reference design facts (source: https://synctrol.com/style.css)

Light (default):
- `--bg: #fff; --fg: #000; --border: 3px solid #000`
- `--bar-bg: #000; --bar-fg: #fff` (bars are black with white text)
- gray ramp: `300: #ddd, 500: #888, 700: #555`
- `--deco-bg: #ddd; --deco-symbol-bg: #000; --deco-label-fg: #000`
- `--sub-title-fg: #555; --status-sub-fg: #888`
- Link panels sit on `--deco-bg`; hover = `background: --deco-symbol-bg; color: --deco-bg` (full inversion).

Dark (`[data-theme='dark']` or `@media (prefers-color-scheme: dark)`):
- `--bg: #000; --fg: #fff; --border: 3px solid #fff`
- `--bar-bg: #fff; --bar-fg: #000` (bars invert)
- gray ramp inverted: `300: #1a1a1a, 500: #999, 700: #aaa`
- `--deco-bg: #1a1a1a; --deco-symbol-bg: #fff; --deco-label-fg: #fff`

Typography metrics:
- `.logo` (h1): `clamp(48px, 9vw, 96px)`, `font-weight: 900`, `line-height: 0.9`,
  `letter-spacing: -2px`
- `.logo-sub` (p): `14px`, `letter-spacing: 4px`, `text-transform: uppercase`,
  `color: --sub-title-fg`, `margin-top: 12px`
- `.status-title`: `24px`, `font-weight: 900`
- `.status-sub`: `11px`, `letter-spacing: 3px`, `color: --status-sub-fg`
- bar text: `13px`, `letter-spacing: 2px`; `.theme-option`: `12px`, `letter-spacing: 1px`
- `.link-label`: `13px`, `letter-spacing: 2px`

Layout facts:
- Top bar: black bg, white fg, `border-bottom: 3px solid #000`, padding `10px 16px`
- Bottom bar: same colors, `border-top: 3px solid #000`
- Main grid: `grid-template-columns: 1.618fr 1fr` (golden ratio — theme already has this)
- Right column (`.cell-links`) sits on `--deco-bg`; link panels stack with
  `3px` borders between them and a `3px` top border on the first panel
- Mobile (≤640px): bars `11px` / padding `8px 10px`, `.logo` `52px`,
  `.logo-sub` `10px`, link panels padding `14px 16px`, gap `12px`

## Design

### 1. Tokens (src/client/styles/tokens.css)

Add, mirroring the reference exactly (prefixed `--syn-`):

```
--syn-gray-300: #ddd; --syn-gray-500: #888; --syn-gray-700: #555
--syn-bar-bg: #000; --syn-bar-fg: #fff
--syn-deco-bg: #ddd; --syn-deco-symbol-bg: #000; --syn-deco-label-fg: #000
--syn-sub-title-fg: #555; --syn-status-sub-fg: #888
```

Dark block (`:root[data-theme='dark']`):
```
--syn-bar-bg: #fff; --syn-bar-fg: #000
--syn-deco-bg: #1a1a1a; --syn-deco-symbol-bg: #fff; --syn-deco-label-fg: #fff
--syn-gray-300: #1a1a1a; --syn-gray-500: #999; --syn-gray-700: #aaa
--syn-sub-title-fg: #aaa; --syn-status-sub-fg: #999
```

Add `@media (prefers-color-scheme: dark) { :root:not([data-theme]) { ... } }`
mirroring the reference's no-explicit-choice fallback (same values as dark).

### 2. Bars (src/client/styles/shell.css)

- `.syn-header`: `background: var(--syn-bar-bg); color: var(--syn-bar-fg);`
  `border-bottom: var(--syn-border-strong)` (already); padding `10px 16px`
  (reference); header text `13px; letter-spacing: 2px`.
- `.syn-site-footer`: `background: var(--syn-bar-bg); color: var(--syn-bar-fg);`
  `border-top: var(--syn-border-strong)`; padding `10px 16px`; text
  `13px; letter-spacing: 2px`.
- Keep `.syn-header` as `grid-area: header`, footer as `grid-area: footer`
  (structure unchanged).

### 3. Deco column (navigation area)

- `.syn-navigation`: `background: var(--syn-deco-bg); color: var(--syn-deco-label-fg)`
  (the right column becomes the reference's deco/link-panel column).
- `.syn-navigation__link`: `13px; letter-spacing: 2px;` full-width block;
  `padding: 20px 24px` (reference desktop link-panel padding; `14px 16px` is
  the ≤640px mobile value); hover/focus-visible:
  `background: var(--syn-deco-symbol-bg); color: var(--syn-deco-bg)`
  (reference inversion). Remove default underline decoration; keep
  `text-decoration: none`.
- Between links: `3px` separator via `border-top: var(--syn-border-strong)`
  on items (reference `.link-panel + .link-panel`); the first item has NO
  top border (the header's `border-bottom` provides the top edge, exactly
  like the reference where the top bar's `border-bottom` borders the first
  panel).

### 4. Typography metrics (home logo + footer status)

- `.syn-formatter--home-logo` (in shell.css):
  - `h1`: `font-size: clamp(48px, 9vw, 96px); font-weight: 900; line-height: 0.9; letter-spacing: -2px`
  - `p`: `font-size: 14px; letter-spacing: 4px; text-transform: uppercase; color: var(--syn-sub-title-fg); margin-top: 12px`
  - block: `text-align: right` (reference `.cell-title`)
- `.syn-home-footer`: the theme's home footer slot renders inside the bottom
  bar (`.syn-site-footer`), so it inherits bar colors and bar text metrics
  (`13px; letter-spacing: 2px`). No extra rules needed; the reference's
  `.status-sub` color token is ported to `--syn-status-sub-fg` for future
  status-cell use but is not applied on the footer.

### 4b. Dark-mode hover bug in release.css

`release.css` uses the selector `:root.dark` which never matches (the
color-mode boot script sets `document.documentElement.dataset.theme`, not a
class). The tile/draft hover inversions therefore never apply in dark mode.
Align to the reference: `:root[data-theme='dark']` in both hover rules.

### 5. Interactive elements (dock + language)

- `.syn-social-links__link`: already `3px` border; add hover/focus-visible
  inversion `background: var(--syn-deco-symbol-bg)` with the icon
  `filter: invert(1)` in light / `invert(0)` in dark (icon images cannot
  recolor via currentColor).
- `.syn-language__toggle`, `.syn-language__option`,
  `.syn-nav-drawer__close`: `letter-spacing: 1px`; toggle keeps `3px` border;
  hover/focus-visible on toggle and options: `text-decoration: underline`
  (reference `.theme-option` behavior). Keep the existing
  `[aria-selected='true']` weight emphasis on options.
- `.syn-theme-mode__button`: `12px; letter-spacing: 1px` (reference
  `.theme-option`), hover/focus-visible underline, keep cycle behavior and
  announcement.

### 6. Responsive (≤640px)

- Header/footer: `font-size: 11px; padding: 8px 10px` (reference bar mobile).
- Logo h1: `52px`; logo-sub: `10px; letter-spacing: 1px` (reference mobile).
- Nav links: `padding: 14px 16px; font-size: 12px; letter-spacing: 1px`
  (reference mobile link-panel/label).
- Keep the existing 768px structural breakpoint and 360px dock tweaks.

### 7. Background

Unchanged: solid `var(--syn-bg)` via `.syn-background` (out of scope).

## Testing

- **tokens.test.ts (new, tests/client/styles/)**: assert the new tokens exist
  in both light and dark blocks, and the `prefers-color-scheme` fallback.
- **shell-css.test.ts (extend)**: assert bar colors, deco column rules,
  home-logo metrics, mobile 640px rules.
- **Layout.test.ts (extend)**: mount home page with home-logo frontmatter,
  assert computed styles of `h1`/`p` inside `.syn-home-logo` (happy-dom
  supports computed styles).
- **ChromeMCP verification**: side-by-side screenshots of
  https://synctrol.com and the consumer-smoke site (light + dark), checking
  bars, deco column, logo metrics, hover inversion.
- Full `npm test` (typecheck + vitest) must pass; pre-existing
  theme.integration.test.ts failures (macOS tmpdir realpath, unrelated) remain.

## Files touched

- src/client/styles/tokens.css
- src/client/styles/shell.css
- src/client/styles/release.css (dark-mode selector fix only)
- tests/client/tokens.test.ts (extend)
- tests/client/styles/shell-css.test.ts (extend)

No component `.vue` changes expected (styles only); if a hover inversion
needs a class hook, the minimal change is CSS-only via existing selectors.
