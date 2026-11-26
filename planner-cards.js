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
  const stage = document.createElement('div');
  stage.className = 'card-stage';
  panel.append(stage);
  stage.append(toolbar.querySelector('.deck-nav'), entries);
  const desktop = window.matchMedia('(min-width: 761px)');
  let mode = 'gallery', index = 0, zoom = desktop.matches ? 60 : 100;
  try {
    const saved = JSON.parse(localStorage.getItem('vaxtval-card-view'));
    if(saved?.mode === 'deck') mode = 'deck';
    if(saved?.version === 2 && Number.isFinite(saved?.zoom)) zoom = Math.max(50, Math.min(140, saved.zoom));
  } catch {}
  const get = id => document.getElementById(id);
  function refresh() {
    const cards = [...entries.querySelectorAll('.selection-card')];
    index = Math.max(0, Math.min(index, cards.length - 1));
    entries.dataset.view = mode;
    stage.dataset.view = mode;
    const available = Math.max(1, panel.clientWidth - (mode === 'deck' && desktop.matches ? 120 : 32));
    const baseWidth = desktop.matches ? (mode === 'deck' ? 680 : 480) : available;
    const scale = Math.min(mode === 'deck' ? (desktop.matches ? .5 : 1) : zoom / 100, available / baseWidth);
    entries.style.setProperty('--card-width', (baseWidth * scale) + 'px');
    cards.forEach((card, i) => {
      card.hidden = mode === 'deck' && i !== index;
      card.style.width = baseWidth + 'px';
      card.style.zoom = scale;
    });
    toolbar.hidden = !cards.length;
    toolbar.querySelector('.gallery-zoom').hidden = mode !== 'gallery';
    stage.querySelector('.deck-nav').hidden = mode !== 'deck';
    toolbar.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === mode)));
    get('cardPosition').textContent = cards.length ? `${index + 1} av ${cards.length}` : '0 kort';
    get('previousCard').disabled = cards.length < 2;
    get('nextCard').disabled = cards.length < 2;
    get('zoomOut').disabled = zoom <= 50;
    get('zoomIn').disabled = zoom >= 140;
    get('cardZoom').value = zoom;
    get('zoomValue').textContent = zoom + ' %';
    try { localStorage.setItem('vaxtval-card-view', JSON.stringify({mode, zoom, version:2})); } catch {}
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
  get('cardZoom').min = 50;
  get('cardZoom').step = 5;
  get('zoomOut').onclick = () => {zoom = Math.max(50, zoom - 5); refresh();};
  get('zoomIn').onclick = () => {zoom = Math.min(140, zoom + 5); refresh();};
  panel.addEventListener('keydown', event => {
    if(mode !== 'deck' || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
    if(event.key === 'ArrowLeft' || event.key === 'ArrowRight') {event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1);}
  });
  globalThis.PlannerCards = {refresh};
  let lastWidth = 0;
  new ResizeObserver(() => {
    if(panel.clientWidth !== lastWidth){ lastWidth = panel.clientWidth; refresh(); }
  }).observe(panel);
  desktop.addEventListener('change', refresh);
  refresh();
})();
