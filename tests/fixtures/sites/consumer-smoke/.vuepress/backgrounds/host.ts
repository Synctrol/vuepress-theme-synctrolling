import { watch } from 'vue'
import type {
  BackgroundReactiveContext,
  BackgroundRequest,
  IBackgroundHost,
} from 'vuepress-theme-synctrolling'
import { FlowController } from './flow'

/**
 * Base opacity of the wave. The per-pixel alpha is `intensity * WAVE_ALPHA`,
 * so the wave is semi-transparent and the solid `var(--syn-bg)` underneath
 * (painted by the theme shell) stays visible through the transparent canvas.
 */
const WAVE_ALPHA = 1

/** Camera is fully static: these are the original baseline values. */
const WAVE_SHIFT_X = 0.2
const WAVE_SHIFT_Y = 0.2
const WAVE_SCALE = 0.8

/**
 * Render resolution as a fraction of the device pixel ratio. The wave is a
 * soft decorative background, so it renders below native resolution and is
 * upscaled by CSS — a large GPU savings with no visible quality loss.
 */
const RENDER_SCALE = 0.5

/* ------------------------------------------------------------------ *
 * Music-driven visual mapping (all identity at zero: silent == the    *
 * original shader output, byte for byte).                            *
 *                                                                     *
 *  Low    < 400 Hz   -> uDepth:   color depth (contrast + ink)       *
 *  Mid   800-3000 Hz -> uJitter:  displacement deviation along        *
 *                                diffusion                            *
 *  High  > 3000 Hz   -> uDissip:  dissipation speed (faster spatial   *
 *                                falloff)                             *
 *  Loudness (RMS dBFS, three anchors -19 / -12 / -6, smooth-stepped) *
 *    -> uLoudness: drives overall ink (color depth) and the veil      *
 *       alpha inversely (see shader + host uniforms).                 *
 * ------------------------------------------------------------------ */

const LOW_MAX_HZ = 400
const MID_MIN_HZ = 800
const MID_MAX_HZ = 3000
const HIGH_MIN_HZ = 3000

const LOUDNESS_QUIET_DB = -19
const LOUDNESS_MID_DB = -12
const LOUDNESS_LOUD_DB = -6
const RMS_FLOOR_DB = -90

/* ------------------------------------------------------------------ *
 * Envelope & anti-flicker policy.                                     *
 *                                                                     *
 * Luminance axes (color depth + veil alpha) move at phrase level:     *
 * a short attack but a long release (~1s) so drum hits melt into      *
 * gentle breathing instead of per-note strobing. Spatial axes         *
 * (displacement deviation, dissipation) may track faster but still    *
 * use frame-rate-independent time constants.                          *
 *                                                                     *
 * Overall loudness is also soft-knee compressed and capped at 60% of  *
 * its nominal range: small signals follow closely, large signals are  *
 * pulled back so the brightest passages never strobe.                 *
 * ------------------------------------------------------------------ */

/** Frame-rate independent one-pole step toward `target`. */
function approach(
  current: number,
  target: number,
  dt: number,
  attackSeconds: number,
  releaseSeconds: number,
): number {
  const tau = target > current ? attackSeconds : releaseSeconds
  const alpha = 1 - Math.exp(-dt / Math.max(0.001, tau))
  return current + (target - current) * alpha
}

const ENV_ATTACK_SPATIAL = 0.08
const ENV_RELEASE_SPATIAL = 0.45
const ENV_ATTACK_LOW_DEPTH = 0.18
const ENV_RELEASE_LOW_DEPTH = 1.0
const ENV_ATTACK_LOUD = 0.15
const ENV_RELEASE_LOUD = 1.2

/** Soft knee: near-linear below, increasingly pulled back above. */
function softKnee(gain: number): number {
  return gain * (1 - 0.25 * Math.min(1, gain))
}

/** Luminance axes are capped at 60% of their nominal modulation range. */
const LUMINANCE_AMPLITUDE = 0.6
const LOW_DEPTH_AMPLITUDE = 0.8

const VERTEX_SOURCE = `#version 300 es
void main() {
  vec2 positions[4] = vec2[4](
    vec2(-1.0, -1.0),
    vec2(1.0, -1.0),
    vec2(-1.0, 1.0),
    vec2(1.0, 1.0)
  );
  gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}
`

