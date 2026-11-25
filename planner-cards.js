/* Card navigation is presentation state; plant data and scoring stay in planner.js. */
(function () {
  const entries = document.getElementById('entries');
  const panel = document.createElement('div');
  panel.className = 'card-panel';
  entries.before(panel);
  const toolbar = document.createElement('div');
  toolbar.className = 'card-toolbar';
  toolbar.innerHTML = '<div class="view-switch" role="group" aria-label="Visningsläge"><button type="button" data-view="gallery">Galleri</button><button type="button" data-view="deck">Kortlek</button></div><div class="gallery-zoom"><button type="button" id="zoomOut" aria-label="Zooma ut korten">−</button><label>Kortstorlek <input id="cardZoom" type="range" min="70" max="140" step="10" value="100"></label><output id="zoomValue">100 %</output><button type="button" id="zoomIn" aria-label="Zooma in korten">+</button></div><div class="deck-nav" hidden><button type="button" id="previousCard" aria-label="Föregående kort">←</button><span id="cardPosition" aria-live="polite"></span><button type="button" id="nextCard" aria-label="Nästa kort">→</button></div>';
  panel.append(toolbar, entries);
  let mode = 'gallery', index = 0, zoom = 100;
  try {
    const saved = JSON.parse(localStorage.getItem('vaxtval-card-view'));
    if(saved?.mode === 'deck') mode = 'deck';
    if(Number.isFinite(saved?.zoom)) zoom = Math.max(70, Math.min(140, saved.zoom));
  } catch {}
  const get = id => document.getElementById(id);
  function refresh() {
    const cards = [...entries.querySelectorAll('.selection-card')];
    index = Math.max(0, Math.min(index, cards.length - 1));
    entries.dataset.view = mode;
    entries.style.setProperty('--card-width', (320 * zoom / 100) + 'px');
    entries.style.setProperty('--card-zoom', zoom / 100);
    cards.forEach((card, i) => { card.hidden = mode === 'deck' && i !== index; });
    toolbar.hidden = !cards.length;
    toolbar.querySelector('.gallery-zoom').hidden = mode !== 'gallery';
    toolbar.querySelector('.deck-nav').hidden = mode !== 'deck';
    toolbar.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === mode)));
    get('cardPosition').textContent = cards.length ? `${index + 1} av ${cards.length}` : '0 kort';
    get('previousCard').disabled = cards.length < 2;
    get('nextCard').disabled = cards.length < 2;
    get('zoomOut').disabled = zoom <= 70;
    get('zoomIn').disabled = zoom >= 140;
    get('cardZoom').value = zoom;
    get('zoomValue').textContent = zoom + ' %';
    try { localStorage.setItem('vaxtval-card-view', JSON.stringify({mode, zoom})); } catch {}
  }
  function move(delta) {
    const count = entries.querySelectorAll('.selection-card').length;
    if(count) index = (index + delta + count) % count;
    refresh();
  }
  toolbar.querySelectorAll('[data-view]').forEach(button => button.onclick = () => {mode = button.dataset.view; refresh();});
  get('previousCard').onclick = () => move(-1);
  get('nextCard').onclick = () => move(1);
  get('cardZoom').oninput = event => {zoom = Number(event.target.value); refresh();};
  get('zoomOut').onclick = () => {zoom = Math.max(70, zoom - 10); refresh();};
  get('zoomIn').onclick = () => {zoom = Math.min(140, zoom + 10); refresh();};
  panel.addEventListener('keydown', event => {
    if(mode !== 'deck' || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
    if(event.key === 'ArrowLeft' || event.key === 'ArrowRight') {event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1);}
  });
  globalThis.PlannerCards = {refresh};
  refresh();
})();
