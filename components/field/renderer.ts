import { fieldState } from '@/lib/field-state';
import { ease } from '@/lib/ease';
import { fieldFrag, fieldVert } from './shaders';
import type { FieldData } from './load';

/**
 * The field's renderer, written directly against WebGL.
 *
 * This started on three.js and react-three-fiber. It drew correctly, but the
 * bundle was 230KB over the wire and cost ~1.4s of script evaluation on a
 * throttled mobile profile — which put Lighthouse's performance score at 0.69
 * and pushed LCP to three seconds, because the main thread was busy compiling
 * a scene graph the page does not have. A site whose own copy points at a
 * 106KB buffer and one draw call cannot ship a 3D engine to draw eighteen
 * thousand dots.
 *
 * What is actually needed is here: one program, two buffers, ten uniforms
 * and a loop. The GLSL is unchanged — it was always hand-written.
 */

type GL = WebGL2RenderingContext | WebGLRenderingContext;

const MAX_DPR = 1.75;

/** The directional wake's hard ceiling, in canvas heights per second. The
 *  clamp is what keeps a flick reading as weight dragged through ink rather
 *  than as a cursor effect — the shader scales whatever survives it by 0.05. */
const MAX_WAKE = 1.0;

/** The ink-down entrance: how long the chronological sweep takes, and where
 *  the reveal uniform parks once it is done. The rest value sits past 1.0 by
 *  more than the shader's feather width (1/14), so the newest mark finishes
 *  its fade and every point clamps to fully drawn from then on. */
const REVEAL_SECONDS = 2.2;
const REVEAL_REST = 1.15;

/** The Konami-code morph's envelope, in seconds: ramp onto the curve, hold
 *  it, ease back to ambient scatter. Asymmetric on purpose — the release is
 *  slower than the approach, the same way the reveal sweep and the pointer's
 *  own easing are never symmetric either; a fast snap into shape and a slow
 *  dissolve out of it reads as "arriving" and "settling", not as a loop. */
const MORPH_IN_SECONDS = 0.9;
const MORPH_HOLD_SECONDS = 2.0;
const MORPH_OUT_SECONDS = 1.4;
const MORPH_TOTAL_SECONDS = MORPH_IN_SECONDS + MORPH_HOLD_SECONDS + MORPH_OUT_SECONDS;

/** Frame-rate independent approach. `rate` is roughly "fraction closed per
 *  second", so the feel is identical at 60fps and 120fps. */
const approach = (current: number, target: number, rate: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

/** 0 at the start, 1 across the hold, back to 0 once the envelope has run
 *  its course — `ease` (the site's one curve) drives both ramps, so this
 *  moves with the same weight as everything else on the page. */
function morphEnvelope(elapsedSeconds: number): number {
  if (elapsedSeconds < MORPH_IN_SECONDS) return ease(elapsedSeconds / MORPH_IN_SECONDS);
  if (elapsedSeconds < MORPH_IN_SECONDS + MORPH_HOLD_SECONDS) return 1;
  if (elapsedSeconds < MORPH_TOTAL_SECONDS) {
    return 1 - ease((elapsedSeconds - MORPH_IN_SECONDS - MORPH_HOLD_SECONDS) / MORPH_OUT_SECONDS);
  }
  return 0;
}

function compile(gl: GL, type: number, source: string, label: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error(`could not create ${label} shader`);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`${label} shader failed to compile: ${log}`);
  }
  return shader;
}

function link(gl: GL, vertSrc: string, fragSrc: string, label: string) {
  const vert = compile(gl, gl.VERTEX_SHADER, vertSrc, `${label} vertex`);
  const frag = compile(gl, gl.FRAGMENT_SHADER, fragSrc, `${label} fragment`);
  const program = gl.createProgram();
  if (!program) throw new Error(`could not create ${label} program`);
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  // The shaders are owned by the program once linked; drop our references.
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`${label} program failed to link: ${log}`);
  }
  return program;
}

/** Reads a token off the document so the palette stays the single source of
 *  truth, and converts it to the 0..1 floats GL wants. */
function readInk(): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(raw);
  if (!hex) return [0.09, 0.082, 0.071];
  const n = parseInt(hex[1]!, 16);
  // sRGB to linear — the same conversion three was doing before writing the
  // uniform, so the mark colour is unchanged.
  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return [toLinear(((n >> 16) & 255) / 255), toLinear(((n >> 8) & 255) / 255), toLinear((n & 255) / 255)];
}

export type FieldRenderer = { destroy: () => void };

