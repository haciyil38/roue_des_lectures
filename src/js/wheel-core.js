/* Roue partagée par toutes les pages */
const THEME_DEFAULT = ['#f9c5d1', '#fde2b8', '#cfe3c3', '#d9ccee', '#bfe0e6', '#f7d6e0'];
function themeVar(name, fallback) {
  const v = getComputedStyle(document.body).getPropertyValue(name).trim();
  return v || fallback;
}
const TAU = Math.PI * 2;

class Wheel {
  constructor(canvas, values) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.angle = Math.random() * TAU;
    this.setValues(values);
    window.addEventListener('resize', () => this.draw());
  }
  setValues(values) { this.values = values; this.draw(); }

  draw() {
    const size = this.canvas.clientWidth || 400;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = size * dpr; this.canvas.height = size * dpr;
    const ctx = this.ctx;
    const PALETTE = themeVar('--wheel-palette', '').split(',').map(s => s.trim()).filter(Boolean);
    if (!PALETTE.length) PALETTE.push(...THEME_DEFAULT);
    const HUB = themeVar('--rose', '#f4a7bd');
    const BORDER = themeVar('--wheel-border', '#c4577b');
    const FONT = themeVar('--font-head', '"Playfair Display", serif');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const c = size / 2, r = c - 10, n = this.values.length, seg = TAU / n;

    // bord doré
    ctx.beginPath(); ctx.arc(c, c, r + 6, 0, TAU);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = BORDER; ctx.stroke();

    // une seule taille de police pour toute la roue, réduite si un libellé est trop long
    const maxW = r - size * 0.19;
    let fs = Math.min(size * 0.085, seg * r * 0.5);
    ctx.font = `700 ${fs}px ${FONT}`;
    for (const v of this.values) {
      const w = ctx.measureText(String(v)).width;
      if (w > maxW) fs = Math.max(10, fs * Math.min(1, maxW / w));
    }
    fs = Math.round(fs);

    for (let i = 0; i < n; i++) {
      const a0 = this.angle + i * seg - Math.PI / 2;
      let col = PALETTE[i % PALETTE.length];
      if (i === n - 1 && i % PALETTE.length === 0) col = PALETTE[2];
      ctx.beginPath(); ctx.moveTo(c, c); ctx.arc(c, c, r, a0, a0 + seg); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();

      ctx.save();
      ctx.translate(c, c); ctx.rotate(a0 + seg / 2);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#4a3a3f';
      const label = String(this.values[i]);
      ctx.font = `700 ${fs}px ${FONT}`;
      ctx.fillText(label, r - size * 0.05, 0);
      ctx.restore();
    }
    // petits points sur le bord
    for (let i = 0; i < n; i++) {
      const a = this.angle + i * seg - Math.PI / 2;
      ctx.beginPath(); ctx.arc(c + Math.cos(a) * (r + 1), c + Math.sin(a) * (r + 1), 4.5, 0, TAU);
      ctx.fillStyle = '#f7dc92'; ctx.fill();
    }
    // centre en fleur
    const pr = size * 0.045;
    for (let k = 0; k < 6; k++) {
      const a = (k * TAU) / 6;
      ctx.beginPath(); ctx.arc(c + Math.cos(a) * pr * 1.3, c + Math.sin(a) * pr * 1.3, pr, 0, TAU);
      ctx.fillStyle = HUB; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(c, c, pr * 1.1, 0, TAU);
    ctx.fillStyle = '#f7dc92'; ctx.fill();
  }

  /** Fait tourner la roue, résout avec la valeur obtenue. */
  spin(onPick) {
    const n = this.values.length, seg = TAU / n;
    const idx = Math.floor(Math.random() * n);
    if (onPick) onPick(this.values[idx]); // résultat enregistré dès le départ : un rechargement ne permet pas de retirer
    const jitter = (Math.random() - 0.5) * seg * 0.7;
    const target = -((idx + 0.5) * seg + jitter);
    const mod = x => ((x % TAU) + TAU) % TAU;
    const delta = mod(target - this.angle) + TAU * (5 + Math.floor(Math.random() * 3));
    const start = this.angle, dur = 4200 + Math.random() * 1200;
    const t0 = performance.now();
    return new Promise(resolve => {
      const step = now => {
        const t = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - t, 4);
        this.angle = start + delta * e;
        this.draw();
        if (t < 1) requestAnimationFrame(step); else resolve(this.values[idx]);
      };
      requestAnimationFrame(step);
    });
  }
}

