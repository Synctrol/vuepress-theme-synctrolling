# Reference DOM Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the theme's rendered DOM with synctrol.com: content container becomes `<section class="cell cell-title">`, home logo emits `h1.logo` + per-line `p.logo-sub`, footer becomes a full-width bottom bar containing the language switcher.

**Architecture:** Compiler-level logo HTML transform (extract-home-formatter-html.ts), one component change (ShellLayout.vue), and shell.css restructure (grid areas, footer bar flex, language in bar, logo class selectors).

**Tech Stack:** TypeScript, Vue SFC, CSS custom properties, markdown-it, Vitest (string-assertion CSS tests + component tests), ChromeMCP for DOM diff verification.

**Spec:** `docs/superpowers/specs/2026-08-13-reference-dom-alignment-design.md`

---

### Task 1: Home logo HTML transform (compiler)

**Files:**
- Modify: `src/compiler/home/extract-home-formatter-html.ts`
- Test: `tests/compiler/markdown/home-formatters.test.ts`

- [ ] **Step 1: Write the failing test**

Append a new `it` block to `tests/compiler/markdown/home-formatters.test.ts` (keep existing blocks):

```ts
  it('renders the extracted logo HTML with reference classes and per-line sub-labels', () => {
    const md = createMarkdownIt()
    const html = md.render(
      '::: home-logo\n# SYNCTROL\n\nWE SHAPE WAVE  \nAND DESCRIBE SOUND\n:::\n',
    )
    const extracted = extractHomeFormatterHtml(html)
    expect(extracted.logoHtml).toContain('<h1 class="logo">SYNCTROL</h1>')
    expect(extracted.logoHtml).toContain('<p class="logo-sub">WE SHAPE WAVE</p>')
    expect(extracted.logoHtml).toContain('<p class="logo-sub">AND DESCRIBE SOUND</p>')
    expect(extracted.logoHtml).not.toContain('<br')
    expect(extracted.logoHtml).toContain(
      'data-syn-formatter="home-logo"',
    )
  })
```

