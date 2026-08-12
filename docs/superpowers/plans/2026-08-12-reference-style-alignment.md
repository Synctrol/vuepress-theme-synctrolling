# Reference Site Style Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Synctrol VuePress theme to match the reference site synctrol.com's style and layout (colors, bars, deco column, typography metrics, hover inversions, responsive) while keeping the theme's existing structure and interactions.

**Architecture:** CSS-only changes. Port the reference `style.css` design tokens into `src/client/styles/tokens.css` (prefixed `--syn-`), then apply them in `shell.css` (bars, deco navigation column, home logo metrics, controls, responsive) and fix the dark-mode selector in `release.css`. No `.vue` component changes.

**Tech Stack:** CSS custom properties, VuePress theme client styles, Vitest (string-assertion CSS tests per repo convention), ChromeMCP for visual verification.

**Spec:** `docs/superpowers/specs/2026-08-12-reference-style-alignment-design.md`

---

### Task 1: Design tokens (light + dark + prefers-color-scheme)

**Files:**
- Modify: `src/client/styles/tokens.css`
- Test: `tests/client/tokens.test.ts`

- [ ] **Step 1: Write the failing test**

Append three new `it` blocks to `tests/client/tokens.test.ts` (keep the existing `it` block):

```ts
describe('design tokens', () => {
  it('defines the fixed synctrol brand variables', () => {
    // ... existing assertions, unchanged ...
  })

  it('ports the reference bar/deco/gray tokens in light mode', () => {
    const css = readFileSync(
      resolve('src/client/styles/tokens.css'),
      'utf8',
    )
    expect(css).toContain('--syn-gray-300: #ddd;')
    expect(css).toContain('--syn-gray-500: #888;')
    expect(css).toContain('--syn-gray-700: #555;')
    expect(css).toContain('--syn-bar-bg: var(--syn-black);')
    expect(css).toContain('--syn-bar-fg: var(--syn-white);')
    expect(css).toContain('--syn-deco-bg: var(--syn-gray-300);')
    expect(css).toContain('--syn-deco-symbol-bg: var(--syn-black);')
    expect(css).toContain('--syn-deco-label-fg: var(--syn-black);')
    expect(css).toContain('--syn-sub-title-fg: var(--syn-gray-700);')
    expect(css).toContain('--syn-status-sub-fg: var(--syn-gray-500);')
  })

  it('inverts the tokens in dark mode', () => {
    const css = readFileSync(
      resolve('src/client/styles/tokens.css'),
      'utf8',
    )
    const dark = css.slice(css.indexOf(":root[data-theme='dark']"))
    expect(dark).toContain('--syn-gray-300: #1a1a1a;')
    expect(dark).toContain('--syn-gray-500: #999;')
    expect(dark).toContain('--syn-gray-700: #aaa;')
    expect(dark).toContain('--syn-bar-bg: var(--syn-white);')
    expect(dark).toContain('--syn-bar-fg: var(--syn-black);')
    expect(dark).toContain('--syn-deco-bg: var(--syn-gray-300);')
    expect(dark).toContain('--syn-deco-symbol-bg: var(--syn-white);')
    expect(dark).toContain('--syn-deco-label-fg: var(--syn-white);')
    expect(dark).toContain('--syn-sub-title-fg: var(--syn-gray-700);')
    expect(dark).toContain('--syn-status-sub-fg: var(--syn-gray-500);')
  })

  it('mirrors the reference prefers-color-scheme fallback', () => {
    const css = readFileSync(
      resolve('src/client/styles/tokens.css'),
      'utf8',
    )
    expect(css).toContain('@media (prefers-color-scheme: dark)')
    expect(css).toContain(':root:not([data-theme])')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/client/tokens.test.ts`
Expected: FAIL — `expected '--syn-gray-300: #ddd;' to contain` (tokens missing).

- [ ] **Step 3: Implement tokens.css**

Replace the entire contents of `src/client/styles/tokens.css` with:

