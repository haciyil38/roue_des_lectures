/* Page "Statistiques" */
const $ = id => document.getElementById(id);

function sum(a) { return a.reduce((x, y) => x + y, 0); }
function avg(a) { return a.length ? sum(a) / a.length : 0; }
function fmt(n) { return (Math.round(n * 10) / 10).toString().replace('.', ','); }

function bars(el, entries, cls) {
  if (!entries.length) { el.innerHTML = '<div class="empty">Pas encore de données 🌱</div>'; return; }
  const max = Math.max(1, ...entries.map(e => e.count));
  el.innerHTML = entries.map(e => `
    <div class="bar-row ${cls}"><span class="l">${esc(e.label)}</span>
      <div class="track"><div class="fill" data-w="${(e.count / max) * 100}"></div></div>
      <span class="c">${e.count}</span></div>`).join('');
  requestAnimationFrame(() => setTimeout(() =>
    el.querySelectorAll('.fill').forEach(f => f.style.width = f.dataset.w + '%'), 30));
}

function frequency(values, drawn) {
  const counts = new Map();
  values.forEach(v => counts.set(v, 0));
  drawn.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
  return [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([label, count]) => ({ label, count }));
}

function render() {
  const spins = Store.spins(), books = Store.books(), cfg = Store.config();
  const rounds = spins.map(s => s.rounds), chapters = spins.flatMap(s => s.draws || []);
  const readBooks = books.filter(b => b.status === 'lu');

  const kpis = [
    ['Défis lancés', spins.length, 0],
    ['Rounds tirés au total', sum(rounds), 1],
    ['Chapitres à lire au total', sum(chapters), 2],
    ['Moyenne de rounds par défi', fmt(avg(rounds)), 3],
    ['Moyenne de chapitres par tirage', fmt(avg(chapters)), 4],
    ['Livres terminés', readBooks.length, 5],
  ];
  $('kpis').innerHTML = kpis.map(([lab, num, i]) => `
    <div class="card kpi"><div class="ic">${flowerSVG(6, FLOWER_COLORS[i][0], FLOWER_COLORS[i][1], 34)}</div>
    <div class="num">${num}</div><div class="lab">${lab}</div></div>`).join('');

  bars($('chartRounds'), frequency(cfg.rounds, rounds), '');
  bars($('chartChapters'), frequency(cfg.chapters, chapters), 'g');

  // 14 derniers jours
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    days.push({ key: d.toDateString(), label: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' }), count: 0 });
  }
  spins.forEach(s => { const k = new Date(s.date).toDateString(); const d = days.find(x => x.key === k); if (d) d.count++; });
  const max = Math.max(1, ...days.map(d => d.count));
  $('timeline').innerHTML = days.map(d => `
    <div class="col"><span class="n">${d.count || ''}</span>
    <div class="b" style="height:${(d.count / max) * 100 * 0.78}%"></div><span class="d">${d.label}</span></div>`).join('');

  // chapitres par livre
  const perBook = new Map();
  spins.forEach(s => { if (s.bookTitle) perBook.set(s.bookTitle, (perBook.get(s.bookTitle) || 0) + sum(s.draws || [])); });
  const entries = [...perBook.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, count]) => ({ label, count }));
  bars($('chartBooks'), entries, '');
  document.querySelectorAll('#chartBooks .bar-row').forEach(r => r.style.gridTemplateColumns = '120px 1fr 44px');
}
document.addEventListener('DOMContentLoaded', render);
