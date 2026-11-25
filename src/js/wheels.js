/* Page "La roue" */
const PALETTE = ['#f9c5d1', '#fde2b8', '#cfe3c3', '#d9ccee', '#bfe0e6', '#f7d6e0'];
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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const c = size / 2, r = c - 10, n = this.values.length, seg = TAU / n;

    // bord doré
    ctx.beginPath(); ctx.arc(c, c, r + 6, 0, TAU);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = '#c4577b'; ctx.stroke();

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
      ctx.font = `700 ${Math.round(size * 0.085)}px "Playfair Display", serif`;
      ctx.fillText(String(this.values[i]), r - size * 0.06, 0);
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
      ctx.fillStyle = '#f4a7bd'; ctx.fill();
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

/* ---------- état de la page ----------
   Un « défi » = 1 tirage de la roue des rounds (N rounds) puis N tirages de la
   roue des chapitres, faits à des moments différents (elle lit entre chaque).
   Structure enregistrée : { id, date, rounds, draws:[chapitres...], bookId, bookTitle, abandoned? } */
const $ = id => document.getElementById(id);
const cfg = Store.config();
const wheels = {};
const state = { busy: false, last: null }; // last = défi terminé durant cette visite

const total = s => s.draws.reduce((a, b) => a + b, 0);
const isOver = s => s.abandoned || s.endedEarly || s.draws.length >= s.rounds;
function activeChallenge() { return Store.spins().find(s => !isOver(s)); }
function saveChallenge(c) {
  const all = Store.spins(); const i = all.findIndex(s => s.id === c.id);
  if (i >= 0) all[i] = c; else all.unshift(c);
  Store.set(KEYS.spins, all);
}

function init() {
  $('ptr1').innerHTML = pointerSVG(); $('ptr2').innerHTML = pointerSVG();
  wheels.rounds = new Wheel($('wheelRounds'), cfg.rounds);
  wheels.chapters = new Wheel($('wheelChapters'), cfg.chapters);
  $('cfgRounds').value = cfg.rounds.join(', ');
  $('cfgChapters').value = cfg.chapters.join(', ');
  fillBooks();

  $('spinRounds').onclick = spinRounds;
  $('spinChapters').onclick = spinChapters;
  $('abandon').onclick = () => {
    const a = activeChallenge(); if (!a) return;
    if (!confirm('Abandonner ce défi ? Les chapitres déjà tirés restent comptés dans les statistiques.')) return;
    if (a.draws.length === 0) Store.set(KEYS.spins, Store.spins().filter(s => s.id !== a.id));
    else saveChallenge({ ...a, abandoned: true });
    state.last = null; render();
  };
  $('finishBook').onclick = () => {
    const a = activeChallenge(); if (!a) return;
    const book = a.bookId ? Store.books().find(b => b.id === a.bookId) : null;
    const left = plural(a.rounds - a.draws.length, 'round restant', 'rounds restants');
    const msg = book
      ? `Tu as terminé « ${book.title} » ? Les ${left} seront annulés et le livre sera marqué comme lu dans ta bibliothèque.`
      : `Terminer ce défi maintenant ? Les ${left} seront annulés.`;
    if (!confirm(msg)) return;
    const c = { ...a, endedEarly: true };
    saveChallenge(c);
    if (book) {
      const today = new Date().toISOString().slice(0, 10);
      Store.set(KEYS.books, Store.books().map(b => b.id === book.id
        ? { ...b, status: 'lu', finished: b.finished || today, updated: new Date().toISOString() } : b));
      fillBooks();
    }
    state.last = c; render(); petalRain(30);
    toast(book ? 'Livre ajouté aux livres lus 📚' : 'Défi terminé 🌷');
  };
  $('saveCfg').onclick = saveConfig;
  $('resetCfg').onclick = () => {
    Store.set(KEYS.config, DEFAULT_CONFIG);
    applyConfig(DEFAULT_CONFIG); toast('Valeurs par défaut rétablies 🌿');
  };
  $('clearHist').onclick = () => {
    if (!Store.spins().length) return;
    if (confirm("Effacer tout l'historique des défis ?")) { Store.set(KEYS.spins, []); state.last = null; render(); }
  };
  render();
}

function fillBooks() {
  const books = Store.books().filter(b => b.status !== 'lu');
  const last = Store.get('rdl_lastBook', '');
  $('bookSelect').innerHTML = '<option value="">— Aucun livre en particulier —</option>' +
    books.map(b => `<option value="${esc(b.id)}" ${b.id === last ? 'selected' : ''}>${esc(b.title)}${b.author ? ' – ' + esc(b.author) : ''}</option>`).join('');
  $('bookSelect').onchange = () => Store.set('rdl_lastBook', $('bookSelect').value);
}

function pop(el, value) {
  el.textContent = value; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
}

