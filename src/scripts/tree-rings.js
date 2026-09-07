/* Procedurally generated tree ring cross-section to svg
   e.g. <tree-rings seed="3" years="46" color="#2F8F3B" rotate style="width:600px;height:600px"></tree-rings> */

(function () {
  function generate({ seed = 3, years = 46, color = '#2F8F3B', stroke = 1 } = {}) {
    let s = (seed * 7919 + 17) % 2147483647 || 3;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const R = 400, core = 12, cx = 560, cy = 450;
    const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
    const scars = []; for (let i = 0; i < 5; i++) scars.push([rnd() * Math.PI * 2, (rnd() - .3) * .09, .35 + rnd() * .4, .2 + rnd() * .8, .15 + rnd() * .25]);
    const drift = [(rnd() - .5) * 120, (rnd() - .5) * 100, (rnd() - .5) * 50, (rnd() - .5) * 40];
    const ring = (rad, t) => {
      const N = 160, pts = [], f = rad / R;
      for (let i = 0; i < N; i++) {
        const a = i / N * Math.PI * 2;
        const outer = (.07 * Math.sin(a * 2 + ph[0]) + .05 * Math.sin(a * 3 + ph[1]) + .02 * Math.sin(a * 4 + ph[2]) + .012 * Math.sin(a * 6 + t * .15)) * f;
        const inner = (.22 * Math.sin(a * 2 + ph[3]) + .12 * Math.sin(a * 3 + ph[4]) + .08 * Math.sin(a * 5 + t * .4)) * Math.max(0, 1 - f * 2.2);
        let bump = 0;
        for (const [sa, ss, sw, sr, srw] of scars) {
          const da = Math.abs(((a - sa + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          bump += ss * Math.exp(-(da * da) / (2 * sw * sw)) * Math.exp(-((f - sr) ** 2) / (2 * srw * srw));
        }
        const rr = rad * (1 + outer + inner + bump) + Math.sin(a * 13 + t * 1.7) * .9;
        pts.push([cx + Math.cos(a) * rr + f * drift[0] + (1 - f) * drift[2], cy + Math.sin(a) * rr + f * drift[1] + (1 - f) * drift[3]]);
      }
      let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
      for (let i = 0; i < N; i++) {
        const p0 = pts[(i - 1 + N) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
      }
      return d + 'Z';
    };
    const weights = []; let sum = 0;
    for (let y = 0; y < years; y++) { const w = (.35 + rnd() * 1.4) * (.3 + 1.2 * y / years); weights.push(w); sum += w; }
    const heavy = new Set(); for (let i = 0; i < Math.max(2, Math.round(years / 11)); i++) heavy.add(Math.floor(rnd() * years));
    let rad = core, out = '';
    weights.forEach((w, y) => {
      rad += (R - core - 8) * w / sum;
      out += `<path d="${ring(rad, y)}" stroke-width="${((heavy.has(y) ? 2.6 : 1.1 + w * .35) * stroke).toFixed(2)}"/>`;
    });
    out += `<path d="${ring(R, years)}" stroke-width="${(4.5 * stroke).toFixed(2)}"/>`;
    out += `<path d="${ring(core * .5, -2)}" fill="${color}" stroke="none"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><g fill="none" stroke="${color}" stroke-linejoin="round">${out}</g></svg>`;
  }

  class TreeRings extends HTMLElement {
    static get observedAttributes() { return ['seed', 'years', 'color', 'stroke', 'rotate', 'speed']; }
    connectedCallback() { this.attachShadow({ mode: 'open' }); this.render(); }
    attributeChangedCallback() { if (this.shadowRoot) this.render(); }
    opts() {
      return { seed: +this.getAttribute('seed') || 3, years: +this.getAttribute('years') || 46, color: this.getAttribute('color') || '#2F8F3B', stroke: +this.getAttribute('stroke') || 1 };
    }
    svg() { return generate(this.opts()); }
    render() {
      const spin = this.hasAttribute('rotate'), speed = this.getAttribute('speed') || 240;
      this.shadowRoot.innerHTML = `<style>:host{display:block}svg{width:100%;height:100%;display:block;transform-origin:50% 50%;${spin ? `animation:turn ${speed}s linear infinite` : ''}}@keyframes turn{to{transform:rotate(360deg)}}</style>${this.svg()}`;
    }
    download(name) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([this.svg()], { type: 'image/svg+xml' }));
      a.download = name || `tree-rings-${this.opts().seed}.svg`; a.click(); URL.revokeObjectURL(a.href);
    }
  }
  if (!customElements.get('tree-rings')) customElements.define('tree-rings', TreeRings);
  window.TreeRings = { generate };
})();
