(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,16734,e=>{"use strict";var t=e.i(43476),i=e.i(71645),o=e.i(9977);let r=`
precision highp float;

// Declared explicitly: three.js used to inject the position attribute for us.
// The renderer is written directly against WebGL now, so every attribute is
// named here. (No backticks in this file — it is one big template literal.)
attribute vec3 position; // x: time 0..1, y: intensity 0..1, z: unused
attribute vec3 aMeta;    // x: vertex index, y: set volume 0..1, z: lift index

uniform float uTime;
uniform float uProgress;   // 0 at the top of the document, 1 at the bottom
uniform float uAspect;
uniform float uPixelRatio;
uniform float uDensity;    // 1 full, lower on weak hardware
uniform vec2  uPointer;    // smoothed, 0..1 space
uniform vec2  uR2;         // low-discrepancy constants, from the manifest

varying float vAlpha;

void main() {
  float index     = aMeta.x;
  float volume    = aMeta.y;
  float lift      = aMeta.z;
  float intensity = position.y;   // 0..1 estimated one-rep max

  // R2, the two-dimensional low-discrepancy sequence. It scatters far more
  // evenly than hash noise — no clumps, no visible lattice — which is what
  // gives a plotter drawing its even tone. Computed from the index alone, so
  // nothing per-point needs storing and the static poster reproduces it exactly.
  vec2 r2 = fract(vec2(index * uR2.x, index * uR2.y));

  // Even scattered, the drawing is still the data: intensity biases height, so
  // heavy sets sit high in the field.
  vec2 p = vec2(r2.x, r2.y * 0.65 + intensity * 0.35);

  // --- migrate to the margins ----------------------------------------------
  // Full bleed over the hero, then pushed outward so the centre column stays
  // clean behind the text. Raising |x - 0.5| to a shrinking power moves mass
  // toward both edges while keeping the order of points intact.
  float margin = smoothstep(0.015, 0.30, uProgress);
  float c = p.x - 0.5;
  float s = c < 0.0 ? -1.0 : 1.0;  // named s so it cannot shadow the sign builtin
  float mag = pow(clamp(abs(c) * 2.0, 0.0, 1.0), 1.0 - 0.72 * margin);
  p.x = 0.5 + s * mag * 0.5;

  // --- drift ----------------------------------------------------------------
  // A slow, cheap flow, damped to nothing as the footer arrives.
  float stillness = 1.0 - smoothstep(0.86, 1.0, uProgress);
  float t = uTime * 0.055;
  vec2 flow = vec2(
    sin(p.y * 6.1 + t + index * 0.0007),
    cos(p.x * 5.3 - t * 0.83 + index * 0.0011)
  ) * 0.011;
  p += flow * stillness;

  // --- pointer --------------------------------------------------------------
  // Weight and inertia, not a snappy repel: the uniform itself is eased on the
  // CPU, and the falloff here is wide and shallow.
  vec2 pa = vec2(p.x * uAspect, p.y);
  vec2 ma = vec2(uPointer.x * uAspect, uPointer.y);
  vec2 d = pa - ma;
  float dist2 = dot(d, d);
  float pull = exp(-dist2 * 7.0) * 0.055;
  p += normalize(d + vec2(1e-5)) * pull;

  // --- thinning -------------------------------------------------------------
  // Past the hero the field is a companion to the text, not the subject. Drop
  // a deterministic slice of the points rather than fading everything, which
  // keeps the marks that remain crisp instead of grey.
  float lot = fract(index * 0.6180339887);
  float cull = margin * 0.5 + (1.0 - uDensity);
  float alive = step(cull, lot);

  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);

  // Heavier sets draw slightly bigger and darker; the lift index nudges size so
  // the eight bands do not read as one uniform texture.
  float size = (0.85 + volume * 1.5 + mod(lift, 2.0) * 0.12) * uPixelRatio;
  gl_PointSize = size * alive;

  float ink = 0.15 + volume * 0.2;
  vAlpha = ink * mix(1.0, 0.62, margin) * alive;
}
`,n=`
precision mediump float;

uniform vec3 uInk;
varying float vAlpha;

void main() {
  // A round mark with a soft edge. No glow, no halo — a pen touching paper.
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d);
  float mask = 1.0 - smoothstep(0.16, 0.25, r);
  if (mask <= 0.0) discard;
  gl_FragColor = vec4(uInk, vAlpha * mask);
}
`,a=(e,t,i,o)=>e+(t-e)*(1-Math.exp(-i*o));function l(e,t,i,o){let r=e.createShader(t);if(!r)throw Error(`could not create ${o} shader`);if(e.shaderSource(r,i),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r);throw e.deleteShader(r),Error(`${o} shader failed to compile: ${t}`)}return r}async function s(e){let t=await fetch("/Five-pack-Portfolio/field/manifest.json",{signal:e});if(!t.ok)throw Error(`manifest ${t.status}`);let i=await t.json(),o=await fetch(i.buffer,{signal:e});if(!o.ok)throw Error(`buffer ${o.status}`);let r=new Uint16Array(await o.arrayBuffer()),n=i.count;if(r.length<3*n)throw Error("field buffer is short");let a=new Float32Array(3*n),l=new Float32Array(3*n);for(let e=0;e<n;e+=1){let t=3*e;a[t]=r[t]/65535,a[t+1]=r[t+1]/65535,a[t+2]=0;let i=r[t+2];l[t]=e,l[t+1]=(i>>6&63)/63,l[t+2]=i>>12&15}return{count:n,positions:a,meta:l,r2:i.r2}}e.i(47167),e.s(["default",0,function({onReady:e,onLost:f}){let u=(0,i.useRef)(null);return(0,i.useEffect)(()=>{let t=u.current;if(!t)return;let i=new AbortController,c=null,d=e=>{e.preventDefault(),f()};return t.addEventListener("webglcontextlost",d),s(i.signal).then(s=>{i.signal.aborted||(c=function(e,t){let i=e.getContext("webgl2",{alpha:!0,antialias:!1,depth:!1,stencil:!1,premultipliedAlpha:!1,powerPreference:"low-power"})??e.getContext("webgl",{alpha:!0,antialias:!1,depth:!1,stencil:!1,premultipliedAlpha:!1});if(!i)throw Error("no WebGL context");let s=function(e,t,i,o){let r=l(e,e.VERTEX_SHADER,t,`${o} vertex`),n=l(e,e.FRAGMENT_SHADER,i,`${o} fragment`),a=e.createProgram();if(!a)throw Error(`could not create ${o} program`);if(e.attachShader(a,r),e.attachShader(a,n),e.linkProgram(a),e.deleteShader(r),e.deleteShader(n),!e.getProgramParameter(a,e.LINK_STATUS)){let t=e.getProgramInfoLog(a);throw e.deleteProgram(a),Error(`${o} program failed to link: ${t}`)}return a}(i,r,n,"field"),f=i.createBuffer();i.bindBuffer(i.ARRAY_BUFFER,f),i.bufferData(i.ARRAY_BUFFER,t.positions,i.STATIC_DRAW);let u=i.createBuffer();i.bindBuffer(i.ARRAY_BUFFER,u),i.bufferData(i.ARRAY_BUFFER,t.meta,i.STATIC_DRAW);let c={position:i.getAttribLocation(s,"position"),aMeta:i.getAttribLocation(s,"aMeta"),uTime:i.getUniformLocation(s,"uTime"),uProgress:i.getUniformLocation(s,"uProgress"),uAspect:i.getUniformLocation(s,"uAspect"),uPixelRatio:i.getUniformLocation(s,"uPixelRatio"),uDensity:i.getUniformLocation(s,"uDensity"),uPointer:i.getUniformLocation(s,"uPointer"),uR2:i.getUniformLocation(s,"uR2"),uInk:i.getUniformLocation(s,"uInk")},d=function(){let e=getComputedStyle(document.documentElement).getPropertyValue("--ink").trim(),t=/^#([0-9a-f]{6})$/i.exec(e);if(!t)return[.09,.082,.071];let i=parseInt(t[1],16),o=e=>e<=.04045?e/12.92:((e+.055)/1.055)**2.4;return[o((i>>16&255)/255),o((i>>8&255)/255),o((255&i)/255)]}();i.disable(i.DEPTH_TEST),i.enable(i.BLEND),i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA),i.clearColor(0,0,0,0);let h=0,m=0,p=.5,g=.5,v=1,w=0,A=0,b=0,x=0;function y(){let t=Math.min(window.devicePixelRatio||1,1.75),o=Math.round(e.clientWidth*t),r=Math.round(e.clientHeight*t);(o!==e.width||r!==e.height)&&(e.width=o,e.height=r,w=e.clientWidth,A=e.clientHeight,i.viewport(0,0,o,r))}y();let R=new ResizeObserver(y);R.observe(e);let P=0,E=0;function S(e){P=requestAnimationFrame(S);let r=0===E?1/60:Math.min((e-E)/1e3,.05);E=e,h+=r,m=a(m,o.fieldState.progress,9,r),p=a(p,(o.fieldState.pointerX+1)/2,1.7,r),g=a(g,(o.fieldState.pointerY+1)/2,1.7,r);let n=Math.min(window.devicePixelRatio||1,1.75),l=w/Math.max(1,A);if(i.clear(i.COLOR_BUFFER_BIT),i.useProgram(s),i.uniform1f(c.uTime,h),i.uniform1f(c.uProgress,m),i.uniform1f(c.uAspect,l),i.uniform1f(c.uPixelRatio,n),i.uniform1f(c.uDensity,v),i.uniform2f(c.uPointer,p,g),i.uniform2f(c.uR2,t.r2[0],t.r2[1]),i.uniform3f(c.uInk,d[0],d[1],d[2]),i.bindBuffer(i.ARRAY_BUFFER,f),i.enableVertexAttribArray(c.position),i.vertexAttribPointer(c.position,3,i.FLOAT,!1,0,0),i.bindBuffer(i.ARRAY_BUFFER,u),i.enableVertexAttribArray(c.aMeta),i.vertexAttribPointer(c.aMeta,3,i.FLOAT,!1,0,0),i.drawArrays(i.POINTS,0,t.count),x+=1,0===b)b=e;else if(e-b>=1e3){let t=1e3*x/(e-b);t<45&&v>.35?v=Math.max(.35,v-.25):t>55&&v<1&&(v=Math.min(1,v+.15)),b=e,x=0}}function L(){0===P&&(E=0,P=requestAnimationFrame(S))}function _(){0!==P&&(cancelAnimationFrame(P),P=0)}function T(){let e="visible"===document.visibilityState;o.fieldState.visible=e,e?L():_()}return document.addEventListener("visibilitychange",T),L(),{destroy(){_(),document.removeEventListener("visibilitychange",T),R.disconnect(),i.deleteBuffer(f),i.deleteBuffer(u),i.deleteProgram(s),i.getExtension("WEBGL_lose_context")?.loseContext()}}}(t,s),e())}).catch(e=>{"AbortError"!==e.name&&(console.warn("[field] could not start, staying on the static frame:",e),f())}),()=>{i.abort(),t.removeEventListener("webglcontextlost",d),c?.destroy()}},[e,f]),(0,t.jsx)("canvas",{ref:u,className:"absolute inset-0 h-full w-full"})}],16734)},35717,e=>{e.n(e.i(16734))}]);