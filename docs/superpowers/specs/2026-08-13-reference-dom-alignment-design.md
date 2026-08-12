# Reference DOM Alignment (sections + footer bar + language in bar-bottom)

Date: 2026-08-13
Status: Approved design (user: DOM 几乎一致; 内容容器 = `<section>`; footer 样式一致、元素类型可变; 语言选择器移入 bar-bottom)

## Context

Previous work aligned the theme's *styles* with synctrol.com. This spec aligns the
*DOM structure* with the reference so the rendered markup is almost identical:

Reference (synctrol.com):
```
<header class="bar bar-top">…</header>
<main class="grid">
  <section class="cell cell-title"><h1 class="logo">SYNCTROL</h1><p class="logo-sub">…</p>…</section>
  <section class="cell cell-links">…</section>
  <section class="cell cell-status">…</section>
</main>
<footer class="bar bar-bottom"><span>…</span></footer>
```

## Requirements (user)

1. DOM should be almost identical to the reference.
2. The reference's `<section>` part is our content container — our content container must be a `<section>`.
3. Footer: element types may vary, but the STYLES must be identical (full-width bottom bar).
4. The language switcher moves into the bar-bottom (footer) area.

## Design

### 1. Home logo HTML (compiler)

`src/compiler/home/extract-home-formatter-html.ts` gains a transform applied to the
extracted `logoHtml` before returning:

- `<h1>` → `<h1 class="logo">`
- the logo paragraph is split on `<br>` into one `<p class="logo-sub">` per line
  (whitespace trimmed, empty lines dropped)

Input (markdown-it render of the `::: home-logo` fence):
`<h1>SYNCTROL</h1><p>WE SHAPE WAVE<br>\nAND DESCRIBE SOUND</p>`

Output:
```
<h1 class="logo">SYNCTROL</h1>
<p class="logo-sub">WE SHAPE WAVE</p>
<p class="logo-sub">AND DESCRIBE SOUND</p>
```

The `syn-formatter--home-logo` wrapper div stays (extraction + SEO depend on it).
Home content DOM after all changes:

```
<main class="syn-main">
  <section class="cell cell-title">
    <div data-testid="home-logo" class="syn-home-logo">
      <div class="syn-formatter syn-formatter--home-logo" data-syn-formatter="home-logo">
        <h1 class="logo">SYNCTROL</h1>
        <p class="logo-sub">WE SHAPE WAVE</p>
        <p class="logo-sub">AND DESCRIBE SOUND</p>
      </div>
    </div>
  </section>
</main>
```

### 2. Content container = `<section>` (ShellLayout.vue)

- Replace `<div class="syn-main__inner">` with `<section class="cell cell-title">`
  (the slot renders inside it) — all page types get the section.
- `<LanguageSwitcher />` moves from a shell sibling into `<SiteFooter>`:
  `<SiteFooter><slot name="footer" /><LanguageSwitcher /></SiteFooter>`.
- `.syn-shell__dock` and `<SocialLinks />` stay as-is (language no longer lives in the dock).

### 3. Shell grid + footer bar (shell.css)

Grid areas become (footer spans full width; bottom-right cell is empty, matching
the reference's status-cell position):

```
'header header'
'main navigation'
'main .'
'footer footer'
'dock dock'
```

Rows: `auto / minmax(0, 1.618fr) / minmax(0, 1fr) / auto / var(--syn-dock-content-clearance)`.

`.syn-site-footer` gains reference `.bar` layout:
`display: flex; align-items: center; justify-content: space-between;`
(home-footer content on the left, language switcher on the right).

### 4. Language switcher in the bar (shell.css)

- `.syn-language` loses the fixed dock positioning (`position: fixed; bottom; z-index;
  pointer-events`) — becomes a static flex item inside the footer bar with
  `position: relative` so the dropdown listbox anchors to it.
- `.syn-language__list` keeps `position: absolute; bottom: calc(100% + gap)` (pops
  upward from the bar).
- Drawer-open hiding (`.syn-shell--drawer-open .syn-language { visibility: hidden }`)
  stays.

### 5. Home logo presentation (shell.css)

- `.syn-main` becomes `display: flex; flex-direction: column`.
- `.syn-main > .cell` = `flex: 1; min-width: 0; max-width: var(--syn-content-width); width: 100%`
  (content pages keep the 760px reading width).
- `.syn-main:has(.syn-home-logo) > .cell { max-width: none }` — the home title cell
  spans the full column like the reference.
- `.syn-home-logo` = the reference `.cell-title` behavior:
  `display: flex; flex-direction: column; align-items: flex-end; justify-content: center; text-align: right; min-height: 100%`.
- `.syn-formatter--home-logo { display: contents }` so the logo/sub lines are the
  effective flex children.
- CSS selectors switch from `.syn-home-logo h1` / `.syn-home-logo p` to
  `.syn-home-logo .logo` / `.syn-home-logo .logo-sub` (same metrics as Task 4:
  clamp(48px, 9vw, 96px)/900/0.9/-2px and 14px/4px/uppercase/sub-title-fg; 640px
  overrides: 52px / 10px ls 1px).

### 6. Footer content

`.syn-home-footer` stays a `div` (element type may vary per user requirement); the
bar padding/typography already match the reference (10px 16px / 13px / ls 2px,
black bg white fg light, inverted dark).

## Tests

- `tests/compiler/markdown/home-formatters.test.ts`: add assertions that extracted
  logoHtml contains `<h1 class="logo">` and per-line `<p class="logo-sub">`.
- `tests/client/shell/shell-layout.test.ts`: assert the section exists inside
  `.syn-main` (`.syn-main > section.cell.cell-title`) and `.syn-language` renders
  inside `.syn-site-footer`.
- `tests/client/styles/shell-css.test.ts`: update grid-areas assertion
  (`'main footer'` → `'footer footer'` + `'main .'`); pin footer flex layout;
  pin `.syn-language` static-in-bar rules; switch home-logo metric selectors to
  `.logo`/`.logo-sub`; pin `:has()` full-width rule.
- `tests/client/components/LanguageSwitcher.test.ts`: unchanged (mounts standalone).
- Fixture smoke build + ChromeMCP DOM diff vs https://synctrol.com.

## Files touched

- Modify: `src/compiler/home/extract-home-formatter-html.ts`
- Modify: `src/client/components/ShellLayout.vue`
- Modify: `src/client/styles/shell.css`
- Modify: `tests/compiler/markdown/home-formatters.test.ts`
- Modify: `tests/client/shell/shell-layout.test.ts`
- Modify: `tests/client/styles/shell-css.test.ts`

No changes to: tokens.css, release.css, LanguageSwitcher.vue (logic), SiteFooter.vue,
fixture content.
