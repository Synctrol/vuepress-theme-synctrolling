import { computed, inject } from 'vue'
import { resolveMultilanguage } from '../../shared/multilanguage.js'
import { SYNCTROL_SHELL_CONTEXT_KEY } from './keys.js'
import { useThemeOptions } from './useThemeOptions.js'

export function useLocaleShell() {
  const theme = useThemeOptions()
  const shell = inject(SYNCTROL_SHELL_CONTEXT_KEY)!
  const locale = computed(() => shell.locale)
  const messages = computed(() => theme.locales[shell.locale]!.messages)
  const localeLabel = computed(() => theme.locales[shell.locale]!.label)
  const copyright = computed(() => {
    const resolved = resolveMultilanguage(
      theme.copyright,
      shell.locale,
      theme.mainLocale,
    )
    return resolved
  })
  return { theme, shell, locale, messages, localeLabel, copyright }
}
