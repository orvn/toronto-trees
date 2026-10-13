/* Procedural canvas scene of a street grid planted with pointillist trees  */

(function () {
  const SPECIES = {
    maple: ['--celery', ['norway maple', 'silver maple', 'sugar maple', 'red maple']],
    elm: ['--asparagus', ['american elm', 'siberian elm']],
    oak: ['--killarney', ['red oak', 'bur oak', 'white oak']],
    linden: ['--golden', ['littleleaf linden']],
    ash: ['--terracotta', ['green ash']],
    locust: ['--golden', ['honey locust']],
    spruce: ['--casal', ['colorado spruce']],
    apple: ['--punch', ['crab apple']],
    cherry: ['--blush', ['japanese cherry']],
    birch: ['--geyser', ['white birch']],
    ginkgo: ['--raj', ['ginkgo']],
    catalpa: ['--lavender', ['northern catalpa']],
    other: ['--bombay', ['hackberry', 'kentucky coffeetree', 'serviceberry']],
  };
  const LINES = [-240, -120, 0, 120, 240];
  const FLAT = { g: 0, pitch: 1.55 }, GROWN = { g: 1, pitch: 0.42 };

  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  const shades = hex => {
    const n = parseInt(hex.slice(1), 16), rgb = [n >> 16, (n >> 8) & 255, n & 255];
    const f = m => `rgb(${m.map(v => Math.round(v)).join(',')})`;
    return [f(rgb.map(v => v * .7)), f(rgb), f(rgb.map(v => v + (255 - v) * .35))];
  };

  function build() {
    let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const keys = Object.keys(SPECIES), rest = keys.filter(k => !['maple', 'elm', 'oak'].includes(k));
    const pick = t => t < .55 ? 'maple' : t < .7 ? 'elm' : t < .85 ? 'oak' : rest[Math.min(rest.length - 1, Math.floor((t - .85) / .15 * rest.length))];
    const trees = [];
    const add = (x, z) => {
      const k = .45 + Math.pow(rnd(), 1.6) * 1.25, cr = 6 + 10 * k, h = 20 + 30 * k, cy = h * .66;
      const sp = pick(rnd()), names = SPECIES[sp][1];
      const n = Math.round(18 + cr * 2.4), buckets = [[], [], []];
      for (let i = 0; i < n; i++) {
        let a = rnd() * 2 - 1, b = rnd() * 2 - 1, c = rnd() * 2 - 1; const l = Math.hypot(a, b, c) || 1;
        const rr = cr * (.55 + .45 * Math.cbrt(rnd()));
        const ox = a / l * rr, oy = b / l * rr * .82, oz = c / l * rr;
        const lit = oy / cr + .5 * ox / cr;
        buckets[lit > .3 ? 2 : lit < -.25 ? 0 : 1].push(ox, oy, oz);
      }
      const pts = new Float32Array([].concat(...buckets)), ends = [buckets[0].length / 3, (buckets[0].length + buckets[1].length) / 3, n];
      trees.push({ x, z, cr, h, cy, trunkTop: cy - cr * .5, sp, name: names[Math.floor(rnd() * names.length)], dbh: Math.round(8 + k * 45), hm: Math.round(h / 3.2), ph: rnd() * 6.28, pts, ends });
    };
    for (const L of LINES) for (const side of [-11, 11]) {
      for (let p = -228; p <= 228; p += 30 + rnd() * 10) {
        if (LINES.some(q => Math.abs(p - q) < 16)) continue;
        add(p, L + side + (rnd() - .5) * 3);
      }
      for (let p = -228; p <= 228; p += 30 + rnd() * 10) {
        if (LINES.some(q => Math.abs(p - q) < 16)) continue;
        add(L + side + (rnd() - .5) * 3, p);
      }
    }
    for (let i = 0; i < 26; i++) add(20 + rnd() * 80, -100 + rnd() * 80);
    return trees;
  }

  class TreeScene extends HTMLElement {
    get view() { return this.gTarget === GROWN.g ? 'trees' : 'map'; }
    get reducedMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    get autoRotate() { return this.hasAttribute('auto-rotate') && !this.reducedMotion; }
    get canHover() { return window.matchMedia('(hover: hover) and (pointer: fine)').matches; }

    connectedCallback() {
      const cs = getComputedStyle(this);
      this.ink = cs.getPropertyValue('--charred').trim() || '#1b1f1a';
      this.muted = cs.getPropertyValue('--battleship').trim() || '#6b7069';
      this.bg = cs.getPropertyValue('--cararra').trim() || '#f4f4f0';
      this.fontFamily = cs.fontFamily || 'sans-serif';
      this.pal = {}; for (const k in SPECIES) this.pal[k] = shades(cs.getPropertyValue(SPECIES[k][0]).trim() || '#adb5bd');

      const c = document.createElement('canvas');
      c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab;touch-action:none;';
      if (cs.position === 'static') this.style.position = 'relative';
      this.append(c);
      this.cv = c; this.ctx = c.getContext('2d');
      this.g = 0; this.gTarget = 0; this.yaw = -0.7; this.pitch = FLAT.pitch; this.pitchTarget = FLAT.pitch; this.wind = 0; this.mouse = null;
      this.trees = this.trees || build();

      c.addEventListener('pointerdown', e => { this.drag = true; this.lx = e.clientX; this.ly = e.clientY; c.setPointerCapture(e.pointerId); c.style.cursor = 'grabbing'; });
      c.addEventListener('pointermove', e => {
        if (this.canHover) { const r = c.getBoundingClientRect(); this.mouse = [e.clientX - r.left, e.clientY - r.top]; }
        const dx = e.clientX - (this.lx ?? e.clientX), dy = e.clientY - (this.ly ?? e.clientY);
        this.lx = e.clientX; this.ly = e.clientY;
        if (this.drag) { this.yaw -= dx * 0.006; this.pitch = Math.min(1.55, Math.max(0.1, this.pitch + dy * 0.004)); this.pitchTarget = this.pitch; }
        else this.wind = Math.min(8, this.wind + Math.hypot(dx, dy) * 0.03);
      });
      const up = () => { this.drag = false; c.style.cursor = 'grab'; };
      c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
      c.addEventListener('pointerleave', () => { this.mouse = null; this.lx = this.ly = undefined; });

      this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this); this.resize();
      const loop = t => { this.frame(t); this.raf = requestAnimationFrame(loop); };
      this.raf = requestAnimationFrame(loop);
      requestAnimationFrame(() => this.setAttribute('ready', ''));
    }

    disconnectedCallback() {
      cancelAnimationFrame(this.raf); this.removeAttribute('ready');
      this.ro && this.ro.disconnect(); this.cv && this.cv.remove();
    }

    setView(view) {
      const to = view === 'trees' ? GROWN : FLAT;
      this.gTarget = to.g; this.pitchTarget = to.pitch;
      if (this.reducedMotion) { this.g = to.g; this.pitch = to.pitch; }
      this.dispatchEvent(new CustomEvent('tt:scene-view', { detail: { view }, bubbles: true }));
    }
    toggle() { this.setView(this.view === 'trees' ? 'map' : 'trees'); }

    resize() {
      const r = this.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      this.w = r.width; this.h = r.height; this.dpr = dpr;
      this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
    }

    frame(t) {
      const now = t / 1000, dt = Math.min(.05, now - (this.last ?? now)); this.last = now;
      const ctx = this.ctx, w = this.w, h = this.h; if (!w || !h) return;
      this.g += (this.gTarget - this.g) * (1 - Math.exp(-dt * 1.3));
      if (!this.drag) this.pitch += (this.pitchTarget - this.pitch) * (1 - Math.exp(-dt * 1.5));
      if (!this.drag && this.autoRotate) this.yaw += dt * .05;
      this.wind *= Math.exp(-dt * 1.2);
      const g = Math.min(1, Math.max(0, this.g)), gg = g * g * (3 - 2 * g);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      const cY = Math.cos(this.yaw), sY = Math.sin(this.yaw), cP = Math.cos(this.pitch), sP = Math.sin(this.pitch);
      const D = 900, F = Math.min(.82 * w, .85 * h) * D / 560, cx = w / 2, cyS = h * .54;
      const P = (x, y, z) => { const xr = x * cY - z * sY, zr = x * sY + z * cY, yv = y * cP + zr * sP, zv = zr * cP - y * sP, s = F / (zv + D); return [cx + xr * s, cyS - yv * s, s, zv]; };

      ctx.strokeStyle = 'rgba(27,31,26,.13)'; ctx.lineWidth = 1; ctx.beginPath();
      for (const L of LINES) {
        let a = P(-262, 0, L), b = P(262, 0, L); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        a = P(L, 0, -262); b = P(L, 0, 262); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      }
      ctx.stroke();

      const trees = this.trees;
      for (const tr of trees) { const p = P(tr.x, tr.cy * gg * .5, tr.z); tr.depth = p[3]; const top = P(tr.x, (tr.cy + tr.cr * .8) * gg, tr.z); tr.sx = top[0]; tr.sy = top[1]; }
      let hover = null;
      if (this.mouse && !this.drag) {
        let best = 38 * 38;
        for (const tr of trees) { const d = (tr.sx - this.mouse[0]) ** 2 + (tr.sy - this.mouse[1]) ** 2; if (d < best) { best = d; hover = tr; } }
      }
      
      // Travelling cloud effect
      const fade = Math.min(1, dt / .18), glide = 1 - Math.exp(-dt / .07);
      let c = this.cloud;
      if (hover) {
        if (!c) c = this.cloud = { x: hover.sx, y: hover.sy - 8, a: 0, tree: hover, prev: null, cross: 1 };
        else if (c.tree !== hover) { c.prev = c.tree; c.tree = hover; c.cross = 0; }
        c.a = Math.min(1, c.a + fade);
      } else if (c) {
        c.a -= fade;
        if (c.a <= 0) c = this.cloud = null;
      }
      if (c) {
        c.x += (c.tree.sx - c.x) * glide; c.y += (c.tree.sy - 8 - c.y) * glide;
        c.cross = Math.min(1, c.cross + dt / .15);
        if (c.cross >= 1) c.prev = null;
      }
      const order = trees.slice().sort((a, b) => b.depth - a.depth);
      const spread = .35 + .65 * gg;
      for (const tr of order) {
        const amp = (1.4 + this.wind) * gg, swx = Math.sin(now * 1.1 + tr.ph) * amp, swz = Math.cos(now * .8 + tr.ph * 1.3) * amp * .6;
        const big = c && tr === c.tree ? 1 + .5 * c.a * c.cross : c && tr === c.prev ? 1 + .5 * c.a * (1 - c.cross) : 1;
        if (gg > .02) {
          ctx.fillStyle = 'rgba(27,31,26,.5)';
          for (let i = 0; i <= 6; i++) {
            const y = tr.trunkTop * gg * i / 6, p = P(tr.x, y, tr.z), r = Math.max(.7, 1.3 * p[2] * big);
            ctx.fillRect(p[0] - r, p[1] - r, 2 * r, 2 * r);
          }
        }
        const sh = this.pal[tr.sp], pts = tr.pts; let i0 = 0;
        for (let b = 0; b < 3; b++) {
          ctx.fillStyle = sh[b];
          for (let i = i0; i < tr.ends[b]; i++) {
            const y = (tr.cy + pts[i * 3 + 1]) * gg, f = y / 60;
            const p = P(tr.x + pts[i * 3] * spread + swx * f, y, tr.z + pts[i * 3 + 2] * spread + swz * f);
            const r = Math.max(.8, 1.7 * p[2] * big);
            ctx.fillRect(p[0] - r, p[1] - r, 2 * r, 2 * r);
          }
          i0 = tr.ends[b];
        }
      }
      if (c) this.drawCloud(c);
    }

    drawCloud(c) {
      const ctx = this.ctx, e = c.a * c.a * (3 - 2 * c.a), y = c.y + (1 - e) * 6, x = c.x;
      const nameFont = `700 13px ${this.fontFamily}`, subFont = `400 12px ${this.fontFamily}`;
      const lines = tr => [tr.name, `trunk ${tr.dbh} cm · ${tr.hm} m tall`];
      const width = tr => { const [n, sub] = lines(tr); ctx.font = nameFont; const w1 = ctx.measureText(n).width; ctx.font = subFont; return Math.max(w1, ctx.measureText(sub).width); };
      const w = (c.prev ? width(c.prev) * (1 - c.cross) + width(c.tree) * c.cross : width(c.tree)) + 56, h = 64;
      ctx.save();
      ctx.globalAlpha = e;
      ctx.translate(x, y - 36); ctx.scale(w / h, 1);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, h / 2);
      grad.addColorStop(0, rgba(this.bg, .78)); grad.addColorStop(.5, rgba(this.bg, .6)); grad.addColorStop(1, rgba(this.bg, 0));
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, h / 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = e;
      ctx.strokeStyle = this.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(c.tree.sx, c.tree.sy - 8); ctx.lineTo(x, y - 26 * e); ctx.stroke();
      ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = rgba(this.bg, .7);
      const text = (tr, alpha) => {
        const [n, sub] = lines(tr); ctx.globalAlpha = e * alpha;
        ctx.font = nameFont; ctx.strokeText(n, x, y - 46); ctx.fillStyle = this.ink; ctx.fillText(n, x, y - 46);
        ctx.font = subFont; ctx.strokeText(sub, x, y - 31); ctx.fillStyle = this.muted; ctx.fillText(sub, x, y - 31);
      };
      if (c.prev) text(c.prev, 1 - c.cross);
      text(c.tree, c.prev ? c.cross : 1);
      ctx.restore();
    }
  }
  if (!customElements.get('tree-scene')) customElements.define('tree-scene', TreeScene);
})();
