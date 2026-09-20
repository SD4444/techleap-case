/* Deck navigation: one slide per screen, arrow keys, counter, fullscreen. */
(() => {
  'use strict';
  const slides = [...document.querySelectorAll('.slide')];
  const count = document.getElementById('deck-count');
  const bar = document.querySelector('.deck-bar');
  let current = 0, frame = 0;
  const pad = n => String(n).padStart(2, '0');
  function update() {
    frame = 0;
    slides.forEach((s, i) => { if (s.getBoundingClientRect().top <= innerHeight * .5) current = i; });
    count.textContent = pad(current + 1) + ' / ' + pad(slides.length);
    document.body.classList.toggle('dark-bar', slides[current].classList.contains('dark'));
    history.replaceState(null, '', '#' + slides[current].id);
  }
  const go = d => { current = Math.max(0, Math.min(slides.length - 1, current + d)); slides[current].scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(update); }, { passive: true });
  addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]')) return;
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(1); }
    if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1); }
    if (e.key === 'Home') { e.preventDefault(); go(-current); }
    if (e.key === 'End') { e.preventDefault(); go(slides.length - 1 - current); }
  });
  document.getElementById('deck-prev').addEventListener('click', () => go(-1));
  document.getElementById('deck-next').addEventListener('click', () => go(1));
  document.getElementById('deck-full').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
  });
  const start = slides.findIndex(s => '#' + s.id === location.hash);
  if (start > 0) { current = start; slides[start].scrollIntoView({ behavior: 'instant', block: 'start' }); }
  update();
  if (bar) bar.hidden = false;

  /* Fit: scale a slide's content down when it is taller than the screen. */
  let fitFrame = 0;
  function fit() {
    fitFrame = 0; if (innerWidth <= 900) return;
    slides.forEach(s => {
      const c = s.querySelector('.slide-in'); c.style.transform = ''; c.style.marginBottom = '';
      const cs = getComputedStyle(s), avail = s.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const h = c.offsetHeight; if (h > avail) { const k = avail / h; c.style.transform = `scale(${k})`; c.style.marginBottom = -(h - avail) + 'px'; }
    });
  }
  const queueFit = () => { if (!fitFrame) fitFrame = requestAnimationFrame(fit); };
  addEventListener('resize', queueFit); addEventListener('load', queueFit); document.fonts.ready.then(queueFit); queueFit(); setTimeout(queueFit, 600);
  new ResizeObserver(queueFit).observe(document.documentElement); slides.forEach(s => new ResizeObserver(queueFit).observe(s.querySelector('.slide-in')));

  /* Deep-dive sheet: [data-dd] opens <template id="dd-…"> loaded from deepdives.html */
  const sheet = document.getElementById('sheet'), K = document.getElementById('sheetK'), H = document.getElementById('sheetH'), B = document.getElementById('sheetB');
  let opener = null;
  function openSheet(id, src) {
    const t = document.getElementById('dd-' + id); if (!t) return;
    opener = src || null; K.textContent = t.dataset.k || ''; H.textContent = t.dataset.h || '';
    B.replaceChildren(t.content.cloneNode(true));
    B.querySelectorAll('table').forEach(table => { const sc = document.createElement('div'); sc.className = 'table-scroll'; sc.tabIndex = 0; table.before(sc); sc.append(table); });
    sheet.showModal(); const sin = sheet.querySelector('.sheet-in'); sin.scrollTop = 0; sin.focus({ preventScroll: true });
  }
  document.addEventListener('click', e => { const t = e.target.closest('[data-dd]'); if (t) { e.preventDefault(); openSheet(t.dataset.dd, t); } });
  document.getElementById('sheetX').addEventListener('click', () => sheet.close());
  sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); });
  sheet.addEventListener('close', () => opener?.focus());
  fetch('deepdives.html', { cache: 'no-cache' }).then(r => r.text()).then(html => { const t = document.createElement('template'); t.innerHTML = html; document.body.append(t.content); }).catch(() => {});
})();