```css
/* src/client/styles/tokens.css */
:root {
  color-scheme: light dark;

  --syn-black: #000;
  --syn-white: #fff;
  --syn-fg: var(--syn-black);
  --syn-bg: var(--syn-white);
  --syn-border-strong: 3px solid currentColor;
  --syn-border-subtle: 1px solid currentColor;
  --syn-radius: 0;
  --syn-content-width: 760px;
  --syn-artwork-width: 660px;

  --syn-dock-bottom: max(16px, env(safe-area-inset-bottom));
  --syn-dock-left: max(16px, env(safe-area-inset-left));
  --syn-dock-right: max(16px, env(safe-area-inset-right));
  --syn-dock-gap: 12px;
  --syn-dock-control-size: 40px;
  --syn-dock-content-clearance: 72px;

  --syn-font-display: 'Archivo Black', 'Arial Black', Arial, 'PingFang SC',
    'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif;
  --syn-font-body: 'Helvetica Neue', Arial, 'PingFang SC', 'Microsoft YaHei',
    'Noto Sans CJK SC', sans-serif;

  /* Reference site design system (synctrol.com/style.css) */
  --syn-gray-300: #ddd;
  --syn-gray-500: #888;
  --syn-gray-700: #555;
  --syn-bar-bg: var(--syn-black);
  --syn-bar-fg: var(--syn-white);
  --syn-deco-bg: var(--syn-gray-300);
  --syn-deco-symbol-bg: var(--syn-black);
  --syn-deco-label-fg: var(--syn-black);
  --syn-sub-title-fg: var(--syn-gray-700);
  --syn-status-sub-fg: var(--syn-gray-500);
}

:root[data-theme='dark'] {
  --syn-fg: var(--syn-white);
  --syn-bg: var(--syn-black);

  --syn-gray-300: #1a1a1a;
  --syn-gray-500: #999;
  --syn-gray-700: #aaa;
  --syn-bar-bg: var(--syn-white);
  --syn-bar-fg: var(--syn-black);
  --syn-deco-bg: var(--syn-gray-300);
  --syn-deco-symbol-bg: var(--syn-white);
  --syn-deco-label-fg: var(--syn-white);
  --syn-sub-title-fg: var(--syn-gray-700);
  --syn-status-sub-fg: var(--syn-gray-500);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --syn-fg: var(--syn-white);
    --syn-bg: var(--syn-black);

    --syn-gray-300: #1a1a1a;
    --syn-gray-500: #999;
    --syn-gray-700: #aaa;
    --syn-bar-bg: var(--syn-white);
    --syn-bar-fg: var(--syn-black);
    --syn-deco-bg: var(--syn-gray-300);
    --syn-deco-symbol-bg: var(--syn-white);
    --syn-deco-label-fg: var(--syn-white);
    --syn-sub-title-fg: var(--syn-gray-700);
    --syn-status-sub-fg: var(--syn-gray-500);
  }
}
```

