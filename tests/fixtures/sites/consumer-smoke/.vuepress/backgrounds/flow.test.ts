import { describe, expect, it } from 'vitest'
import { FlowController, FLOW_TRANSITION_SECONDS } from './flow'

describe('FlowController', () => {
  it('starts fully flowing', () => {
    expect(new FlowController().flow).toBe(1)
    expect(FLOW_TRANSITION_SECONDS).toBe(0.5)
  })

  it('eases to a stop over the transition window', () => {
    const controller = new FlowController()
    controller.setFlowing(false)
    expect(controller.flow).toBe(1)
    expect(controller.step(0.25)).toBeCloseTo(0.5, 5)
    expect(controller.step(0.25)).toBeCloseTo(0, 5)
    expect(controller.step(1)).toBe(0)
  })

  it('eases back to full flow over the transition window', () => {
    const controller = new FlowController()
    controller.setFlowing(false)
    controller.step(0.5)
    controller.setFlowing(true)
    expect(controller.step(0.25)).toBeCloseTo(0.5, 5)
    expect(controller.step(0.25)).toBeCloseTo(1, 5)
  })

  it('clamps a huge dt instead of overshooting', () => {
    const controller = new FlowController()
    controller.setFlowing(false)
    expect(controller.step(100)).toBe(0)
  })

  it('ignores non-positive dt', () => {
    const controller = new FlowController()
    controller.setFlowing(false)
    controller.step(-1)
    expect(controller.flow).toBe(1)
  })
})
