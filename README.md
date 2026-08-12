# vuepress-theme-synctrolling

Synctrol-specific VuePress 2 theme.

Requires Node.js `^20.9.0 || >=22.0.0` and VuePress `^2.0.0-rc.24`.

## Develop

```bash
npm install
npm test
```

## Backgrounds

Background modules are selected only in theme configuration by content type.
Loaders must be dynamic-import arrows so the theme can emit a Vite virtual module
(`virtual:synctrol-backgrounds`); they are **not** serialized through
`__SYNCTROL_THEME_OPTIONS__`.

```ts
import { synctrolTheme } from 'vuepress-theme-synctrolling'

export default {
  theme: synctrolTheme({
    // …required options…
    backgrounds: {
      home: () => import('./backgrounds/home'),
      release: () => import('./backgrounds/release'),
      news: () => import('./backgrounds/news'),
      page: () => import('./backgrounds/page'),
    },
  }),
}
```

Each module default-exports `(context) => ({ update, dispose })`. Missing keys
render an empty solid `--syn-bg` surface. `content.yml` cannot set `background`.
The root language router page does not load a background module.
