// @ts-nocheck
/* Personagem do monitor (design v1.1, INTERFACE.md 1.1.2). Copiado de design/prototipo/crias-monitor.js; usa o three do npm. */
import * as THREE from 'three';

// Personagem do monitor do Crias.
// <crias-monitor estado="carregando|pulo|parado|estatico|sequencia|pulo-demo" avatar zoom="olhos" fundo="escuro|claro" velocidade="1" giro="true" snapshot hero>
// pulo vai sozinho para parado. estatico desenha um quadro e para (com snapshot vira imagem e libera o WebGL).
const COR = { luz: '#b4e2f6', corpo: '#82cbec', fundo: '#3f9fd0', manchas: ['#cadea5', '#a7edcb', '#bfe3b4'], nuvem: '#ffffff', anel: '#ffd500', olho: '#030504' };
const PI = Math.PI, TAU = PI * 2;
const PULO = 1.3, ORBITA = 1.5;
const SEQS = { sequencia: [['carregando', 3.2], ['pulo', PULO], ['parado', 4.6], ['estatico', 2]], 'pulo-demo': [['pulo', 1.6], ['parado', 1.4]] };
const BLEND = { carregando: 0.5, pulo: 0.32, parado: 0.65, estatico: 0.5 };
const KEYS = ['x', 'y', 's', 'sx', 'sy', 'bx', 'tx', 'tz', 'sp', 'yaw', 'pitch', 'tilt', 'glow'];
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const bump = (u, a, d) => { const p = (u - a) / d; return p > 0 && p < 1 ? Math.sin(PI * p) : 0; };
const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; };
const rng = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

function pose(m, u, t, phi) {
  phi = phi || 0;
  const o = { x: 0, y: 0, s: 0.985, sx: 1, sy: 1, bx: 0, tx: PI, tz: 0, sp: 0, yaw: 0, pitch: 0, tilt: 0, glow: 0.3 };
  if (m === 'parado') {
    const b = 0.5 - 0.5 * Math.cos(TAU * t / 2.6);
    o.s = 0.965 + 0.035 * b; o.glow = 0.3 + 0.55 * b; o.y = 0.03 * Math.sin(TAU * t / 3.4);
    o.tx = PI + 0.1 * Math.sin(t * 0.9); o.sp = 0.12 * Math.sin(t * 0.7 + 1);
    o.yaw = 0.05 * Math.sin(t * 0.55); o.pitch = 0.03 * Math.sin(t * 0.41 + 2);
  } else if (m === 'carregando') {
    o.s = 1; o.y = 0.022 * Math.sin(TAU * u / 0.75);
    o.tx = PI / 2 - 0.5; o.sp = phi;
    o.yaw = -0.09 - 0.05 * Math.sin(phi); o.pitch = 0.02; o.tilt = 0.035;
    o.glow = 0.16 + 0.06 * Math.sin(TAU * u / ORBITA);
  } else if (m === 'pulo') {
    const a = bump(u, 0, 0.22), p = Math.min(1, Math.max(0, (u - 0.17) / 0.6)), air = p > 0 && p < 1 ? Math.sin(PI * p) : 0, land = bump(u, 0.74, 0.24);
    const lift = p > 0 && p < 1 ? Math.sin(PI * Math.min(1, p * 2.2)) * (1 - p) : 0;
    o.s = 1; o.y = 0.2 * air;
    o.sy = 1 - 0.04 * a - 0.035 * land + 0.025 * lift; o.sx = 1 + 0.03 * a + 0.03 * land - 0.012 * lift;
    o.tx = PI / 2 - 0.5 * Math.exp(-2.6 * u); o.sp = phi; o.bx = 0.3 * ease(Math.min(1, u / 0.7));
    o.yaw = (-0.09 - 0.05 * Math.sin(phi)) * Math.exp(-3 * u);
    o.pitch = -0.06 * air; o.glow = 0.2 + 0.28 * air;
  }
  return o;
}

