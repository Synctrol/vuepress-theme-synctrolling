import type {
  BackgroundModule,
  BackgroundReactiveContext,
  IBackgroundHost,
} from '../../../src/shared/background'

export const solidProbeLog: string[] = []

const mod: BackgroundModule = {
  default(context: BackgroundReactiveContext): IBackgroundHost {
    solidProbeLog.push(
      `init:${context.route.value.path}:${context.locale.value}:${context.colorMode.value}:${context.reducedMotion.value}`,
    )
    context.element.dataset.probe = 'solid'
    return {
      request(next) {
        solidProbeLog.push(
          `request:${next.reason}:${next.routePath}:${next.locale}:${next.colorMode}:${next.reducedMotion}`,
        )
        context.element.dataset.probe = 'solid'
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
