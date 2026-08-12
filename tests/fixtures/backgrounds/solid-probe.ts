import type {
  BackgroundContext,
  BackgroundController,
  BackgroundModule,
} from '../../../src/shared/background'

export const solidProbeLog: string[] = []

const mod: BackgroundModule = {
  default(context: BackgroundContext): BackgroundController {
    solidProbeLog.push(
      `init:${context.route}:${context.locale}:${context.colorMode}:${context.reducedMotion}`,
    )
    context.element.dataset.probe = 'solid'
    return {
      update(next) {
        solidProbeLog.push(
          `update:${next.route}:${next.locale}:${next.colorMode}:${next.reducedMotion}`,
        )
        next.element.dataset.probe = 'solid'
      },
      dispose() {
        solidProbeLog.push('dispose')
        delete context.element.dataset.probe
      },
    }
  },
}

export default mod.default
export const solidProbeLoader = async () => mod
