/* Roue personnalisable (sport, activités) : liste d'idées modifiable + historique.
   Stockage : { items:[texte...], history:[{id,date,label,done}] } sous KEYS[storeKey]. */
function initCustomWheel(opts) {
  const $ = id => document.getElementById(id);
  const key = KEYS[opts.storeKey];
  const MIN = 2, MAX = 30;
  const load = () => {
    const d = Store.get(key, {});
    return {
      items: Array.isArray(d.items) && d.items.length >= MIN ? d.items : [...opts.defaults],
      history: Array.isArray(d.history) ? d.history : [],
    };
  };
  const save = () => Store.set(key, data);
  let data = load();
  let busy = false, current = null; // current = entrée d'historique du dernier tirage

  $('ptr').innerHTML = pointerSVG();
  const wheel = new Wheel($('wheel'), data.items);

  function render() {
    wheel.setValues(data.items);
    $('spin').disabled = busy;
    $('items').innerHTML = data.items.map((t, i) =>
      `<li>${esc(t)}<button class="x" title="Retirer" data-i="${i}">✕</button></li>`).join('');
    $('items').querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      if (data.items.length <= MIN) { toast(`Il faut au moins ${MIN} idées 🌿`); return; }
      data.items.splice(Number(b.dataset.i), 1); save(); render();
    });
    const b = $('banner');
    if (current) { $('bannerText').textContent = current.label; b.classList.add('show'); $('markDone').hidden = current.done; }
    else b.classList.remove('show');
    const list = data.history.slice(0, 15);
    $('history').innerHTML = list.length ? list.map(h => `<li class="hist-item ${h.done ? 'done' : ''}">
        <span class="lbl">${esc(h.label)}</span>
        <button class="chk" data-done="${esc(h.id)}">${h.done ? '✅ Fait' : 'Pas encore fait'}</button>
        <span class="when">${fmtDate(h.date)}</span>
        <button class="x" title="Supprimer" data-del="${esc(h.id)}">✕</button></li>`).join('')
      : `<li class="empty">${opts.empty}</li>`;
    document.querySelectorAll('[data-done]').forEach(b => b.onclick = () => {
      const h = data.history.find(x => x.id === b.dataset.done); if (!h) return;
      h.done = !h.done; save(); render();
    });
    document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      data.history = data.history.filter(x => x.id !== b.dataset.del);
      if (current && current.id === b.dataset.del) current = null;
      save(); render();
    });
  }

  $('spin').onclick = async () => {
    if (busy) return;
    busy = true; current = null; $('spin').disabled = true;
    const v = await wheel.spin(val => {
      current = { id: uid(), date: new Date().toISOString(), label: String(val), done: false };
      data.history.unshift(current); save();
    });
    busy = false;
    const r = $('res'); r.textContent = v; r.classList.remove('pop'); void r.offsetWidth; r.classList.add('pop');
    render(); petalRain(16);
  };
  $('markDone').onclick = () => { if (!current) return; current.done = true; save(); render(); petalRain(24); toast('Bravo ! 🌷'); };
  $('skip').onclick = () => { // annule le tirage non réalisé et en refait un
    if (current && !current.done) { data.history = data.history.filter(x => x.id !== current.id); save(); }
    current = null; render(); $('spin').click();
  };
  $('addForm').onsubmit = e => {
    e.preventDefault();
    const t = $('newItem').value.trim(); if (!t) return;
    if (data.items.length >= MAX) { toast(`Maximum ${MAX} idées 🌿`); return; }
    data.items.push(t); save(); $('newItem').value = ''; render(); toast('Idée ajoutée 🌸');
  };
  $('resetItems').onclick = () => {
    if (!confirm('Revenir aux idées par défaut ?')) return;
    data.items = [...opts.defaults]; save(); render();
  };
  $('clearHist').onclick = () => {
    if (!data.history.length || !confirm("Effacer tout l'historique ?")) return;
    data.history = []; current = null; save(); render();
  };
  render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => wheel.draw());
}
