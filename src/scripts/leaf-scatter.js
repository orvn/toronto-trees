
const TAU = Math.PI * 2;

// distances in px
export function start(host, canvas, { text, leaves: species, physics: P }) {
  const ctx = canvas.getContext('2d');
  const root = getComputedStyle(document.documentElement);
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const kinds = species.map(([name, weight, color]) => {
    const img = new Image();
    img.src = `/icons/leaves/${name}.png`;
    return { img, weight, color: root.getPropertyValue(color).trim() || '#a7c957' };
  });
  const bag = kinds.flatMap((k, i) => Array(k.weight).fill(i));
  const leaves = Array.from({ length: P.count }, () => ({
    kind: kinds[bag[Math.floor(Math.random() * bag.length)]],
    s: P.sizeMin + Math.random() * P.sizeRange, ph: Math.random() * TAU,
    x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0, tx: 0, ty: 0, ta: 0, wake: 0, held: null, ground: false,
  }));

  let w = 0, h = 0, dpr = 1, scale = 1, last, raf, ptr = null, held = [], placed = false;

  const pos = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-grabbing');
    const [x, y] = pos(e);
    ptr = { x, y, vx: 0, vy: 0 };
    held = leaves.filter(l => Math.hypot(l.x - x, l.y - y) < P.grabRadius * scale);
    for (const l of held) {
      const ang = Math.random() * TAU, rr = Math.random() * P.holdSpread * scale;
      l.held = [Math.cos(ang) * rr, Math.sin(ang) * rr];
      l.va += (Math.random() - .5) * P.holdSpin;
    }
  });

  canvas.addEventListener('pointermove', e => {
    if (!ptr) return;
    const [x, y] = pos(e);
    ptr.vx = x - ptr.x; ptr.vy = y - ptr.y; ptr.x = x; ptr.y = y;
  });

  const release = () => {
    if (!ptr) return;
    canvas.classList.remove('is-grabbing');
    const now = performance.now() / 1000;
    for (const l of held) {
      l.held = null; l.ground = false;
      l.vx = ptr.vx * P.throwCarry + (Math.random() - .5) * P.throwJitter;
      l.vy = ptr.vy * P.throwCarry + (Math.random() - .5) * P.throwJitter;
      l.va = (Math.random() - .5) * P.throwSpin;
      l.wake = now + P.restMin + Math.random() * P.restRange;
    }
    held = []; ptr = null;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  // Sample glyphs into target points for each leaf
  function resize() {
    const r = host.getBoundingClientRect();
    if (r.width < 40 || r.height < 40) return;
    w = r.width; h = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);

    const oc = document.createElement('canvas');
    oc.width = Math.ceil(w); oc.height = Math.ceil(h);
    const o = oc.getContext('2d'), family = getComputedStyle(host).fontFamily;
    o.font = `700 100px ${family}`;
    const fs = Math.min(100 * w * P.textWidth / o.measureText(text).width, h * P.textHeight);
    o.font = `700 ${fs}px ${family}`; o.textAlign = 'center'; o.textBaseline = 'middle';
    o.fillText(text, w / 2, h / 2);

    const d = o.getImageData(0, 0, oc.width, oc.height).data, pts = [];
    for (let y = 0; y < oc.height; y += P.sampleStep) {
      for (let x = 0; x < oc.width; x += P.sampleStep) if (d[(y * oc.width + x) * 4 + 3] > 128) pts.push([x, y]);
    }
    scale = Math.max(P.scaleMin, Math.min(P.scaleMax, fs / P.scaleRef));
    for (const l of leaves) {
      const p = pts[Math.floor(Math.random() * pts.length)] || [w / 2, h / 2];
      l.tx = p[0]; l.ty = p[1]; l.ta = (Math.random() - .5) * P.tiltRange;
    }
    if (!placed) { placed = true; calm ? settle() : scatter(); }
  }

  // Aerial view: leaves are strewn just off the left edge, a gust carries them in
  function scatter() {
    const now = performance.now() / 1000;
    for (const l of leaves) {
      l.x = -40 - Math.random() * w * P.scatterSpread; l.y = Math.random() * h;
      l.vx = l.vy = 0; l.a = Math.random() * TAU; l.va = 0; l.ground = true; l.held = null;
      l.wake = now + P.scatterDelay + (-l.x / w) * P.scatterStagger + Math.random() * P.scatterJitter;
    }
  }

  function settle() {
    for (const l of leaves) { l.x = l.tx; l.y = l.ty; l.a = l.ta; l.vx = l.vy = l.va = 0; l.wake = 0; }
  }

  function frame(t) {
    raf = requestAnimationFrame(frame);
    const now = t / 1000, dt = Math.min(.05, now - (last ?? now)), f = dt * 60;
    last = now;
    if (!w) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    for (const l of leaves) {
      if (l.held && ptr) {
        l.vx = (ptr.x + l.held[0] - l.x) * P.holdPull; l.vy = (ptr.y + l.held[1] - l.y) * P.holdPull;
        l.x += l.vx * f; l.y += l.vy * f;
        l.a += (Math.sin(now * 4 + l.ph) * .02 + ptr.vx * .004) * f;
      } else if (now < l.wake) {
        // Flung: skids across the ground with a light crosswind, slowing to rest
        if (!l.ground) {
          const sp = Math.hypot(l.vx, l.vy), k = Math.min(1, sp);
          l.vx += (Math.sin(now * 1.7 + l.ph) * P.skidWind + P.skidDrift) * k * f;
          l.vy += Math.cos(now * 1.3 + l.ph) * P.skidWind * k * f;
          l.vx *= P.skidDrag ** f; l.vy *= P.skidDrag ** f;
          l.x += l.vx * f; l.y += l.vy * f;
          l.va *= P.skidSpinDrag ** f; l.a += (l.va + l.vx * .004) * f;
          if (sp < P.skidStop) { l.ground = true; l.vx = l.vy = 0; }
        }
      } else {
        // Wind carries leaves in arcs
        l.ground = false;
        const dx = l.tx - l.x, dy = l.ty - l.y, dist = Math.hypot(dx, dy);
        const flutter = Math.min(1, dist / P.flutterDist);
        l.vx += (dx * P.windPull - dy * P.windCurl * flutter + Math.sin(now * 2.2 + l.ph) * P.windGust * flutter) * f;
        l.vy += (dy * P.windPull + dx * P.windLift * flutter - P.windRise * flutter) * f;
        const damp = (dist < P.settleDist ? P.settleDamp : P.flightDamp) ** f;
        l.vx *= damp; l.vy *= damp; l.x += l.vx * f; l.y += l.vy * f;
        l.va += ((l.ta - l.a) * (dist < P.alignDist ? P.alignPull : 0) + Math.sin(now * 3 + l.ph) * P.wobble * flutter) * f;
        l.va *= P.spinDrag ** f; l.a += l.va * f;
      }

      const { img, color } = l.kind, s = l.s * scale;
      const moving = l.held ? 1 : Math.min(1, Math.hypot(l.vx, l.vy) / 4);
      const flip = Math.cos(now * P.flipSpeed + l.ph) * moving;
      ctx.save();
      ctx.translate(l.x, l.y); ctx.rotate(l.a); ctx.scale(1, 1 - Math.abs(flip) * P.flipSquash);
      if (img.complete && img.naturalWidth) ctx.drawImage(img, -s / 2, -s / 2, s, s);
      else { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, s * .45, s * .26, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  }

  const ro = new ResizeObserver(resize);
  document.fonts.ready.then(() => { ro.observe(host); raf = requestAnimationFrame(frame); });

  return {
    replay: () => placed && scatter(),
    stop: () => { cancelAnimationFrame(raf); ro.disconnect(); },
  };
}
