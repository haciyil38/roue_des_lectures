/* Page "Bibliothèque" */
const $ = id => document.getElementById(id);
const COLORS = [
  '#f8c8dc', '#f2b5c6', '#e87fa0', '#c4577b', '#a8324f', '#e2574c',
  '#f2a65a', '#f7dc92', '#f4c430', '#d9e8a0', '#a9c3a1', '#6fa86f',
  '#4f6f52', '#2f5d50', '#7cc6c4', '#bfe0e6', '#6aa9d8', '#3f6fb5',
  '#2b3f7a', '#d9ccee', '#a98bd6', '#7a4fa3', '#8b5e3c', '#3d3238',
];
/** Accepte "#abc", "abc", "#aabbcc"… et renvoie "#aabbcc" (minuscules) ou null. */
function parseHex(v) {
  let h = String(v || '').trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(h)) h = h.split('').map(c => c + c).join('');
  return /^[0-9a-f]{6}$/.test(h) ? '#' + h : null;
}
const safeColor = c => parseHex(c) || COLORS[0];
const STATUS = { lu: 'Lu', encours: 'En cours', alire: 'À lire' };
let filter = 'all', editing = null, rating = 0, color = COLORS[0];

function chaptersFor(book) {
  return Store.spins().filter(s => s.bookId === book.id).reduce((t, s) => t + (s.draws || []).reduce((a, b) => a + b, 0), 0);
}

function render() {
  const q = $('search').value.trim().toLowerCase();
  const books = Store.books()
    .filter(b => filter === 'all' || b.status === filter)
    .filter(b => !q || (b.title + ' ' + b.author).toLowerCase().includes(q))
    .sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));

  if (!books.length) {
    $('shelf').innerHTML = `<div class="empty">${Store.books().length ? 'Aucun livre ne correspond 🌿' : 'Ta bibliothèque est vide… ajoute ton premier livre ! 📖'}</div>`;
    return;
  }
  // étagères de 4 livres + planche de bois
  const html = [];
  const grid = `<div class="shelf">`;
  html.push(grid + books.map(card).join('') + '</div><div class="plank"></div>');
  $('shelf').innerHTML = html.join('');
  document.querySelectorAll('.book').forEach(el => el.onclick = () => openDialog(el.dataset.id));
}

function card(b) {
  const ch = chaptersFor(b);
  return `<article class="book" data-id="${esc(b.id)}" style="--c:${safeColor(b.color)}">
    <span class="ribbon ${esc(b.status)}">${STATUS[b.status] || ''}</span>
    <h3>${esc(b.title)}</h3>
    <div class="au">${esc(b.author || 'Auteur inconnu')}</div>
    ${b.rating ? `<div class="stars">${'★'.repeat(b.rating)}<span style="color:#ddd">${'★'.repeat(5 - b.rating)}</span></div>` : ''}
    ${b.notes ? `<div class="note">« ${esc(b.notes)} »</div>` : ''}
    <div class="meta">
      ${b.finished ? `<span>✓ Terminé le ${fmtDate(b.finished)}</span>` : ''}
      ${ch ? `<span>🌸 ${plural(ch, 'chapitre tiré', 'chapitres tirés')}</span>` : ''}
    </div></article>`;
}

function drawStars() {
  $('stars').innerHTML = [1, 2, 3, 4, 5].map(i =>
    `<button type="button" class="${i <= rating ? 'on' : ''}" data-r="${i}" aria-label="${i} étoiles">★</button>`).join('');
  $('stars').querySelectorAll('button').forEach(b => b.onclick = () => {
    rating = rating === Number(b.dataset.r) ? 0 : Number(b.dataset.r); drawStars();
  });
}
function drawSwatches() {
  $('swatches').innerHTML = COLORS.map(c =>
    `<button type="button" class="sw" style="background:${c}" data-c="${c}" title="${c}" aria-label="couleur ${c}"></button>`).join('');
  $('swatches').querySelectorAll('button').forEach(b => b.onclick = () => setColor(b.dataset.c));
}
/** Met à jour la couleur choisie partout (pastilles, sélecteur, code hexa, aperçu). */
function setColor(c, keepHexField) {
  color = safeColor(c);
  $('swatches').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.c === color));
  $('fColor').value = color;
  if (!keepHexField) { $('fHex').value = color; $('fHex').classList.remove('bad'); }
  $('spine').style.background = color;
}

