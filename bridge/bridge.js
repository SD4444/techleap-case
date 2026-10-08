(() => {
  'use strict';
  const $$ = s => [...document.querySelectorAll(s)];
  document.documentElement.classList.add('js');

  // Mobile menu
  const btn = document.getElementById('menuBtn'), nav = document.getElementById('nav');
  btn?.addEventListener('click', () => { const open = !nav.classList.contains('open'); nav.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); });
  nav?.addEventListener('click', e => { if (e.target.closest('a')) { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });

  // Switchers: [data-switch="x"] button[data-val] shows [data-panel="x"][data-val]
  $$('[data-switch]').forEach(group => {
    const name = group.dataset.switch;
    group.querySelectorAll('button[data-val]').forEach(b => b.addEventListener('click', () => {
      group.querySelectorAll('button[data-val]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      $$(`[data-panel="${name}"]`).forEach(p => { p.hidden = p.dataset.val !== b.dataset.val; });
    }));
  });

  // Reveal on scroll
  const items = $$('section .head, section .cards, section .numbered, section .steps, section .step-panel, section .sector-tabs, section .sector-panel, .legend-row');
  items.forEach(el => el.classList.add('reveal'));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }), { threshold: .08 });
    items.forEach(el => io.observe(el));
  } else items.forEach(el => el.classList.add('visible'));

  // Active nav link
  const secs = $$('main>section');
  const onScroll = () => { let cur = secs[0]; secs.forEach(s => { if (s.getBoundingClientRect().top <= innerHeight * .35) cur = s; }); $$('#nav a').forEach(a => a.classList.toggle('active', a.hash === '#' + cur.id)); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
})();
