/* Utilitaires communs : stockage, fleurs, en-tête, pied de page */
const KEYS = { spins: 'rdl_spins', books: 'rdl_books', config: 'rdl_config', sport: 'rdl_sport', activites: 'rdl_activites' };
const DEFAULT_CONFIG = { rounds: [1, 2, 3, 4, 5, 6], chapters: [1, 2, 3, 4, 5, 6, 7, 8] };

const Store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  },
  spins() { return this.get(KEYS.spins, []); },
  books() { return this.get(KEYS.books, []); },
  config() { return Object.assign({}, DEFAULT_CONFIG, this.get(KEYS.config, {})); },
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function plural(n, one, many) { return `${n} ${n > 1 ? many : one}`; }
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- Fleurs en SVG ---------- */
const FLOWER_COLORS = [
  ['#f4a7bd', '#f7dc92'], ['#fbd0dc', '#f2a65a'], ['#d9ccee', '#f7dc92'],
  ['#ffffff', '#f2a65a'], ['#f7c1a8', '#c4577b'], ['#bfe0e6', '#f7dc92'],
];
function flowerSVG(petals = 6, color = '#f4a7bd', center = '#f7dc92', size = 100) {
  let p = '';
  for (let i = 0; i < petals; i++) {
    const rot = (i * 360) / petals;
    p += `<ellipse cx="50" cy="25" rx="11.5" ry="22" fill="${color}" stroke="rgba(160,60,100,.18)" stroke-width="1" transform="rotate(${rot} 50 50)"/>`;
    p += `<ellipse cx="50" cy="27" rx="4" ry="13" fill="rgba(255,255,255,.35)" transform="rotate(${rot} 50 50)"/>`;
  }
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${p}
    <circle cx="50" cy="50" r="11" fill="${center}" stroke="rgba(160,100,20,.3)"/>
    <circle cx="46" cy="47" r="2" fill="rgba(255,255,255,.7)"/></svg>`;
}
function randomFlower(size) {
  const [c, m] = FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)];
  return flowerSVG(5 + Math.floor(Math.random() * 4), c, m, size);
}
function leafSVG(size = 40) {
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true"><path d="M4 36 C4 14 16 4 36 4 C36 24 24 36 4 36Z" fill="#a9c3a1" stroke="#4f6f52" stroke-opacity=".35"/><path d="M6 34 L30 10" stroke="#4f6f52" stroke-opacity=".4" fill="none"/></svg>`;
}
function bookIconSVG(size = 44) {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
    <path d="M6 14 C18 8 26 10 32 16 C38 10 46 8 58 14 V50 C46 44 38 46 32 52 C26 46 18 44 6 50Z" fill="#fffdf9" stroke="#c4577b" stroke-width="3" stroke-linejoin="round"/>
    <path d="M32 16 V52" stroke="#c4577b" stroke-width="3"/>
    <path d="M12 22 C18 20 23 21 27 24 M12 30 C18 28 23 29 27 32 M37 24 C41 21 46 20 52 22 M37 32 C41 29 46 28 52 30" stroke="#f2b5c6" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`;
}
function pointerSVG() {
  return `<svg viewBox="0 0 38 46"><path d="M19 44 C5 28 3 20 3 14 A16 14 0 0 1 35 14 C35 20 33 28 19 44Z" style="fill:var(--rose-deep)" stroke="#fff" stroke-width="3"/><circle cx="19" cy="14" r="5" fill="#fff"/></svg>`;
}

/* Thèmes par page : titre, slogan, emoji pour l'en-tête, les décors et les confettis */
const THEMES = {
  sport: { title: 'La Roue du Sport', tagline: 'un pas après l’autre…', brand: ['🏃', '👟'],
    deco: ['👟', '🏅', '⏱️', '🏃'], rain: ['👟', '🏅', '⭐', '💪', '🔥'], div: ['⏱️', '🏃', '⏱️'], foot: 'Allez, on bouge ! 💪' },
  activites: { title: 'La Roue des Activités', tagline: 'l’aventure du jour…', brand: ['🧭', '🗺️'],
    deco: ['🎨', '⛰️', '🧭', '📸'], rain: ['🎨', '⛰️', '📸', '🌟', '🎈'], div: ['🌟', '🧭', '🌟'], foot: 'Quelle belle journée en perspective ! ✨' },
};
const THEME = THEMES[document.body && document.body.dataset.page] || null;

function petalRain(n = 26) {
  if (THEME) {
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'petal emoji';
      el.textContent = THEME.rain[Math.floor(Math.random() * THEME.rain.length)];
      el.style.setProperty('--s', (18 + Math.random() * 22) + 'px');
      el.style.left = Math.random() * 100 + 'vw';
      el.style.animationDuration = 3 + Math.random() * 3 + 's';
      el.style.animationDelay = Math.random() * 1.2 + 's';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 8000);
    }
    return;
  }
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'petal';
    el.innerHTML = randomFlower(18 + Math.random() * 22);
    el.style.left = Math.random() * 100 + 'vw';
    el.style.animationDuration = 3 + Math.random() * 3 + 's';
    el.style.animationDelay = Math.random() * 1.2 + 's';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 8000);
  }
}

/* ---------- Gabarit commun ---------- */
function buildChrome() {
  const page = document.body.dataset.page;
  const nav = [
    ['wheel', 'index.html', '🎡', 'La roue'],
    ['sport', 'sport.html', '🏃', 'Sport'],
    ['activites', 'activites.html', '🗺️', 'Activités'],
    ['stats', 'stats.html', '🌷', 'Statistiques'],
    ['library', 'bibliotheque.html', '📚', 'Bibliothèque'],
  ];
  const header = document.getElementById('site-header');
  if (header) {
    header.className = 'site-header';
    header.innerHTML = `
      <a class="brand" href="index.html">
        ${THEME ? `<span style="font-size:48px;line-height:1">${THEME.brand[0]}</span>` : flowerSVG(6, '#f4a7bd', '#f7dc92', 54)}
        <span><h1>${THEME ? THEME.title : 'La Roue des Lectures'}</h1><small>${THEME ? THEME.tagline : 'un chapitre à la fois…'}</small></span>
        ${THEME ? `<span style="font-size:48px;line-height:1">${THEME.brand[1]}</span>` : bookIconSVG(54)}
      </a>
      <nav class="nav">${nav.map(([k, href, ic, label]) =>
        `<a href="${href}" class="${k === page ? 'active' : ''}"><span>${ic}</span>${label}</a>`).join('')}</nav>
      <div class="divider">${THEME ? THEME.div.map(e => `<span style="font-size:22px">${e}</span>`).join('') : flowerSVG(5, '#f2b5c6', '#f7dc92', 22) + leafSVG(22) + flowerSVG(5, '#d9ccee', '#f7dc92', 22)}</div>`;
  }
  const footer = document.getElementById('site-footer');
  if (footer) {
    footer.className = 'site-footer';
    footer.innerHTML = `<div class="row">${[0, 1, 2, 3, 4].map(() => THEME
        ? `<span style="font-size:26px">${THEME.rain[Math.floor(Math.random() * THEME.rain.length)]}</span>` : randomFlower(26)).join('')}</div>
      <div class="script" style="font-size:1.3rem">${THEME ? THEME.foot : 'Fait avec amour 💛'}</div>`;
  }
  const decos = [['tl', 230], ['tr', 160], ['bl', 190], ['br', 260]];
  decos.forEach(([pos, size], i) => {
    const d = document.createElement('div');
    d.className = 'deco ' + pos;
    if (THEME) {
      d.classList.add('emoji'); d.style.setProperty('--s', Math.round(size * 0.7) + 'px');
      d.innerHTML = `<span style="animation-delay:${-i * 2}s">${THEME.deco[i % THEME.deco.length]}</span>`;
      document.body.prepend(d); return;
    }
    const [c, m] = FLOWER_COLORS[i % FLOWER_COLORS.length];
    d.innerHTML = flowerSVG(7, c, m, size);
    document.body.prepend(d);
  });
}
document.addEventListener('DOMContentLoaded', buildChrome);