let EARTH = null;
function earthCanvas() {
  if (EARTH) return EARTH;
  const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), r = rng(11);
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, COR.luz); g.addColorStop(0.42, COR.corpo); g.addColorStop(1, COR.fundo);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const blob = (cx, cy, rad, col, a, sx) => {
    for (const dx of [-W, 0, W]) {
      x.save(); x.translate(cx + dx, cy); x.scale(sx, 1);
      const rg = x.createRadialGradient(0, 0, 0, 0, 0, rad);
      rg.addColorStop(0, rgba(col, a)); rg.addColorStop(0.55, rgba(col, a * 0.7)); rg.addColorStop(1, rgba(col, 0));
      x.fillStyle = rg; x.beginPath(); x.arc(0, 0, rad, 0, TAU); x.fill(); x.restore();
    }
  };
  x.filter = 'blur(12px)';
  for (let i = 0; i < 12; i++) {
    const cx = r() * W, cy = H * (0.24 + r() * 0.52), base = 45 + r() * 100, col = COR.manchas[i % 3];
    for (let k = 0; k < 5; k++) blob(cx + (r() - 0.5) * base * 1.6, cy + (r() - 0.5) * base * 0.8, base * (0.35 + r() * 0.55), col, 0.34, 1.35);
  }
  x.filter = 'blur(9px)';
  for (let i = 0; i < 16; i++) blob(r() * W, H * (0.1 + r() * 0.8), 22 + r() * 54, COR.nuvem, 0.2, 2.8);
  x.filter = 'none';
  const pg = x.createLinearGradient(0, 0, 0, H);
  pg.addColorStop(0, 'rgba(255,255,255,.35)'); pg.addColorStop(0.1, 'rgba(255,255,255,0)'); pg.addColorStop(0.87, 'rgba(255,255,255,0)'); pg.addColorStop(1, 'rgba(255,255,255,.15)');
  x.fillStyle = pg; x.fillRect(0, 0, W, H);
  EARTH = c; return c;
}
function radialCanvas(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([o, col]) => g.addColorStop(o, col)); x.fillStyle = g; x.fillRect(0, 0, 256, 256); return c;
}
function envFor(renderer) {
  const pm = new THREE.PMREMGenerator(renderer), sc = new THREE.Scene();
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: 0x1c2420 })));
  const box = (w, h, p, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide })); m.position.set(p[0], p[1], p[2]); m.lookAt(0, 0, 0); sc.add(m); };
  box(5, 3.5, [-4, 5, 5], 7); box(2.5, 6, [6, 1, 2], 2.2); box(8, 2, [0, -6, 3], 0.5); box(4, 4, [2, 4, -6], 1.4);
  const t = pm.fromScene(sc, 0.03).texture; pm.dispose(); return t;
}