/* ---------- affichage ---------- */
function render() {
  const a = activeChallenge();
  $('spinRounds').disabled = state.busy || !!a;
  $('spinChapters').disabled = state.busy || !a;
  $('bookPick').hidden = !!a;
  $('hintRounds').textContent = a ? 'Termine ton défi en cours pour retirer des rounds.' : '';
  $('hintChapters').textContent = a ? '' : 'Tire d’abord le nombre de rounds.';

  const shown = a || state.last;
  $('resRounds').textContent = shown ? shown.rounds : '—';
  $('resChapters').textContent = shown && shown.draws.length ? shown.draws[shown.draws.length - 1] : '—';

  const banner = $('banner');
  if (a) {
    const k = a.draws.length, left = a.rounds - k;
    $('bannerTitle').textContent = 'Défi en cours';
    $('bannerText').textContent = plural(a.rounds, 'round', 'rounds');
    $('bannerProgress').innerHTML = `Round <b>${k + 1}</b> sur ${a.rounds}` +
      (k ? ` · ${plural(left, 'round restant', 'rounds restants')}` : '');
    $('bannerDraws').innerHTML = a.draws.map((n, i) => `<span class="chip g">Round ${i + 1} : ${plural(n, 'chapitre', 'chapitres')}</span>`).join('');
    $('bannerHint').textContent = k === 0
      ? 'Tourne la roue des chapitres pour ton premier round.'
      : `Lis tes ${plural(a.draws[k - 1], 'chapitre', 'chapitres')}, puis reviens tourner la roue des chapitres pour le round ${k + 1} 🌷`;
    $('bannerBook').textContent = a.bookTitle ? `dans « ${a.bookTitle} »` : '';
    $('abandon').hidden = false;
    $('finishBook').hidden = false;
    banner.classList.add('show');
  } else if (state.last) {
    const c = state.last;
    const early = !!c.endedEarly && c.draws.length < c.rounds;
    $('bannerTitle').textContent = early ? 'Livre terminé 🎉' : 'Défi terminé 🎉';
    $('bannerText').textContent = `${plural(total(c), 'chapitre', 'chapitres')} en ${plural(c.draws.length, 'round', 'rounds')}`;
    $('bannerProgress').textContent = c.draws.length ? c.draws.join(' + ') + ' = ' + total(c) : '';
    $('bannerDraws').innerHTML = '';
    $('bannerHint').textContent = early
      ? `Les ${plural(c.rounds - c.draws.length, 'round restant', 'rounds restants')} sont annulés. Tu peux retirer un nouveau nombre de rounds.`
      : 'Bravo ! Tu peux retirer un nouveau nombre de rounds.';
    $('bannerBook').textContent = c.bookTitle ? `dans « ${c.bookTitle} »` : '';
    $('abandon').hidden = true;
    $('finishBook').hidden = true;
    banner.classList.add('show');
  } else {
    banner.classList.remove('show');
  }
  renderHistory();
}

function renderHistory() {
  const list = Store.spins().slice(0, 15);
  $('history').innerHTML = list.length ? list.map(s => {
    const done = s.draws.length >= s.rounds;
    const status = s.abandoned ? 'abandonné' : s.endedEarly ? `livre terminé (${s.draws.length}/${s.rounds} rounds)` : `en cours (${s.draws.length}/${s.rounds})`;
    return `<li class="hist-item">
      <span class="chip">${plural(s.rounds, 'round', 'rounds')}</span>
      ${s.draws.length ? `<span class="chip g">${s.draws.join(' + ')}${s.draws.length > 1 ? ' = ' + total(s) : ''} ch.</span>` : ''}
      ${done ? '' : `<span class="muted">${status}</span>`}
      ${s.bookTitle ? `<span>📖 ${esc(s.bookTitle)}</span>` : ''}
      <span class="when">${fmtDate(s.date)}</span>
      <button class="x" title="Supprimer" data-del="${esc(s.id)}">✕</button>
    </li>`;
  }).join('') : '<li class="empty">Aucun défi pour l’instant… tourne la roue des rounds ! 🌸</li>';
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    if (!confirm('Supprimer ce défi de l’historique ?')) return;
    Store.set(KEYS.spins, Store.spins().filter(s => s.id !== b.dataset.del)); state.last = null; render();
  });
}

/* ---------- actions ---------- */
async function spinRounds() {
  if (state.busy || activeChallenge()) return;
  state.busy = true; state.last = null; render();
  const book = Store.books().find(b => b.id === $('bookSelect').value);
  const v = await wheels.rounds.spin(val => saveChallenge({
    id: uid(), date: new Date().toISOString(), rounds: Number(val), draws: [],
    bookId: book ? book.id : '', bookTitle: book ? book.title : '' }));
  state.busy = false; pop($('resRounds'), v); render(); petalRain(12);
}

async function spinChapters() {
  const a = activeChallenge();
  if (state.busy || !a) return;
  state.busy = true; render();
  let c = a;
  const v = await wheels.chapters.spin(val => {
    c = { ...(Store.spins().find(s => s.id === a.id) || a) };
    c.draws = [...c.draws, Number(val)];
    saveChallenge(c);
  });
  state.busy = false;
  if (c.draws.length >= c.rounds) state.last = c;
  render(); pop($('resChapters'), v); petalRain(c.draws.length >= c.rounds ? 30 : 12);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- réglages ---------- */
function parseList(text) {
  const nums = text.split(/[,;\s]+/).filter(Boolean).map(Number);
  if (nums.length < 2 || nums.length > 16 || nums.some(n => !Number.isFinite(n) || n < 0 || n > 999)) return null;
  return nums;
}
function applyConfig(c) {
  wheels.rounds.setValues(c.rounds); wheels.chapters.setValues(c.chapters);
  $('cfgRounds').value = c.rounds.join(', '); $('cfgChapters').value = c.chapters.join(', ');
}
function saveConfig() {
  const r = parseList($('cfgRounds').value), c = parseList($('cfgChapters').value);
  if (!r || !c) { toast('Entre 2 et 16 nombres séparés par des virgules 🌿'); return; }
  const next = { rounds: r, chapters: c };
  Store.set(KEYS.config, next); applyConfig(next); toast('Roues mises à jour 🌸');
}

document.addEventListener('DOMContentLoaded', () => {
  init();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { wheels.rounds.draw(); wheels.chapters.draw(); });
});