// Adapted from https://www.shadertoy.com/view/ffdXW8 (remix of a remix).
// The `iTime` uniform drives the flow; freezing it stops the wave.
// Music uniforms are identity multipliers: at 0.0 the output equals the
// original silent wave exactly.
const FRAGMENT_SOURCE = `#version 300 es
precision highp float;
out vec4 fragColor;

uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uColor;
uniform float uAlpha;
uniform vec2 uShift;
uniform float uScale;
uniform float uLoudness; // 0..1 overall loudness gain
uniform float uDepth;    // low band < 400 Hz
uniform float uJitter;   // mid band 800..3000 Hz
uniform float uDissip;   // high band > 3000 Hz

void main() {
  float i, f, r, a, h;
  vec2 uv = gl_FragCoord.xy / iResolution.y * uScale - 1.45 + uShift;
  vec2 p = (uv + vec2(0.6, -0.1)) * 16.0;
  uv *= vec2(sin(log(length(uv.y)) + 2.0));
  r = normalize(vec3(length(uv), 0.1, 0.51)).x;
  a = (log2(r + 0.0) * 15.0 + iTime * 0.2122) * 15.344;
  h = sin(atan(uv.y, uv.x) * 1.0);

  vec4 o = vec4(0.0);
  float displace = 1.0 + 0.5 * uJitter;
  float falloff = 5.0 * (1.0 + 0.9 * uDissip);
  for (i = 1.0; i <= 12.0; i += 1.0) {
    vec2 v = p;
    for (f = 1.0; f <= 50.0; f *= 1.5) {
      v += (mod(tan(cos(v.yx * f + f + i - iTime)), 5.0) / f
          + sin(vec2(h, a))) * displace;
    }
    o += (2.0 * cos(i + vec4(5.0, 1.0, 2.0, 3.0)) + 1.0) / (falloff * length(v));
  }
  float contrast = 1.0 + 0.5 * uDepth + 0.4 * uLoudness;
  o = tanh(o * 0.3 * contrast) * 2.0;

  float lum = dot(o.rgb, vec3(0.2126, 0.7152, 0.0722));
  float intensity = clamp((lum + 2.0) * 0.25, 0.0, 1.0);
  // Premultiplied output: the context uses premultipliedAlpha and
  // blendFunc(ONE, ONE_MINUS_SRC_ALPHA), so the color must be pre-scaled.
  // uLoudness/uDepth deepen the ink (color depth) beyond the plain color.
  float ink = 1.0 + 0.75 * uLoudness + 0.5 * uDepth;
  float alpha = intensity * uAlpha;
  fragColor = vec4(((uColor * uColor * uColor * uColor) - 0.5) * ink * alpha, alpha);
}
`

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('createShader failed')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`shader compile failed: ${log}`)
  }
  return shader
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SOURCE)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SOURCE)
  const program = gl.createProgram()
  if (!program) throw new Error('createProgram failed')
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(`program link failed: ${log}`)
  }
  return program
}