Check the existing test file for the `createMarkdownIt` helper name (it may be `md` constructed inline — match the existing pattern) and reuse the same imports.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/compiler/markdown/home-formatters.test.ts`
Expected: FAIL — logoHtml still contains plain `<h1>`/`<p>` without classes.

- [ ] **Step 3: Implement the transform**

In `src/compiler/home/extract-home-formatter-html.ts`, add a transform function and apply it to the returned `logoHtml`:

```ts
function toReferenceLogoHtml(logoHtml: string): string {
  return logoHtml
    .replace(/<h1>/, '<h1 class="logo">')
    .replace(/<p>([\s\S]*?)<\/p>/, (_match: string, inner: string) => {
      const lines = inner
        .split(/<br\s*\/?>/i)
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter((line) => line.length > 0)
      return lines
        .map((line) => `<p class="logo-sub">${line}</p>`)
        .join('\n')
    })
}
```

and change the return of `extractHomeFormatterHtml`:

```ts
export function extractHomeFormatterHtml(renderedHtml: string): {
  logoHtml: string
  footerHtml?: string
} {
  const extracted = extractNamedFormatter(renderedHtml, 'home-logo')
  if (extracted === undefined) {
    throw new Error('Rendered Home markdown is missing home-logo formatter HTML')
  }
  const logoHtml = toReferenceLogoHtml(extracted)

  const footerHtml = extractNamedFormatter(renderedHtml, 'home-footer')
  return footerHtml === undefined ? { logoHtml } : { logoHtml, footerHtml }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/compiler/markdown/home-formatters.test.ts tests/compiler/build-site.test.ts`
Expected: PASS (build-site asserts `stringContaining('SYNCTROL')` — still satisfied).

- [ ] **Step 5: Commit**

```bash
git add src/compiler/home/extract-home-formatter-html.ts tests/compiler/markdown/home-formatters.test.ts
git commit -m "feat: emit reference logo classes in home-logo HTML"
```

---

### Task 2: ShellLayout — section container + language switcher in footer

**Files:**
- Modify: `src/client/components/ShellLayout.vue`
- Test: `tests/client/shell/shell-layout.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/client/shell/shell-layout.test.ts` (read the file first and match its existing `mountShell` usage):

```ts
  it('renders the content container as a section and the language switcher inside the footer', () => {
    const wrapper = mountShell(ShellLayout, {
      slots: { default: '<p class="syn-main-probe">Body</p>' },
    })
    const main = wrapper.get('main.syn-main')
    const section = main.find('section.cell.cell-title')
    expect(section.exists()).toBe(true)
    expect(section.find('.syn-main-probe').exists()).toBe(true)
    const footer = wrapper.get('footer.syn-site-footer')
    expect(footer.find('.syn-language').exists()).toBe(true)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/client/shell/shell-layout.test.ts`
Expected: FAIL — no `section.cell.cell-title`, `.syn-language` not inside footer.

- [ ] **Step 3: Implement ShellLayout.vue**

Replace the `<main>` block and the footer/dock section:

```vue
<template>
  <div :class="shellClass">
    <HeaderBar />
    <main class="syn-main">
      <section class="cell cell-title">
        <slot />
      </section>
    </main>
    <Navigation />
    <SiteFooter>
      <slot name="footer" />
      <LanguageSwitcher />
    </SiteFooter>
    <div class="syn-shell__dock" aria-hidden="true" />
    <SocialLinks />
    <NavDrawer />
  </div>
</template>
```

(Remove `<LanguageSwitcher />` from its previous sibling position; keep the import.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/client/shell/shell-layout.test.ts tests/client/shell/shell-mobile.test.ts tests/client/layouts/Layout.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client/components/ShellLayout.vue tests/client/shell/shell-layout.test.ts
git commit -m "feat: render content container as section; move language switcher into footer"
```

---

### Task 3: shell.css — grid, footer bar, language in bar, logo classes

**Files:**
- Modify: `src/client/styles/shell.css`
- Test: `tests/client/styles/shell-css.test.ts`

- [ ] **Step 1: Write the failing test**

Update the existing grid-areas assertions in the first `it` block of `tests/client/styles/shell-css.test.ts` (replace `expect(css).toContain("'main footer'")`):

```ts
    expect(css).toContain("'main navigation'")
    expect(css).toContain("'main .'")
    expect(css).toContain("'footer footer'")
    expect(css).toContain("'dock dock'")
```

Append two new `it` blocks:

```ts
  it('lays the footer bar out like the reference bottom bar with the language switcher inside', () => {
    const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')
    expect(css).toMatch(/\.syn-site-footer\s*\{[^}]*display:\s*flex/)
    expect(css).toMatch(/\.syn-site-footer\s*\{[^}]*align-items:\s*center/)
    expect(css).toMatch(/\.syn-site-footer\s*\{[^}]*justify-content:\s*space-between/)
    expect(css).not.toMatch(/\.syn-language\s*\{[^}]*position:\s*fixed/)
    expect(css).toMatch(/\.syn-language\s*\{[^}]*position:\s*relative/)
  })

  it('styles the home logo with reference .logo/.logo-sub classes and full-width title cell', () => {
    const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')
    expect(css).toMatch(/\.syn-home-logo\s*\.logo\s*\{[^}]*font-size:\s*clamp\(48px,\s*9vw,\s*96px\)/)
    expect(css).toMatch(/\.syn-home-logo\s*\.logo\s*\{[^}]*font-weight:\s*900/)
    expect(css).toMatch(/\.syn-home-logo\s*\.logo-sub\s*\{[^}]*font-size:\s*14px/)
    expect(css).toMatch(/\.syn-home-logo\s*\.logo-sub\s*\{[^}]*text-transform:\s*uppercase/)
    expect(css).toMatch(/\.syn-main:has\(\.syn-home-logo\)[^{]*\.[^{}]*max-width:\s*none/)
    expect(css).toMatch(/\.syn-formatter--home-logo\s*\{[^}]*display:\s*contents/)
  })
```

Update the existing home-logo metrics test: replace its `.syn-home-logo h1` / `.syn-home-logo p` assertions with `.syn-home-logo .logo` / `.syn-home-logo .logo-sub` (same values). Update the 640px breakpoint test: `.syn-home-logo h1` → `.syn-home-logo .logo` (font-size 52px) and `.syn-home-logo p` → `.syn-home-logo .logo-sub` (font-size 10px).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/client/styles/shell-css.test.ts`
Expected: FAIL — grid areas, footer flex, `.logo` selectors missing; `.syn-language` still fixed.

- [ ] **Step 3: Implement shell.css changes**

a) Grid areas + rows in `.syn-shell`:

```css
.syn-shell {
  min-height: 100dvh;
  display: grid;
  grid-template-areas:
    'header header'
    'main navigation'
    'main .'
    'footer footer'
    'dock dock';
  grid-template-columns:
    minmax(0, 1.618fr)
    minmax(280px, 1fr);
  grid-template-rows:
    auto
    minmax(0, 1.618fr)
    minmax(0, 1fr)
    auto
    var(--syn-dock-content-clearance);
  color: var(--syn-fg);
  background: transparent;
  font-family: var(--syn-font-body);
}
```

b) `.syn-main` becomes a flex column; the content section is the flexible cell:

```css
.syn-main {
  grid-area: main;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-right: var(--syn-border-strong);
  padding: 24px 16px;
}

.syn-main > .cell {
  flex: 1;
  min-width: 0;
  width: 100%;
  max-width: var(--syn-content-width);
}

.syn-main:has(.syn-home-logo) > .cell {
  max-width: none;
}
```

c) `.syn-site-footer` gains the reference bar layout (keep existing bar colors/border/padding):

```css
.syn-site-footer {
  grid-area: footer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: var(--syn-bar-bg);
  color: var(--syn-bar-fg);
  border-top: var(--syn-border-strong);
  padding: 10px 16px;
  font-size: 13px;
  letter-spacing: 2px;
  min-height: 0;
}
```

d) `.syn-language` becomes a static flex item inside the bar (replace the fixed-position block):

```css
.syn-language {
  position: relative;
  flex-shrink: 0;
}
```

Remove the old `position: fixed; right: var(--syn-dock-right);` declarations. Keep `.syn-language__list` absolute + `bottom: calc(100% + var(--syn-dock-gap))` (pops up from the bar). Keep `.syn-language__toggle` / `__option` rules.

e) Home logo presentation (replace the Task-4 `.syn-home-logo` block):

```css
.syn-home-logo {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  text-align: right;
  min-height: 100%;
}

.syn-formatter--home-logo {
  display: contents;
}

.syn-home-logo .logo {
  font-size: clamp(48px, 9vw, 96px);
  font-weight: 900;
  line-height: 0.9;
  letter-spacing: -2px;
  margin: 0;
}

.syn-home-logo .logo-sub {
  font-size: 14px;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: var(--syn-sub-title-fg);
  margin-top: 12px;
}
```

f) 640px block: update selectors to `.syn-home-logo .logo` (52px) and `.syn-home-logo .logo-sub` (10px; letter-spacing 1px).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/client/styles/shell-css.test.ts tests/client/shell/shell-mobile.test.ts tests/client/components/LanguageSwitcher.test.ts tests/client/components/HeaderBar.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client/styles/shell.css tests/client/styles/shell-css.test.ts
git commit -m "feat: full-width footer bar with in-bar language switcher; reference logo classes"
```

---

### Task 4: End-to-end verification (DOM diff + visual)

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: typecheck clean; vitest passes except the 3 pre-existing `theme.integration.test.ts` failures (macOS tmpdir EACCES — unrelated).

- [ ] **Step 2: Rebuild + reinstall in the consumer fixture**

```bash
npm run build
rm -f vuepress-theme-synctrolling-0.1.0.tgz
npm pack --silent | tail -1
cd tests/fixtures/sites/consumer-smoke
npm install /Users/cardidi/repos/vuepress-theme-synctrolling/vuepress-theme-synctrolling-0.1.0.tgz
npx vuepress build .
```

Expected: `success VuePress build completed`.

- [ ] **Step 3: Restart the dev server** (kill old, then `nohup npx vuepress dev . > /tmp/vuepress-dev.log 2>&1 &`), verify `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/zh/` → 200.

- [ ] **Step 4: ChromeMCP DOM diff**

Open `http://localhost:8080/zh/`. Assert via evaluate_script:
1. `document.querySelector('main.syn-main > section.cell.cell-title')` exists
2. Inside it: `h1.logo` text SYNCTROL; two `p.logo-sub` (WE SHAPE WAVE / AND DESCRIBE SOUND)
3. `footer.syn-site-footer` contains `.syn-language`; footer computed style: display flex, align-items center, justify-content space-between, background black (light mode)
4. `.syn-language` computed position is not fixed; toggle visible in the bar
5. No console errors
6. Take screenshots (`tmp-dom-align-*.png`) of local vs https://synctrol.com for the user; delete them afterwards.

- [ ] **Step 5: Dark mode + other pages**

1. Cycle theme to dark on `/zh/`: footer bar inverts (white bg, black text); language toggle chip still readable.
2. Open `/zh/about/` and `/zh/news/hello/`: content renders inside `section.cell.cell-title`; no layout breakage.
3. Check console: no errors.

- [ ] **Step 6: Cleanup**

```bash
rm -f tmp-dom-align-*.png
git status --short
```

Expected: only intended changes; `.temp`/`.cache`/`*.tgz` ignored. No commit.

---

## Self-review notes

- Spec coverage: logo transform (Task 1), section container + language in footer (Task 2), grid/footer/language CSS + logo classes (Task 3), DOM diff verification (Task 4).
- Placeholder-free; exact code for every step.
- Selector consistency: `.logo`/`.logo-sub` classes used by both compiler output and CSS; `:has()` rule scoped to `.syn-main`; grid area names match the `.syn-shell` template.
- The `.syn-language` listbox keeps its absolute positioning (anchored to `.syn-language { position: relative }`).
