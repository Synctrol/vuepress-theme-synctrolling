import type {
  BackgroundContext,
  BackgroundController,
  BackgroundModule,
} from '../../../src/shared/background'

export const animatingProbeState = {
  rafIds: [] as number[],
  listeners: [] as Array<{
    target: EventTarget
    type: string
    handler: EventListener
  }>,
  observers: [] as Array<{ disconnect: () => void }>,
  nodes: [] as HTMLElement[],
  reducedMotionHonored: [] as boolean[],
}

function resetAnimatingProbeState(): void {
  animatingProbeState.rafIds = []
  animatingProbeState.listeners = []
  animatingProbeState.observers = []
  animatingProbeState.nodes = []
  animatingProbeState.reducedMotionHonored = []
}

export { resetAnimatingProbeState }

const mod: BackgroundModule = {
  default(context: BackgroundContext): BackgroundController {
    const node = document.createElement('div')
    node.className = 'animating-probe'
    context.element.appendChild(node)
    animatingProbeState.nodes.push(node)

    const onClick: EventListener = () => {}
    context.element.addEventListener('click', onClick)
    animatingProbeState.listeners.push({
      target: context.element,
      type: 'click',
      handler: onClick,
    })

    const observer = new MutationObserver(() => {})
    observer.observe(context.element, { childList: true })
    animatingProbeState.observers.push(observer)

    let rafId = 0
    const tick = () => {
      if (context.reducedMotion) return
      rafId = window.requestAnimationFrame(tick)
      animatingProbeState.rafIds.push(rafId)
    }

    const applyMotion = (reducedMotion: boolean) => {
      animatingProbeState.reducedMotionHonored.push(reducedMotion)
      if (reducedMotion) {
        if (rafId) window.cancelAnimationFrame(rafId)
        rafId = 0
        node.dataset.motion = 'static'
      } else {
        node.dataset.motion = 'animated'
        tick()
      }
    }

    applyMotion(context.reducedMotion)

    return {
      update(next) {
        applyMotion(next.reducedMotion)
      },
      dispose() {
        if (rafId) window.cancelAnimationFrame(rafId)
        context.element.removeEventListener('click', onClick)
        observer.disconnect()
        node.remove()
        animatingProbeState.rafIds = []
        animatingProbeState.listeners = []
        animatingProbeState.observers = []
        animatingProbeState.nodes = []
      },
    }
  },
}

export default mod.default
export const animatingProbeLoader = async () => mod
