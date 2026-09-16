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
})();
