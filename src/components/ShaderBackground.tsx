import { useEffect, useRef } from 'react';
import fragSrc from '../shaders/plasma.frag?raw';

// Recipe values ("Plasma", 21st.dev Shader Builder). See the header of plasma.frag.
const COLORS = [
  [0.086, 0.043, 0.043],
  [0.761, 0.251, 0.165],
  [0.957, 0.616, 0.216],
  [1.0, 0.91, 0.761],
];
const SPEED = 0.86; // multiplies seconds for u_scene.z
const UNIFORMS = {
  u_shape: [1.5, 0.48, 0.5, 0.0],
  u_surface: [2.4, 0.92, -0.5, 1.0],
  u_finish: [3.04, 0.61, 0.016, 0.35],
  u_transform: [7.0, 0.0, 0.16, 0.0],
  u_space: [0, 0, 0, 0],
} as const;

const VERT = 'attribute vec2 a_pos; void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }';

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader compile failed');
  return s;
}

/** Sets up the program and returns a draw(seconds) function, or null if WebGL isn't usable. */
function setup(gl: WebGLRenderingContext): ((t: number) => void) | null {
  try {
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link failed');
    gl.useProgram(prog);

    // One triangle that covers the whole screen.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const colors = new Float32Array(8 * 3);
    COLORS.forEach((c, i) => colors.set(c, i * 3));
    gl.uniform3fv(gl.getUniformLocation(prog, 'u_colors'), colors);
    for (const [name, v] of Object.entries(UNIFORMS)) gl.uniform4fv(gl.getUniformLocation(prog, name), v);

    const scene = gl.getUniformLocation(prog, 'u_scene');
    return (t) => {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.uniform4f(scene, gl.drawingBufferWidth, gl.drawingBufferHeight, t * SPEED, COLORS.length);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
  } catch (e) {
    console.warn('Shader background disabled:', e);
    return null;
  }
}

/** Animated plasma behind the app. Pauses when hidden; draws a still frame if the user prefers reduced motion. */
export function ShaderBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let draw = setup(gl);
    let raf = 0;
    const start = performance.now();
    const now = () => (performance.now() - start) / 1000;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      if (still) draw?.(0);
    };
    const frame = () => {
      draw?.(now());
      raf = requestAnimationFrame(frame);
    };
    const play = () => {
      cancelAnimationFrame(raf);
      if (!still && draw && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const onVisibility = () => (document.hidden ? cancelAnimationFrame(raf) : play());
    const onLost = (e: Event) => { e.preventDefault(); cancelAnimationFrame(raf); draw = null; };
    const onRestored = () => { draw = setup(gl); resize(); play(); };

    resize();
    play();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    };
  }, []);

  return <canvas ref={ref} className="shader-bg" aria-hidden="true" />;
}
