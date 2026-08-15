export const FLOW_TRANSITION_SECONDS = 0.5

const MAX_STEP_SECONDS = 1

/**
 * Eases a `flow` value in [0, 1] toward a target (1 = flowing, 0 = frozen)
 * over a fixed transition window. The host multiplies time advancement by
 * `flow`, so the wave decelerates to a stop or accelerates back to life.
 */
export class FlowController {
  private value = 1
  private target = 1
  readonly transitionSeconds: number

  constructor(transitionSeconds: number = FLOW_TRANSITION_SECONDS) {
    this.transitionSeconds = transitionSeconds
  }

  /** Current flow in [0, 1]. 1 = flowing at full speed, 0 = frozen. */
  get flow(): number {
    return this.value
  }

  /** Set whether the wave should be flowing (true) or stopped (false). */
  setFlowing(isFlowing: boolean): void {
    this.target = isFlowing ? 1 : 0
  }

  /** Advance by `dt` seconds, easing `flow` toward the target. Returns the new flow. */
  step(dt: number): number {
    const seconds = Math.min(Math.max(dt, 0), MAX_STEP_SECONDS)
    const delta = this.target - this.value
    const maxStep = seconds / this.transitionSeconds
    if (Math.abs(delta) <= maxStep) {
      this.value = this.target
    } else {
      this.value += Math.sign(delta) * maxStep
    }
    return this.value
  }
}
