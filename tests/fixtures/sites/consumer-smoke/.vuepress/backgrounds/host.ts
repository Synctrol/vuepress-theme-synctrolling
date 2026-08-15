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
const WAVE_ALPHA = 0.5

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
const FRAGMENT_SOURCE = `#version 300 es
precision highp float;
out vec4 fragColor;

uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uColor;
uniform float uAlpha;

void main() {
  float i, f, r, a, h;
  vec2 uv = gl_FragCoord.xy / iResolution.xy - 1.45;
  vec2 p = (uv + vec2(0.6, -0.1)) * 16.0;
  uv *= vec2(sin(log(length(uv.y)) + 2.0));
  r = normalize(vec3(length(uv), 0.1, 0.51)).x;
  a = (log2(r + 0.0) * 15.0 + iTime * 0.2122) * 15.344;
  h = sin(atan(uv.y, uv.x) * 1.0);

  vec4 o = vec4(0.0);
  for (i = 1.0; i <= 16.0; i += 1.0) {
    vec2 v = p;
    for (f = 1.0; f <= 50.0; f *= 1.5) {
      v += mod(tan(cos(v.yx * f + f + i - iTime)), 5.0) / f;
      v += sin(vec2(h, a));
    }
    o += (2.0 * cos(i + vec4(5.0, 1.0, 2.0, 3.0)) + 1.0) / (5.0 * length(v));
  }
  o = tanh(o * 0.3) * 2.0;

  float lum = dot(o.rgb, vec3(0.2126, 0.7152, 0.0722));
  float intensity = clamp((lum + 2.0) * 0.25, 0.0, 1.0);
  fragColor = vec4(uColor, intensity * uAlpha);
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

  private rafId = 0
  private time = 0
  private lastFrame = 0
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
    } catch {
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

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
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
      this.time += dt * flow
      this.renderFrame()
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

  private renderFrame(): void {
    if (!this.gl || !this.canvas || !this.program) return
    const gl = this.gl
    const dpr = window.devicePixelRatio || 1
    const width = Math.max(1, Math.floor(this.canvas.clientWidth * dpr))
    const height = Math.max(1, Math.floor(this.canvas.clientHeight * dpr))
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
    if (this.uAlpha) gl.uniform1f(this.uAlpha, WAVE_ALPHA)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
}

export default function host(
  context: BackgroundReactiveContext,
): IBackgroundHost {
  return new WaveHost(context)
}