function openDialog(id) {
  const b = id ? Store.books().find(x => x.id === id) : null;
  editing = b ? b.id : null;
  $('dlgTitle').textContent = b ? 'Modifier le livre' : 'Ajouter un livre';
  $('fTitle').value = b?.title || ''; $('fAuthor').value = b?.author || '';
  $('fStatus').value = b?.status || 'alire'; $('fDate').value = b?.finished || '';
  $('fNotes').value = b?.notes || '';
  rating = b?.rating || 0; color = safeColor(b?.color || COLORS[Math.floor(Math.random() * COLORS.length)]);
  $('delBtn').hidden = !b;
  drawStars(); drawSwatches(); setColor(color);
  $('dlg').showModal();
}

function save(e) {
  e.preventDefault();
  const title = $('fTitle').value.trim();
  if (!title) return;
  const status = $('fStatus').value;
  let finished = $('fDate').value;
  if (status === 'lu' && !finished) finished = new Date().toISOString().slice(0, 10);
  if (status !== 'lu') finished = '';
  const data = { title, author: $('fAuthor').value.trim(), status, finished, rating, color, notes: $('fNotes').value.trim(), updated: new Date().toISOString() };
  const books = Store.books();
  if (editing) { const i = books.findIndex(b => b.id === editing); books[i] = { ...books[i], ...data }; }
  else books.push({ id: uid(), ...data });
  Store.set(KEYS.books, books);
  $('dlg').close(); render(); toast(editing ? 'Livre modifié 🌷' : 'Livre ajouté à ta bibliothèque 📚');
}

function init() {
  $('addBtn').onclick = () => openDialog(null);
  $('cancelBtn').onclick = () => $('dlg').close();
  $('form').addEventListener('submit', save);
  $('delBtn').onclick = () => {
    if (!confirm('Supprimer ce livre de ta bibliothèque ?')) return;
    Store.set(KEYS.books, Store.books().filter(b => b.id !== editing));
    $('dlg').close(); render();
  };
  $('fColor').oninput = () => setColor($('fColor').value);
  $('fHex').oninput = () => {
    const h = parseHex($('fHex').value);
    $('fHex').classList.toggle('bad', !h);
    if (h) setColor(h, true);
  };
  $('fHex').onblur = () => setColor(color); // remet un code propre si la saisie était incomplète
  $('search').oninput = render;
  $('tabs').querySelectorAll('.tab').forEach(t => t.onclick = () => {
    filter = t.dataset.f;
    $('tabs').querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t));
    render();
  });

  $('exportBtn').onclick = () => {
    const data = { version: 1, exported: new Date().toISOString(), spins: Store.spins(), books: Store.books(), config: Store.config() };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'roue-des-lectures-sauvegarde.json'; a.click(); URL.revokeObjectURL(a.href);
  };
  $('importBtn').onclick = () => $('importFile').click();
  $('importFile').onchange = async () => {
    const f = $('importFile').files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!Array.isArray(d.books) || !Array.isArray(d.spins)) throw new Error('format');
      if (!confirm('Remplacer les données actuelles par cette sauvegarde ?')) return;
      Store.set(KEYS.books, d.books); Store.set(KEYS.spins, d.spins);
      if (d.config) Store.set(KEYS.config, d.config);
      render(); toast('Sauvegarde importée 🌸');
    } catch (e) { toast("Ce fichier n'est pas une sauvegarde valide"); }
    $('importFile').value = '';
  };
  render();
}
document.addEventListener('DOMContentLoaded', init);