function smoothstep01(value: number): number {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

/**
 * Maps overall loudness (dBFS RMS) onto a continuous 0..1 gain:
 * quiet <= -19 dB -> 0, halfway at -12 dB, full at >= -6 dB.
 */
function loudnessGain(rmsDb: number): number {
  if (rmsDb <= LOUDNESS_QUIET_DB) return 0
  if (rmsDb >= LOUDNESS_LOUD_DB) return 1
  if (rmsDb <= LOUDNESS_MID_DB) {
    return 0.5 * smoothstep01((rmsDb - LOUDNESS_QUIET_DB) / 7)
  }
  return (
    0.5 +
    0.5 *
      smoothstep01((rmsDb - LOUDNESS_MID_DB) / (LOUDNESS_LOUD_DB - LOUDNESS_MID_DB))
  )
}

class WaveHost implements IBackgroundHost {
  private readonly context: BackgroundReactiveContext
  private readonly flow = new FlowController()

  private canvas: HTMLCanvasElement | null = null
  private gl: WebGL2RenderingContext | null = null
  private program: WebGLProgram | null = null
  private uTime: WebGLUniformLocation | null = null
  private uResolution: WebGLUniformLocation | null = null
  private uColor: WebGLUniformLocation | null = null
  private uAlpha: WebGLUniformLocation | null = null
  private uShift: WebGLUniformLocation | null = null
  private uScale: WebGLUniformLocation | null = null
  private uLoudness: WebGLUniformLocation | null = null
  private uDepth: WebGLUniformLocation | null = null
  private uJitter: WebGLUniformLocation | null = null
  private uDissip: WebGLUniformLocation | null = null

  private rafId = 0
  private time = 0
  private lastFrame = 0
  private lastWidth = 0
  private lastHeight = 0
  private lastColor = ''
  private lastLow = 0
  private lastMid = 0
  private lastHigh = 0
  private lastLoud = 0
  private low = 0
  private mid = 0
  private high = 0
  private loudDb = RMS_FLOOR_DB
  private loud = 0
  private disposed = false
  private readonly stopMotionWatch: () => void

  constructor(context: BackgroundReactiveContext) {
    this.context = context
    this.stopMotionWatch = watch(context.reducedMotion, (reduced) => {
      if (this.disposed) return
      if (reduced) {
        this.stopLoop()
        this.renderFrame()
      } else {
        this.startLoop()
      }
    })
    this.setup()
    if (this.context.reducedMotion.value) {
      this.renderFrame()
    } else {
      this.startLoop()
    }
  }

  request(input: BackgroundRequest): void {
    if (this.disposed) return
    // Home flows; every other page eases to a stop (and back on return).
    this.flow.setFlowing(input.contentType.resolved === 'home')
  }

  dispose(): void {
    this.disposed = true
    this.stopMotionWatch()
    this.stopLoop()
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program)
    }
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext()
    this.program = null
    this.gl = null
    this.canvas?.remove()
    this.canvas = null
  }

  private setup(): void {
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    this.context.element.appendChild(canvas)
    this.canvas = canvas

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
    })
    if (!gl) {
      canvas.remove()
      this.canvas = null
      return
    }
    this.gl = gl

    let program: WebGLProgram
    try {
      program = createProgram(gl)
    } catch (error) {
      console.warn('[synctrol-demo] wave shader failed:', error)
      canvas.remove()
      this.canvas = null
      this.gl = null
      return
    }
    this.program = program
    this.uTime = gl.getUniformLocation(program, 'iTime')
    this.uResolution = gl.getUniformLocation(program, 'iResolution')
    this.uColor = gl.getUniformLocation(program, 'uColor')
    this.uAlpha = gl.getUniformLocation(program, 'uAlpha')
    this.uShift = gl.getUniformLocation(program, 'uShift')
    this.uScale = gl.getUniformLocation(program, 'uScale')
    this.uLoudness = gl.getUniformLocation(program, 'uLoudness')
    this.uDepth = gl.getUniformLocation(program, 'uDepth')
    this.uJitter = gl.getUniformLocation(program, 'uJitter')
    this.uDissip = gl.getUniformLocation(program, 'uDissip')

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.disable(gl.DEPTH_TEST)
  }

  private startLoop(): void {
    if (this.rafId) return
    this.lastFrame = performance.now()
    const tick = (now: number) => {
      if (this.disposed) return
      const dt = Math.min((now - this.lastFrame) / 1000, 0.1)
      this.lastFrame = now
      const flow = this.flow.step(dt)
      this.updateEnvelopes(dt)
      this.time += dt * flow

      // Skip the GPU draw when the wave is frozen (flow 0) and neither the
      // canvas size, the color mode, nor the music envelopes changed since
      // the last frame.
      const size = this.currentSize()
      const color = this.context.colorMode.value
      const changed =
        flow > 0 ||
        size.width !== this.lastWidth ||
        size.height !== this.lastHeight ||
        color !== this.lastColor ||
        Math.abs(this.low - this.lastLow) > 0.004 ||
        Math.abs(this.mid - this.lastMid) > 0.004 ||
        Math.abs(this.high - this.lastHigh) > 0.004 ||
        Math.abs(this.loud - this.lastLoud) > 0.004
      if (changed) {
        this.renderFrame(size)
        this.lastWidth = size.width
        this.lastHeight = size.height
        this.lastColor = color
        this.lastLow = this.low
        this.lastMid = this.mid
        this.lastHigh = this.high
        this.lastLoud = this.loud
      }

      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  private stopLoop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
  }

  private currentSize(): { width: number; height: number } {
    if (!this.canvas) return { width: 0, height: 0 }
    const dpr = (window.devicePixelRatio || 1) * RENDER_SCALE
    return {
      width: Math.max(1, Math.floor(this.canvas.clientWidth * dpr)),
      height: Math.max(1, Math.floor(this.canvas.clientHeight * dpr)),
    }
  }

  private bandAverage(fromHz: number, toHz: number | null): number {
    const channel = this.context.spectrum
    if (!channel || channel.binHz <= 0) return 0
    const data = channel.data
    const from = Math.max(1, Math.floor(fromHz / channel.binHz))
    const endRaw = toHz === null ? data.length : Math.floor(toHz / channel.binHz)
    const end = Math.min(endRaw, data.length)
    if (from >= end) return 0
    let sum = 0
    for (let i = from; i < end; i += 1) sum += data[i]!
    return sum / (end - from)
  }

  private updateEnvelopes(dt: number): void {
    const channel = this.context.spectrum
    const active = channel?.active.value === true
    const lowTarget = active ? this.bandAverage(0, LOW_MAX_HZ) : 0
    const midTarget = active ? this.bandAverage(MID_MIN_HZ, MID_MAX_HZ) : 0
    const highTarget = active ? this.bandAverage(HIGH_MIN_HZ, null) : 0
    const rmsTarget = active ? channel!.rmsDb : RMS_FLOOR_DB

    // Spatial axes track faster; the luminance (depth) axis breathes at
    this.mid = approach(this.mid, midTarget, dt, ENV_ATTACK_SPATIAL, ENV_RELEASE_SPATIAL)
    this.high = approach(
      this.high,
      highTarget,
      dt,
      ENV_ATTACK_SPATIAL,
      ENV_RELEASE_SPATIAL,
    )
    this.low = approach(
      this.low,
      lowTarget * LOW_DEPTH_AMPLITUDE,
      dt,
      ENV_ATTACK_LOW_DEPTH,
      ENV_RELEASE_LOW_DEPTH,
    )

    // Loudness: envelope the dB first (slow falloff), then curve, soft-knee
    // and cap the amplitude before it touches any luminance parameter.
    this.loudDb = approach(
      this.loudDb,
      rmsTarget,
      dt,
      ENV_ATTACK_LOUD,
      ENV_RELEASE_LOUD,
    )
    this.loud =
      LUMINANCE_AMPLITUDE * softKnee(loudnessGain(this.loudDb))
  }

  private renderFrame(size = this.currentSize()): void {
    if (!this.gl || !this.canvas || !this.program) return
    const gl = this.gl
    const width = size.width
    const height = size.height
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
    }

    gl.viewport(0, 0, width, height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(this.program)
    if (this.uTime) gl.uniform1f(this.uTime, this.time)
    if (this.uResolution) gl.uniform2f(this.uResolution, width, height)
    if (this.uColor) {
      const light = this.context.colorMode.value === 'dark' ? 1 : 0
      gl.uniform3f(this.uColor, light, light, light)
    }
    if (this.uAlpha) {
      // Louder music deepens the ink while slightly lowering the veil alpha.
      gl.uniform1f(this.uAlpha, WAVE_ALPHA * (1 - 0.3 * this.loud))
    }
    if (this.uShift) {
      gl.uniform2f(this.uShift, WAVE_SHIFT_X, WAVE_SHIFT_Y)
    }
    if (this.uScale) gl.uniform1f(this.uScale, WAVE_SCALE)
    if (this.uLoudness) gl.uniform1f(this.uLoudness, this.loud)
    if (this.uDepth) gl.uniform1f(this.uDepth, this.low)
    if (this.uJitter) gl.uniform1f(this.uJitter, this.mid)
    if (this.uDissip) gl.uniform1f(this.uDissip, this.high)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
}

export default function host(
  context: BackgroundReactiveContext,
): IBackgroundHost {
  return new WaveHost(context)
}