Note: the `prefers-color-scheme` block duplicates the dark values on purpose — it mirrors the reference `style.css` exactly and cannot share a selector list across a media query.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/client/tokens.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/client/styles/tokens.css tests/client/tokens.test.ts
git commit -m "feat: port reference bar/deco/gray design tokens"
```

---

### Task 2: Bars and theme toggle styling

**Files:**
- Modify: `src/client/styles/shell.css`
- Test: `tests/client/styles/shell-css.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/client/styles/shell-css.test.ts`:

```ts
  it('styles header and footer as reference bars', () => {
    const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')
    expect(css).toMatch(/\.syn-header\s*\{[^}]*background:\s*var\(--syn-bar-bg\)/)
    expect(css).toMatch(/\.syn-header\s*\{[^}]*color:\s*var\(--syn-bar-fg\)/)
    expect(css).toMatch(/\.syn-header\s*\{[^}]*letter-spacing:\s*2px/)
    expect(css).toMatch(/\.syn-header\s*\{[^}]*padding:\s*10px 16px/)
    expect(css).toMatch(/\.syn-site-footer\s*\{[^}]*background:\s*var\(--syn-bar-bg\)/)
    expect(css).toMatch(/\.syn-site-footer\s*\{[^}]*color:\s*var\(--syn-bar-fg\)/)
    expect(css).toMatch(/\.syn-site-footer\s*\{[^}]*border-top:\s*var\(--syn-border-strong\)/)
  })

  it('styles the theme toggle like the reference theme-option', () => {
    const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')
    expect(css).toMatch(/\.syn-theme-mode__button\s*\{[^}]*font-size:\s*12px/)
    expect(css).toMatch(/\.syn-theme-mode__button\s*\{[^}]*letter-spacing:\s*1px/)
    expect(css).toMatch(/\.syn-theme-mode__button\s*\{[^}]*color:\s*inherit/)
    expect(css).toMatch(/\.syn-theme-mode__button:hover[^{]*\{[^}]*text-decoration:\s*underline/)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/client/styles/shell-css.test.ts`
Expected: FAIL — no `.syn-theme-mode__button` rules and no bar colors yet.

- [ ] **Step 3: Implement the styles**

In `src/client/styles/shell.css`:

Replace the `.syn-header` rule (currently `padding: 12px 16px;`) with:

```css
.syn-header {
  grid-area: header;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--syn-bar-bg);
  color: var(--syn-bar-fg);
  border-bottom: var(--syn-border-strong);
  padding: 10px 16px;
  font-size: 13px;
  letter-spacing: 2px;
}
```

Replace the `.syn-site-footer` rule with:

```css
.syn-site-footer {
  grid-area: footer;
  background: var(--syn-bar-bg);
  color: var(--syn-bar-fg);
  border-top: var(--syn-border-strong);
  padding: 10px 16px;
  font-size: 13px;
  letter-spacing: 2px;
  min-height: 0;
}
```

Append after the `.syn-header__menu` rule:

```css
.syn-theme-mode__button {
  font: inherit;
  font-size: 12px;
  letter-spacing: 1px;
  color: inherit;
  background: transparent;
  border: none;
  padding: 2px 4px;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.syn-theme-mode__button:hover,
.syn-theme-mode__button:focus-visible {
  text-decoration: underline;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/client/styles/shell-css.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client/styles/shell.css tests/client/styles/shell-css.test.ts
git commit -m "feat: style header/footer as reference bars and align theme toggle"
```

---

### Task 3: Deco navigation column (link-panel style)

**Files:**
- Modify: `src/client/styles/shell.css`
- Test: `tests/client/styles/shell-css.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/client/styles/shell-css.test.ts`:

```ts
  it('renders the navigation column as a deco link-panel column', () => {
    const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')
    expect(css).toMatch(/\.syn-navigation\s*\{[^}]*background:\s*var\(--syn-deco-bg\)/)
    expect(css).toMatch(/\.syn-navigation\s*\{[^}]*color:\s*var\(--syn-deco-label-fg\)/)
    expect(css).toMatch(/\.syn-navigation\s*\{[^}]*padding:\s*0/)
    expect(css).toMatch(/\.syn-navigation__link\s*\{[^}]*display:\s*block/)
    expect(css).toMatch(/\.syn-navigation__link\s*\{[^}]*padding:\s*20px 24px/)
    expect(css).toMatch(/\.syn-navigation__link\s*\{[^}]*font-size:\s*13px/)
    expect(css).toMatch(/\.syn-navigation__link\s*\{[^}]*letter-spacing:\s*2px/)
    expect(css).toMatch(/\.syn-navigation__link\s*\{[^}]*text-decoration:\s*none/)
    expect(css).toMatch(/\.syn-navigation__link:hover[^{]*\{[^}]*background:\s*var\(--syn-deco-symbol-bg\)/)
    expect(css).toMatch(/\.syn-navigation__link:hover[^{]*\{[^}]*color:\s*var\(--syn-deco-bg\)/)
    expect(css).toMatch(/\.syn-navigation__item\s*\+\s*\.syn-navigation__item\s*\{[^}]*border-block-start:\s*var\(--syn-border-strong\)/)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/client/styles/shell-css.test.ts`
Expected: FAIL (rules missing).

- [ ] **Step 3: Implement the styles**

In `src/client/styles/shell.css`:

Replace the `.syn-navigation` rule (currently `padding: 16px;`) with:

```css
.syn-navigation {
  grid-area: navigation;
  background: var(--syn-deco-bg);
  color: var(--syn-deco-label-fg);
  border-bottom: var(--syn-border-strong);
  padding: 0;
}

.syn-navigation__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.syn-navigation__item + .syn-navigation__item {
  border-block-start: var(--syn-border-strong);
}

.syn-navigation__link {
  display: block;
  padding: 20px 24px;
  color: var(--syn-deco-label-fg);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 2px;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.syn-navigation__link:hover,
.syn-navigation__link:focus-visible {
  background: var(--syn-deco-symbol-bg);
  color: var(--syn-deco-bg);
}
```

Keep the existing mobile rule `@media (max-width: 768px)` `.syn-shell > .syn-navigation { display: none; }` untouched.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/client/styles/shell-css.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client/styles/shell.css tests/client/styles/shell-css.test.ts
git commit -m "feat: render navigation column as reference deco link-panel column"
```

---

### Task 4: Home logo metrics + release.css dark-mode selector fix

**Files:**
- Modify: `src/client/styles/shell.css`
- Modify: `src/client/styles/release.css`
- Test: `tests/client/styles/shell-css.test.ts`
- Create: `tests/client/styles/release-css.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `tests/client/styles/shell-css.test.ts`:

```ts
  it('applies reference display metrics to the home logo', () => {
    const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')
    expect(css).toMatch(/\.syn-home-logo\s*\{[^}]*text-align:\s*right/)
    expect(css).toMatch(/\.syn-home-logo h1\s*\{[^}]*font-size:\s*clamp\(48px,\s*9vw,\s*96px\)/)
    expect(css).toMatch(/\.syn-home-logo h1\s*\{[^}]*font-weight:\s*900/)
    expect(css).toMatch(/\.syn-home-logo h1\s*\{[^}]*line-height:\s*0\.9/)
    expect(css).toMatch(/\.syn-home-logo h1\s*\{[^}]*letter-spacing:\s*-2px/)
    expect(css).toMatch(/\.syn-home-logo p\s*\{[^}]*font-size:\s*14px/)
    expect(css).toMatch(/\.syn-home-logo p\s*\{[^}]*letter-spacing:\s*4px/)
    expect(css).toMatch(/\.syn-home-logo p\s*\{[^}]*text-transform:\s*uppercase/)
    expect(css).toMatch(/\.syn-home-logo p\s*\{[^}]*color:\s*var\(--syn-sub-title-fg\)/)
  })
```

Create `tests/client/styles/release-css.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('release.css', () => {
  const css = readFileSync(resolve('src/client/styles/release.css'), 'utf8')

  it('uses the data-theme selector for dark-mode hover inversion', () => {
    expect(css).not.toMatch(/:root\.dark/)
    expect(css).toMatch(
      /:root\[data-theme='dark'\]\s*\.syn-release-tile:hover/,
    )
    expect(css).toMatch(
      /:root\[data-theme='dark'\]\s*\.syn-release-tile:focus-visible/,
    )
    expect(css).toMatch(
      /:root\[data-theme='dark'\]\s*\.syn-draft-badge/,
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/client/styles/shell-css.test.ts tests/client/styles/release-css.test.ts`
Expected: FAIL — missing home-logo rules; `:root.dark` still present in release.css.

- [ ] **Step 3: Implement the styles**

In `src/client/styles/shell.css`, append:

```css
.syn-home-logo {
  text-align: right;
}

.syn-home-logo h1 {
  font-size: clamp(48px, 9vw, 96px);
  font-weight: 900;
  line-height: 0.9;
  letter-spacing: -2px;
  margin: 0;
}

.syn-home-logo p {
  font-size: 14px;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: var(--syn-sub-title-fg);
  margin-top: 12px;
}
```

In `src/client/styles/release.css`, replace both occurrences of the `:root.dark` selector with `:root[data-theme='dark']`:

```css
:root[data-theme='dark'] .syn-release-tile:hover,
:root[data-theme='dark'] .syn-release-tile:focus-visible {
  background: var(--syn-white);
  color: var(--syn-black);
}
```

and

```css
:root[data-theme='dark'] .syn-draft-badge {
  background: var(--syn-black);
  color: var(--syn-white);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/client/styles/shell-css.test.ts tests/client/styles/release-css.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client/styles/shell.css src/client/styles/release.css tests/client/styles/shell-css.test.ts tests/client/styles/release-css.test.ts
git commit -m "feat: apply reference display metrics to home logo; fix dark-mode hover selectors"
```

---

### Task 5: Dock controls, language switcher, and 640px responsive

**Files:**
- Modify: `src/client/styles/shell.css`
- Test: `tests/client/styles/shell-css.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/client/styles/shell-css.test.ts`:

```ts
  it('aligns dock and language controls with reference letter-spacing and hover', () => {
    const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')
    expect(css).toMatch(/\.syn-social-links__link:hover[^{]*\{[^}]*background:\s*var\(--syn-deco-symbol-bg\)/)
    expect(css).toMatch(/\.syn-social-links__link:hover[^{]*\s*\.syn-social-links__icon[^{]*\{[^}]*filter:\s*invert\(1\)/)
    expect(css).toMatch(/:root\[data-theme='dark'\][^{]*\.syn-social-links__link:hover[^{]*\s*\.syn-social-links__icon[^{]*\{[^}]*filter:\s*invert\(0\)/)
    expect(css).toMatch(/\.syn-language__toggle\s*\{[^}]*letter-spacing:\s*1px/)
    expect(css).toMatch(/\.syn-language__option\s*\{[^}]*letter-spacing:\s*1px/)
    expect(css).toMatch(/\.syn-language__toggle:hover[^{]*\{[^}]*text-decoration:\s*underline/)
    expect(css).toMatch(/\.syn-nav-drawer__close\s*\{[^}]*letter-spacing:\s*1px/)
  })

  it('adds the reference 640px mobile breakpoint', () => {
    const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')
    const idx = css.indexOf('@media (max-width: 640px)')
    expect(idx).toBeGreaterThan(-1)
    const mobile = css.slice(idx)
    expect(mobile).toMatch(/\.syn-header\s*\{[^}]*font-size:\s*11px/)
    expect(mobile).toMatch(/\.syn-home-logo h1\s*\{[^}]*font-size:\s*52px/)
    expect(mobile).toMatch(/\.syn-navigation__link\s*\{[^}]*padding:\s*14px 16px/)
    expect(mobile).toMatch(/\.syn-home-logo p\s*\{[^}]*font-size:\s*10px/)
  })
```

Note: the test slices the CSS at the 640px media header so the earlier 768px `.syn-header` rules cannot satisfy the assertions; the 640px block must be appended after the 768px block in the CSS file.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/client/styles/shell-css.test.ts`
Expected: FAIL (rules missing).

- [ ] **Step 3: Implement the styles**

In `src/client/styles/shell.css`:

Append to the `.syn-social-links__link` rule (add after the existing rule):

```css
.syn-social-links__link:hover,
.syn-social-links__link:focus-visible {
  background: var(--syn-deco-symbol-bg);
}

.syn-social-links__link:hover .syn-social-links__icon,
.syn-social-links__link:focus-visible .syn-social-links__icon {
  filter: invert(1);
}

:root[data-theme='dark'] .syn-social-links__link:hover,
:root[data-theme='dark'] .syn-social-links__link:focus-visible {
  background: var(--syn-deco-symbol-bg);
}

:root[data-theme='dark'] .syn-social-links__link:hover .syn-social-links__icon,
:root[data-theme='dark'] .syn-social-links__link:focus-visible .syn-social-links__icon {
  filter: invert(0);
}
```

Add letter-spacing to the language toggle/option rules and drawer close:

```css
.syn-language__toggle {
  min-height: var(--syn-dock-control-size);
  max-width: 40vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: var(--syn-border-strong);
  border-radius: var(--syn-radius);
  background: var(--syn-bg);
  color: var(--syn-fg);
  font-size: 12px;
  letter-spacing: 1px;
}

.syn-language__toggle:hover,
.syn-language__toggle:focus-visible {
  text-decoration: underline;
}
```

```css
.syn-language__option {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0.5rem 0.75rem;
  border: 0;
  background: transparent;
  color: var(--syn-fg);
  font: inherit;
  letter-spacing: 1px;
  text-align: start;
  cursor: pointer;
}

.syn-language__option:hover,
.syn-language__option:focus-visible {
  text-decoration: underline;
}
```

```css
.syn-nav-drawer__close {
  font: inherit;
  letter-spacing: 1px;
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
}
```

Append the 640px media block at the END of `shell.css` (after the 768px block, before the 360px block — or after both; it must come after the 768px block so its `.syn-header` overrides win at ≤640px):

```css
@media (max-width: 640px) {
  .syn-header,
  .syn-site-footer {
    font-size: 11px;
    padding: 8px 10px;
  }

  .syn-home-logo h1 {
    font-size: 52px;
  }

  .syn-home-logo p {
    font-size: 10px;
    letter-spacing: 1px;
  }

  .syn-navigation__link {
    padding: 14px 16px;
    font-size: 12px;
    letter-spacing: 1px;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/client/styles/shell-css.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client/styles/shell.css tests/client/styles/shell-css.test.ts
git commit -m "feat: align dock controls and add reference 640px mobile breakpoint"
```

---

### Task 6: Full-suite verification + visual comparison

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: typecheck passes; vitest passes except the 3 pre-existing `tests/compiler/theme.integration.test.ts` failures (macOS tmpdir realpath `EACCES` / doubled `/var/folders/q3/private/...` path — unrelated, verified pre-existing via `git stash`).

- [ ] **Step 2: Rebuild and reinstall the theme in the consumer fixture**

```bash
npm run build
rm -f vuepress-theme-synctrolling-0.1.0.tgz
npm pack --silent | tail -1
cd tests/fixtures/sites/consumer-smoke
npm install /Users/cardidi/repos/vuepress-theme-synctrolling/vuepress-theme-synctrolling-0.1.0.tgz
npx vuepress build .
```

Expected: `success VuePress build completed` with no `Cannot resolve layout` / JSX errors.

- [ ] **Step 3: Restart the dev server**

Kill the old dev server, then:

```bash
nohup npx vuepress dev . > /tmp/vuepress-dev.log 2>&1 &
```

Verify: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/zh/` → 200.

- [ ] **Step 4: ChromeMCP visual comparison (light mode)**

1. Open `http://localhost:8080/zh/` and `https://synctrol.com` in two tabs.
2. Take screenshots of both (save to repo root as `tmp-align-*.png`).
3. Compare: header bar is black with white text (light), footer bar black with white text, right column is gray (`#ddd` light) with full-width link panels separated by 3px borders, home logo right-aligned and large, hover on a nav link inverts to black bg + light text.
4. Check console: no errors.

- [ ] **Step 5: ChromeMCP dark-mode check**

1. On `http://localhost:8080/zh/`, click the theme-mode button to cycle to dark.
2. Verify bars invert (white bg, black text), deco column dark (`#1a1a1a`), logo text white.
3. Open `http://localhost:8080/zh/releases/` and hover a release tile: hover inverts (white bg in dark mode) — confirms the release.css selector fix.
4. Check console: no errors.

- [ ] **Step 6: Cleanup and final status**

```bash
rm -f tmp-align-*.png
git status --short
```

Expected: only intended changes; `.temp`/`.cache`/`*.tgz` ignored. No commit needed for this task.

---

## Self-review notes

- Spec coverage: tokens (Task 1), bars + toggle (Task 2), deco column (Task 3), logo metrics + dark selector fix (Task 4), dock/language/640px (Task 5), tests + ChromeMCP (Task 6). Background decorations and font families deliberately out of scope per user.
- No placeholders; all CSS and test code included verbatim.
- Type/name consistency: all tokens use the `--syn-` prefix declared in Task 1 and referenced by later tasks.
- The `prefers-color-scheme` duplication is intentional (reference parity; CSS cannot share selectors across media queries).