/**
 * `calm` is the phone profile: the pointer tug is off (a finger that tugs the
 * field is also the finger scrolling the page), and in its place a slow lens
 * wanders the canvas on its own — same parting-of-marks read, no touch
 * required. The marks take a small size bump against the thinner buffer, and
 * the DPR cap drops a step.
 *
 * `intro` runs the ink-down entrance: the marks draw themselves in in logged
 * order over REVEAL_SECONDS. FieldMount decides it (first visit only, never
 * under reduced motion); here it is just the starting value of one uniform.
 */
export function createFieldRenderer(
  canvas: HTMLCanvasElement,
  data: FieldData,
  calm = false,
  intro = false,
): FieldRenderer {
  const gl = (canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: 'low-power',
  }) ?? canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: false })) as GL | null;

  if (!gl) throw new Error('no WebGL context');

  const pointsProgram = link(gl, fieldVert, fieldFrag, 'field');

  const pointsPos = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pointsPos);
  gl.bufferData(gl.ARRAY_BUFFER, data.positions, gl.STATIC_DRAW);

  const pointsMeta = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pointsMeta);
  gl.bufferData(gl.ARRAY_BUFFER, data.meta, gl.STATIC_DRAW);

  const fieldLoc = {
    position: gl.getAttribLocation(pointsProgram, 'position'),
    aMeta: gl.getAttribLocation(pointsProgram, 'aMeta'),
    uTime: gl.getUniformLocation(pointsProgram, 'uTime'),
    uAspect: gl.getUniformLocation(pointsProgram, 'uAspect'),
    uPixelRatio: gl.getUniformLocation(pointsProgram, 'uPixelRatio'),
    uDensity: gl.getUniformLocation(pointsProgram, 'uDensity'),
    uPointer: gl.getUniformLocation(pointsProgram, 'uPointer'),
    uPointerVel: gl.getUniformLocation(pointsProgram, 'uPointerVel'),
    uR2: gl.getUniformLocation(pointsProgram, 'uR2'),
    uInk: gl.getUniformLocation(pointsProgram, 'uInk'),
    uCalm: gl.getUniformLocation(pointsProgram, 'uCalm'),
    uReveal: gl.getUniformLocation(pointsProgram, 'uReveal'),
    uMorph: gl.getUniformLocation(pointsProgram, 'uMorph'),
  };

  const maxDpr = calm ? 1.5 : MAX_DPR;

  const ink = readInk();

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  // Straight (non-premultiplied) source over a transparent canvas.
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  // ---- state driven by the page ------------------------------------------
  let time = 0;
  let pointerX = 0.5;
  let pointerY = 0.5;
  // The wake: the smoothed pointer's velocity, smoothed once more below so it
  // builds and decays like drag through something viscous.
  let pointerVelX = 0;
  let pointerVelY = 0;
  // The entrance. `revealT` is raw progress 0..1; `reveal` is the eased,
  // scaled uniform value. Both start finished unless this is a first visit.
  let revealT = intro ? 0 : 1;
  let reveal = intro ? 0 : REVEAL_REST;
  let density = 1;
  let width = 0;
  let height = 0;

  // The morph. `seenMorphTrigger` is what lets this loop tell "a new Konami
  // code just landed" from "one landed a while ago and this is just another
  // frame" — see the counter's own comment in field-state.ts for why a
  // counter rather than a timestamp or a boolean.
  let seenMorphTrigger = fieldState.morphTrigger;
  let morphElapsed = MORPH_TOTAL_SECONDS;
  let morph = 0;

  // ---- adaptive quality ---------------------------------------------------
  // Stands in for drei's PerformanceMonitor: sample frame times over a second
  // and thin the field rather than drop frames.
  let sampleStart = 0;
  let sampleFrames = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (w === canvas.width && h === canvas.height) return;
    canvas.width = w;
    canvas.height = h;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    gl!.viewport(0, 0, w, h);
  }

  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  let raf = 0;
  let last = 0;

  function frame(now: number) {
    raf = requestAnimationFrame(frame);

    // Clamp: a tab that wakes after a minute must not jump the drift forward
    // by however long it was away.
    const dt = last === 0 ? 1 / 60 : Math.min((now - last) / 1000, 1 / 20);
    last = now;

    time += dt;

    // Slow enough to read as weight rather than as a cursor effect.
    const prevPointerX = pointerX;
    const prevPointerY = pointerY;
    pointerX = approach(pointerX, (fieldState.pointerX + 1) / 2, 1.7, dt);
    pointerY = approach(pointerY, (fieldState.pointerY + 1) / 2, 1.7, dt);

    // The wake's velocity term: differentiate the already-smoothed pointer,
    // smooth again, then clamp hard. When the pointer stops, this decays to
    // zero on its own in well under a second — nothing to reset.
    const invDt = 1 / Math.max(dt, 1e-4);
    pointerVelX = approach(pointerVelX, (pointerX - prevPointerX) * invDt, 5, dt);
    pointerVelY = approach(pointerVelY, (pointerY - prevPointerY) * invDt, 5, dt);
    let wakeX = pointerVelX;
    let wakeY = pointerVelY;
    const wakeSpeed = Math.hypot(wakeX, wakeY);
    if (wakeSpeed > MAX_WAKE) {
      wakeX *= MAX_WAKE / wakeSpeed;
      wakeY *= MAX_WAKE / wakeSpeed;
    }

    // The entrance sweep, eased through the house curve. Once finished the
    // branch never runs again and the uniform is a parked constant.
    if (revealT < 1) {
      revealT = Math.min(1, revealT + dt / REVEAL_SECONDS);
      reveal = ease(revealT) * REVEAL_REST;
    }

    // A new Konami code restarts the envelope from zero even mid-morph —
    // running the code again is a request to see it again, not a request
    // that gets ignored because one is already playing.
    if (fieldState.morphTrigger !== seenMorphTrigger) {
      seenMorphTrigger = fieldState.morphTrigger;
      morphElapsed = 0;
    }
    if (morphElapsed < MORPH_TOTAL_SECONDS) {
      morph = morphEnvelope(morphElapsed);
      morphElapsed += dt;
    } else {
      morph = 0;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const aspect = width / Math.max(1, height);

    gl!.clear(gl!.COLOR_BUFFER_BIT);

    // --- the field ---------------------------------------------------------
    gl!.useProgram(pointsProgram);
    gl!.uniform1f(fieldLoc.uTime, time);
    gl!.uniform1f(fieldLoc.uAspect, aspect);
    gl!.uniform1f(fieldLoc.uPixelRatio, dpr);
    gl!.uniform1f(fieldLoc.uDensity, density);
    gl!.uniform2f(fieldLoc.uPointer, pointerX, pointerY);
    gl!.uniform2f(fieldLoc.uPointerVel, wakeX, wakeY);
    gl!.uniform2f(fieldLoc.uR2, data.r2[0], data.r2[1]);
    gl!.uniform3f(fieldLoc.uInk, ink[0], ink[1], ink[2]);
    gl!.uniform1f(fieldLoc.uCalm, calm ? 1 : 0);
    gl!.uniform1f(fieldLoc.uReveal, reveal);
    gl!.uniform1f(fieldLoc.uMorph, morph);

    gl!.bindBuffer(gl!.ARRAY_BUFFER, pointsPos);
    gl!.enableVertexAttribArray(fieldLoc.position);
    gl!.vertexAttribPointer(fieldLoc.position, 3, gl!.FLOAT, false, 0, 0);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, pointsMeta);
    gl!.enableVertexAttribArray(fieldLoc.aMeta);
    gl!.vertexAttribPointer(fieldLoc.aMeta, 3, gl!.FLOAT, false, 0, 0);
    gl!.drawArrays(gl!.POINTS, 0, data.count);

    // --- adaptive quality --------------------------------------------------
    sampleFrames += 1;
    if (sampleStart === 0) sampleStart = now;
    else if (now - sampleStart >= 1000) {
      const fps = (sampleFrames * 1000) / (now - sampleStart);
      if (fps < 45 && density > 0.35) density = Math.max(0.35, density - 0.25);
      else if (fps > 55 && density < 1) density = Math.min(1, density + 0.15);
      sampleStart = now;
      sampleFrames = 0;
    }
  }

  function start() {
    if (raf === 0) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  function stop() {
    if (raf !== 0) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  // A hidden tab gets no rAF at all, not a loop that returns early.
  function onVisibility() {
    const visible = document.visibilityState === 'visible';
    fieldState.visible = visible;
    if (visible) start();
    else stop();
  }
  document.addEventListener('visibilitychange', onVisibility);

  start();

  return {
    destroy() {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      resizeObserver.disconnect();
      gl.deleteBuffer(pointsPos);
      gl.deleteBuffer(pointsMeta);
      gl.deleteProgram(pointsProgram);
      // Deliberately NO loseContext() here. Chrome answers that call with a
      // console warning ('WebGL: CONTEXT_LOST_WEBGL: loseContext called'),
      // and destroy() runs on user-reachable paths — a breakpoint remount —
      // where the zero-console-warnings rule applies. The GPU resources worth
      // freeing early are released above; the canvas element itself is
      // discarded with the unmount, and the browser reclaims the context
      // along with it.
    },
  };
}