const STILL = {}; let STILL_Q = Promise.resolve();
const clockPhi = () => -TAU * (performance.now() / 1000) / ORBITA;
class CriasMonitor extends HTMLElement {
  static get observedAttributes() { return ['estado', 'zoom', 'fundo', 'velocidade', 'giro', 'avatar']; }
  set estado(v) { this.setAttribute('estado', v); } get estado() { return this.getAttribute('estado') || 'parado'; }
  set zoom(v) { v ? this.setAttribute('zoom', v) : this.removeAttribute('zoom'); }
  set fundo(v) { this.setAttribute('fundo', v); }
  set velocidade(v) { this.setAttribute('velocidade', String(v)); }
  set giro(v) { this.setAttribute('giro', String(v)); }
  set hero(v) { this.setAttribute('hero', String(v)); }
  set avatar(v) { v ? this.setAttribute('avatar', '') : this.removeAttribute('avatar'); }
  set snapshot(v) { v ? this.setAttribute('snapshot', '') : this.removeAttribute('snapshot'); }
  connectedCallback() {
    if (this._on) return; this._on = true;
    if (!this.style.display) this.style.display = 'block'; this.style.position = this.style.position || 'relative';
    if (!this.style.width) this.style.width = '100%'; if (!this.style.height) this.style.height = '100%';
    this.reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.hasAttribute('snapshot') && this.getAttribute('estado') === 'estatico') { this.stillMount(); return; }
    this.build();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this);
    this.io = new IntersectionObserver((e) => { this.vis = e[0].isIntersecting; }, { rootMargin: '120px' }); this.io.observe(this);
    this.vis = true; this.t = 0; this.seqT = 0; this.last = performance.now(); this.spin = 0;
    this.nextBlink = 1.2 + Math.random() * 2; this.blinkT = -1; this.blink2 = false;
    this.phi = clockPhi(); this.cur = this.getAttribute('estado') === 'pulo' ? pose('carregando', 0, 0, this.phi) : pose('estatico', 0, 0); this.mode = null; this.applyEstado(this.getAttribute('estado') !== 'pulo');
    const tick = (now) => { this.raf = requestAnimationFrame(tick); const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; if (!this.vis) return; this.step(dt); };
    this.raf = requestAnimationFrame(tick);
  }
  stillKey() { return Math.round(this.clientWidth) + 'x' + Math.round(this.clientHeight) + (this.getAttribute('fundo') || 'escuro') + (this.hasAttribute('avatar') ? 'a' : '') + (this.getAttribute('zoom') || ''); }
  showImg(src) { let img = this.querySelector('img[data-still]'); if (!img) { img = document.createElement('img'); img.setAttribute('data-still', ''); img.alt = ''; img.setAttribute('aria-hidden', 'true'); img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'; this.appendChild(img); } img.src = src; }
  stillMount() {
    const go = () => { if (!this.isConnected) return; if (this.clientWidth < 3) { setTimeout(go, 400); return; } const k = this.stillKey(); if (STILL[k]) { this.showImg(STILL[k]); return; }
      STILL_Q = STILL_Q.then(() => new Promise((res) => { if (STILL[k]) { this.showImg(STILL[k]); res(); return; } this._sb = true; this.reduced = true; this.build(); this.mode = 'estatico'; this.snap = pose('estatico', 0, 0); this.cur = this.snap; this.mt = 0; this.bl = 0; this.t = 0; this.spin = 0; this.phi = 0; this.vis = true; this.sized = true; this.lastResize = 0; this.step(0); STILL[k] = this.renderer.domElement.toDataURL('image/png'); this.showImg(STILL[k]); this.release(); res(); })); };
    requestAnimationFrame(go);
  }
  disconnectedCallback() { cancelAnimationFrame(this.raf); this.ro && this.ro.disconnect(); this.io && this.io.disconnect(); this.release(); this._on = false; }
  release() { if (this.renderer) { this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove(); this.renderer = null; } }
  attributeChangedCallback(n) {
    if (!this.renderer) return;
    if (n === 'estado') this.applyEstado(false);
    if (n === 'zoom' || n === 'avatar') this.resize();
    if (n === 'fundo') this.applyFundo();
    this.dirty = true;
  }
  applyEstado(first) {
    const e = this.reduced ? 'parado' : this.estado;
    this.seq = SEQS[e] || null; this.seqT = 0; this.seqI = -1;
    if (!this.seq) this.setMode(e, first);
  }
  setMode(m, instant) {
    if (!pose(m, 0, 0)) m = 'parado';
    this.snap = Object.assign({}, this.cur); { const g0 = pose(m, 0, this.t || 0, this.phi || 0).sp, dd = this.snap.sp - g0; this.snap.sp = g0 + (((dd % TAU) + TAU + PI) % TAU - PI); }
    this.mode = m; this.mt = 0; this.bl = instant ? 0 : (BLEND[m] || 0.5); this.last = performance.now(); this.frozen = false; this.dirty = true;
    this.dispatchEvent(new CustomEvent('fase', { detail: m, bubbles: true }));
    if (this.hasAttribute('hero')) window.dispatchEvent(new CustomEvent('crias-monitor-fase', { detail: m }));
  }
  build() {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: this.hasAttribute('snapshot') || this.getAttribute('estado') === 'estatico' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    this.appendChild(renderer.domElement); this.renderer = renderer;
    const scene = new THREE.Scene(); scene.environment = envFor(renderer); this.scene = scene;
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x2c3a31, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(-3, 4, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0x9fd8f0, 0.5); fill.position.set(4, -1, 3); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 1.1); rim.position.set(2.5, 3, -4); scene.add(rim);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(radialCanvas([[0, 'rgba(255,213,0,.55)'], [0.35, 'rgba(255,213,0,.22)'], [1, 'rgba(255,213,0,0)']])), transparent: true, depthWrite: false }));
    glow.scale.set(4.4, 4.4, 1); glow.position.z = -1.4; scene.add(glow); this.glow = glow;
    const shadowTex = new THREE.CanvasTexture(radialCanvas([[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,.45)'], [1, 'rgba(255,255,255,0)']]));
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false }));
    shadow.rotation.x = -PI / 2; shadow.position.y = -1.78; scene.add(shadow); this.shadow = shadow;

    const root = new THREE.Group(); scene.add(root); this.root = root;
    const tex = new THREE.CanvasTexture(earthCanvas()); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.wrapS = THREE.RepeatWrapping;
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.62, metalness: 0, clearcoat: 0.2, clearcoatRoughness: 0.5, envMapIntensity: 0.35, sheen: 0.6, sheenColor: new THREE.Color('#9fd8f0'), sheenRoughness: 0.5 }));
    root.add(body); this.body = body;

    const face = new THREE.Group(); root.add(face); this.face = face;
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: COR.olho, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.4 });
    const eyeGeo = new THREE.SphereGeometry(0.135, 48, 32);
    this.eyes = [-1, 1].map((sd) => {
      const lat = 0.13, lon = sd * 0.31, rr = 0.975;
      const pv = new THREE.Group(); pv.position.set(rr * Math.sin(lon) * Math.cos(lat), rr * Math.sin(lat), rr * Math.cos(lon) * Math.cos(lat));
      pv.lookAt(pv.position.clone().multiplyScalar(2)); face.add(pv);
      const e = new THREE.Mesh(eyeGeo, eyeMat); e.scale.set(1, 1.08, 0.78); pv.add(e); return e;
    });

    const ringBase = new THREE.Group(); root.add(ringBase); this.ringBase = ringBase;
    const ringSpin = new THREE.Group(); ringBase.add(ringSpin); this.ringSpin = ringSpin;
    const ringTilt = new THREE.Group(); ringSpin.add(ringTilt); this.ringTilt = ringTilt;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.076, 40, 200), new THREE.MeshPhysicalMaterial({ color: COR.anel, roughness: 0.3, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.2, envMapIntensity: 0.9, emissive: new THREE.Color('#ffb300'), emissiveIntensity: 0.06 }));
    ringTilt.add(ring);
    this.applyFundo(); this.resize();
  }
  applyFundo() { const dark = (this.getAttribute('fundo') || 'escuro') !== 'claro'; this.shadow.material.color.set(dark ? '#ffd500' : '#0b2a1c'); this.glowMul = dark ? 1 : 0.75; this.renderer.toneMappingExposure = dark ? 1 : 1.12; this.dirty = true; }
  resize() {
    if (!this.renderer) return;
    const w = Math.max(1, this.clientWidth), h = Math.max(1, this.clientHeight);
    this.sized = w > 2 && h > 2; this.lastResize = performance.now(); this.renderer.setSize(w, h, false); this.camera.aspect = w / h;
    const av = this.hasAttribute('avatar'), fit = Math.max(1, 1 / Math.min(1, w / h));
    if (this.getAttribute('zoom') === 'olhos') { this.camera.fov = 24; this.camera.position.set(0, 0.16, 3.1); this.camera.lookAt(0, 0.1, 0.5); }
    else if (av) { this.camera.fov = 32; this.camera.position.set(0, 0.2, 5.9); this.camera.lookAt(0, 0.06, 0); }
    else { this.camera.fov = 32; this.camera.position.set(0, 0.35, 7.4 * fit); this.camera.lookAt(0, -0.08, 0); }
    this.shadow.visible = !av; this.camera.updateProjectionMatrix(); this.dirty = true; this.frozen = false;
  }
  step(dt) {
    if (!this.renderer) return;
    const vel = parseFloat(this.getAttribute('velocidade')) || 1, d = dt * vel;
    if (this.seq) {
      this.seqT += d; const tot = this.seq.reduce((a, x) => a + x[1], 0); let lt = this.seqT % tot, i = 0;
      while (i < this.seq.length - 1 && lt >= this.seq[i][1]) { lt -= this.seq[i][1]; i++; }
      if (i !== this.seqI) { this.seqI = i; this.setMode(this.seq[i][0], false); }
    }
    if (this.mode === 'pulo' && !this.seq && this.mt >= PULO) this.setMode('parado', false);
    const still = this.mode === 'estatico';
    if (still && this.frozen && !this.dirty) return;
    this.mt += d; if (!still) this.t += d;
    const om = this.mode === 'carregando' ? -TAU / ORBITA : this.mode === 'pulo' ? -TAU / ORBITA * Math.exp(-1.2 * this.mt) : 0; this.phi = this.mode === 'carregando' && vel === 1 ? clockPhi() : (this.phi || 0) + d * om;
    const tg = pose(this.mode, this.mt, this.t, this.phi), e = this.bl > 0 ? ease(Math.min(1, this.mt / this.bl)) : 1, c = {};
    KEYS.forEach((k) => { c[k] = this.snap[k] + (tg[k] - this.snap[k]) * e; });
    this.cur = c;
    this.root.position.set(c.x, c.y, 0); this.root.scale.set(c.s * c.sx, c.s * c.sy, c.s * c.sx); this.root.rotation.z = c.tilt;
    this.ringBase.rotation.x = c.bx; this.ringSpin.rotation.y = c.sp; this.ringTilt.rotation.set(c.tx, 0, c.tz);
    this.face.rotation.set(-c.pitch, c.yaw, 0);
    if (!still && this.getAttribute('giro') !== 'false' && !this.reduced) this.spin += d * 0.16; this.body.rotation.y = this.spin;
    const av = this.hasAttribute('avatar');
    this.glow.material.opacity = Math.min(1, c.glow * this.glowMul * (av ? 0.6 : 1)); const gs = 4.2 + 0.5 * c.glow; this.glow.scale.set(gs, gs, 1); this.glow.position.set(c.x, c.y, -1.4);
    const ss = (1 - c.y * 0.9) * c.s; this.shadow.position.x = c.x; this.shadow.scale.set(ss, 0.55 * ss, 1); this.shadow.material.opacity = 0.2 * Math.max(0, 1 - c.y * 1.6);
    let bl = 1;
    if (!still && !this.reduced) {
      this.nextBlink -= dt;
      if (this.blinkT < 0 && this.nextBlink <= 0) this.blinkT = 0;
      if (this.blinkT >= 0) {
        this.blinkT += dt; const p = this.blinkT / 0.16;
        if (p >= 1) { this.blinkT = -1; if (!this.blink2 && Math.random() < 0.18) { this.blink2 = true; this.nextBlink = 0.12; } else { this.blink2 = false; this.nextBlink = 2.4 + Math.random() * 3.1; } }
        else bl = 1 - 0.92 * Math.sin(PI * p);
      }
    } else { this.blinkT = -1; }
    this.eyes.forEach((m) => { m.scale.y = 1.08 * bl; });
    this.renderer.render(this.scene, this.camera); this.dirty = false;
    if (!this._sb && still && this.mt >= this.bl && (!this.hasAttribute('snapshot') || (this.sized && performance.now() - this.lastResize > 250))) {
      this.frozen = true;
      if (this.hasAttribute('snapshot')) {
        const k = this.stillKey(); if (!STILL[k]) { this.snap = pose('estatico', 0, 0); this.mt = 1; this.bl = 0; } this.showImg(STILL[k] || this.renderer.domElement.toDataURL('image/png')); cancelAnimationFrame(this.raf); this.release();
      }
    }
  }
}
if (!customElements.get('crias-monitor')) customElements.define('crias-monitor', CriasMonitor);
