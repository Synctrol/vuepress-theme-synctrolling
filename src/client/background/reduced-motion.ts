export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export function readReducedMotion(
  media: MediaQueryList | null | undefined = typeof window !== 'undefined'
    ? window.matchMedia(REDUCED_MOTION_QUERY)
    : null,
): boolean {
  return Boolean(media?.matches)
}

export function subscribeReducedMotion(
  listener: (reducedMotion: boolean) => void,
): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }

  const media = window.matchMedia(REDUCED_MOTION_QUERY)
  const onChange = (event: MediaQueryListEvent) => {
    listener(event.matches)
  }
  media.addEventListener('change', onChange)
  return () => {
    media.removeEventListener('change', onChange)
  }
}
