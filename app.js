/* Techleap case — generic page machinery.
   Ported from the Tarnoc funding site framework (script.js + enhancements.js),
   stripped of Tarnoc content and null-guarded so sections can be added or
   removed freely. Content-specific wiring (scenario models, calculators)
   lives at the bottom under "CASE WIRING". */
(() => {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pulse = el => { if (motion.matches || !el) return; el.classList.remove('state-enter'); void el.offsetWidth; el.classList.add('state-enter'); };
  const press = (attr, value) => $$(`[data-${attr}]`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset[attr] === value)));
  const bind = (attr, fn) => $$(`[data-${attr}]`).forEach(b => b.addEventListener('click', () => { press(attr, b.dataset[attr]); fn(b.dataset[attr]); }));
  window.CaseUI = { $, $$, pulse, press, bind }; // exposed for case wiring

  /* ── Mobile menu ─────────────────────────────────────────────── */
  const compactNav = matchMedia('(max-width:1200px)'), menu = $('#menu-toggle'), nav = $('#main-nav');
  const headerActions = [$('#present')].filter(Boolean);
  function closeMenu() { if (!menu) return; menu.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); }
  function arrangeNav() { closeMenu(); const home = compactNav.matches ? $('.mobile-nav-actions') : $('.header-tools'); if (home) headerActions.forEach(b => home.append(b)); }
  if (menu && nav) {
    menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); });
    nav.addEventListener('click', e => { if (e.target.closest('a,button')) closeMenu(); });
    document.addEventListener('click', e => { if (!e.target.closest('header')) closeMenu(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); } });
    nav.addEventListener('focusout', () => { requestAnimationFrame(() => { if (!document.activeElement.closest('header')) closeMenu(); }); });
    compactNav.addEventListener('change', arrangeNav); arrangeNav();
  }

  /* ── Present mode: an isolated viewport, not a scroll position ── */
  const sections = $$('main>section'), stage = $('main'), controls = $('.deck-controls');
  let current = 0, presenting = false, frame = 0, fitFrame = 0, returnY = 0, ownedFullscreen = false;
  const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  sections.forEach(s => { s.setAttribute('tabindex', '-1'); s.setAttribute('aria-label', s.dataset.title || s.id); });
  if (controls) { controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', 'Presentation navigation'); $('#slide-count')?.setAttribute('aria-live', 'polite'); }
  function updateControls() {
    if (!controls) return;
    $('#slide-count').textContent = String(current + 1).padStart(2, '0') + ' / ' + String(sections.length).padStart(2, '0');
    $('#slide-title').textContent = sections[current].dataset.title || '';
    $('#prev-slide').disabled = current === 0; $('#next-slide').disabled = current === sections.length - 1;
  }
  function fitSlide() {
    fitFrame = 0; if (!presenting) return;
    const slide = sections[current];
    stage.style.setProperty('--controls-height', Math.ceil(controls.getBoundingClientRect().height) + 'px');
    slide.style.transform = ''; slide.style.width = ''; slide.style.removeProperty('--slide-offset');
    if (slide.id === 'close') {
      const content = slide.querySelector('.wrap');
      slide.style.setProperty('--closing-scale', Math.min(stage.clientWidth / (content.offsetWidth + 40), Math.max(1, stage.clientHeight - 88) / content.offsetHeight));
      return;
    }
    if (innerWidth <= 800 || innerHeight <= 500) return;
    const height = slide.offsetHeight;
    const contentWidth = Math.max(...[...slide.children].filter(el => el.classList.contains('wrap')).map(el => el.offsetWidth), 1);
    const scale = Math.min(stage.clientWidth / (contentWidth + 64), stage.clientHeight / height);
    slide.style.transform = `scale(${scale})`;
    slide.style.setProperty('--slide-offset', Math.max(0, (stage.clientHeight - height * scale) / 2) + 'px');
  }
  function queueFit() { if (!fitFrame) fitFrame = requestAnimationFrame(fitSlide); }
  function showSlide() {
    sections.forEach((s, i) => { s.classList.toggle('is-slide', i === current); s.inert = i !== current; });
    stage.style.background = getComputedStyle(sections[current]).backgroundColor;
    sections[current].scrollTop = 0;
    sections[current].querySelectorAll('img[loading="lazy"]').forEach(img => img.loading = 'eager');
    updateControls(); fitSlide();
  }
  function setPresent(on) {
    if (on === presenting || !controls) return;
    if (on) { returnY = scrollY; closeMenu(); }
    presenting = on; document.body.classList.toggle('presenting', on); controls.hidden = !on;
    $('header').inert = on; const skip = $('.skip'); if (skip) skip.inert = on;
    $('#present')?.setAttribute('aria-pressed', String(on));
    if (on) {
      showSlide(); sections[current].focus({ preventScroll: true });
      const request = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
      if (request && !fullscreenElement()) {
        try { const r = request.call(document.documentElement); Promise.resolve(r).then(() => { ownedFullscreen = !!fullscreenElement(); if (!presenting && ownedFullscreen) leaveFullscreen(); queueFit(); }).catch(() => {}); } catch {}
      }
    } else {
      sections.forEach(s => { s.inert = false; s.classList.remove('is-slide'); s.style.transform = ''; s.style.removeProperty('--slide-offset'); });
      stage.style.background = ''; stage.style.removeProperty('--controls-height');
      if (ownedFullscreen) leaveFullscreen();
      window.dispatchEvent(new Event('presentationchange'));
      scrollTo({ top: returnY, behavior: 'instant' });
      requestAnimationFrame(() => { if (!presenting) scrollTo({ top: returnY, behavior: 'instant' }); });
      (compactNav.matches && menu ? menu : $('#present'))?.focus({ preventScroll: true }); updateScroll(); return;
    }
    window.dispatchEvent(new Event('presentationchange'));
  }
  function leaveFullscreen() { ownedFullscreen = false; const exit = document.exitFullscreen || document.webkitExitFullscreen; if (fullscreenElement() && exit) { try { Promise.resolve(exit.call(document)).catch(() => {}); } catch {} } }
  function fullscreenChanged() { if (!fullscreenElement() && ownedFullscreen) { ownedFullscreen = false; setPresent(false); } queueFit(); }
  document.addEventListener('fullscreenchange', fullscreenChanged); document.addEventListener('webkitfullscreenchange', fullscreenChanged);

  /* ── Scroll progress + active nav ────────────────────────────── */
  function updateScroll() {
    frame = 0; if (presenting) return;
    const y = scrollY, range = Math.max(1, document.documentElement.scrollHeight - innerHeight), p = Math.min(1, y / range);
    const readout = $('.temperature'); if (readout) readout.textContent = Math.round(p * 100) + '%';
    const bar = $('.progress'); if (bar) bar.style.transform = `scaleX(${p})`;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top <= innerHeight * .4) current = i; });
    updateControls();
    $$('header nav a').forEach(a => a.classList.toggle('active', a.hash === '#' + sections[current].id));
  }
  addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(updateScroll); }, { passive: true });
  addEventListener('resize', () => { if (presenting) queueFit(); else updateScroll(); });
  if (window.visualViewport) visualViewport.addEventListener('resize', queueFit);
  if (stage) { new ResizeObserver(queueFit).observe(stage); sections.forEach(s => new ResizeObserver(queueFit).observe(s)); }
  document.fonts.ready.then(queueFit);
  if (stage) { stage.addEventListener('load', queueFit, true); stage.addEventListener('toggle', queueFit, true); }
  updateScroll();
  const go = d => { current = Math.max(0, Math.min(sections.length - 1, current + d)); showSlide(); sections[current].focus({ preventScroll: true }); };
  $('#present')?.addEventListener('click', () => setPresent(!presenting));
  $('#exit-present')?.addEventListener('click', () => setPresent(false));
  $('#prev-slide')?.addEventListener('click', () => go(-1));
  $('#next-slide')?.addEventListener('click', () => go(1));
  stage?.addEventListener('click', e => { if (!presenting) return; const link = e.target.closest('a[href^="#"]'); if (!link) return; const i = sections.findIndex(s => '#' + s.id === link.hash); if (i >= 0) { e.preventDefault(); go(i - current); } });
  addEventListener('keydown', e => {
    if (!presenting || document.querySelector('dialog[open]')) return;
    if (e.key === 'Escape') { e.preventDefault(); setPresent(false); return; }
    if (e.target.closest('input,select,textarea,summary,[contenteditable=true]')) return;
    if (['ArrowRight', 'PageDown', 'ArrowLeft', 'PageUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault(); go(e.key === 'Home' ? -current : e.key === 'End' ? sections.length - 1 - current : ['ArrowRight', 'PageDown'].includes(e.key) ? 1 : -1);
    }
  });

  /* ── Reveal-on-scroll ────────────────────────────────────────── */
  if ('IntersectionObserver' in window && !motion.matches) {
    document.body.classList.add('js-motion');
    const obs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } }), { threshold: .06 });
    $$('.reveal').forEach(e => obs.observe(e));
    motion.addEventListener('change', () => { if (motion.matches) document.body.classList.remove('js-motion'); });
  }

  /* ── Deep-dive sheet: [data-dd] opens <template id="dd-…"> ──── */
  const sheet = $('#sheet'), K = $('#sheetK'), H = $('#sheetH'), B = $('#sheetB'); let sheetOpener = null;
  function openSheet(id, src) {
    const t = document.getElementById('dd-' + id); if (!t || !sheet) return;
    sheetOpener = src || null;
    K.textContent = t.dataset.k || ''; H.textContent = t.dataset.h || '';
    B.replaceChildren(t.content.cloneNode(true));
    B.querySelectorAll('table').forEach(table => { const sc = document.createElement('div'); sc.className = 'table-scroll'; sc.tabIndex = 0; sc.setAttribute('role', 'region'); sc.setAttribute('aria-label', H.textContent + ' — scrollable table'); table.before(sc); sc.append(table); });
    sheet.showModal();
    const sin = $('.sheet-in'); sin.scrollTop = 0; sheet.scrollTop = 0; sin.focus({ preventScroll: true });
    requestAnimationFrame(() => { sin.scrollTop = 0; sheet.scrollTop = 0; });
    history.replaceState(null, '', '#' + id);
  }
  document.addEventListener('click', e => { const t = e.target.closest('[data-dd]'); if (t) { e.preventDefault(); openSheet(t.dataset.dd, t); } });
  if (sheet) {
    $('#sheetX').addEventListener('click', () => sheet.close());
    sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); });
    sheet.addEventListener('close', () => { history.replaceState(null, '', location.pathname + location.search); sheetOpener?.focus(); });
    const deep = location.hash.slice(1);
    if (deep && document.getElementById('dd-' + deep)) addEventListener('load', () => openSheet(deep));
  }

  /* ── Animated counters: [data-count] with data-prefix/suffix/dec ─ */
  const counter = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; counter.unobserve(e.target);
    const el = e.target, target = +el.dataset.count, prefix = el.dataset.prefix || '', suffix = el.dataset.suffix || '';
    const dec = el.dataset.dec !== undefined ? +el.dataset.dec : (Number.isInteger(target) ? 0 : 1);
    if (motion.matches) { el.textContent = prefix + target.toFixed(dec) + suffix; return; }
    const start = performance.now();
    (function tick(now) { const p = Math.min(1, (now - start) / 1100); el.textContent = prefix + (target * (1 - (1 - p) ** 4)).toFixed(dec) + suffix; if (p < 1) requestAnimationFrame(tick); })(performance.now());
  }), { threshold: .4 });
  $$('[data-count]').forEach(el => counter.observe(el));

  /* ── A/B scope toggle: #scopeToggle buttons swap [data-a]/[data-b] text ─ */
  const scope = $('#scopeToggle');
  if (scope) {
    const copies = $$('[data-a]').map(el => {
      const variants = ['a', 'b'].map(k => { const c = document.createElement('span'); c.textContent = el.dataset[k]; c.dataset.variant = k; c.hidden = k !== 'a'; return c; });
      el.replaceChildren(...variants); return variants;
    });
    const apply = k => { copies.forEach(v => v.forEach(c => { c.hidden = c.dataset.variant !== k; })); $$('#scopeToggle button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.scope === k))); };
    $$('#scopeToggle button').forEach(b => b.addEventListener('click', () => apply(b.dataset.scope)));
  }

  /* ════════════════ CASE WIRING (placeholder) ════════════════════
     The scenario panel below is a working demo of the slider+bars
     pattern. Replace the model with the real case numbers. */
  const panel = $('#scenario-panel');
  if (panel) {
    const inputs = $$('#scenario-panel input[type=range]');
    function renderScenario() {
      const v = Object.fromEntries(inputs.map(i => [i.id, +i.value]));
      inputs.forEach(i => { const out = $('#' + i.id + 'V'); if (out) out.textContent = i.value; });
      // Placeholder model: two illustrative outcomes from the sliders.
      const base = v.driverA * 10, ours = v.driverA * 10 * (1 - v.driverB / 100);
      const peak = Math.max(base, ours, 1);
      const rows = { base, ours };
      Object.entries(rows).forEach(([k, val]) => {
        const row = panel.querySelector(`.cost-row[data-k="${k}"]`); if (!row) return;
        row.querySelector('.bar i').style.width = (val / peak * 100) + '%';
        row.querySelector('strong').textContent = Math.round(val).toLocaleString('en-GB');
      });
      const head = $('#scenario-head'); if (head) head.textContent = ours < base ? 'The intervention wins this scenario.' : 'Base case wins this scenario.';
    }
    inputs.forEach(i => i.addEventListener('input', renderScenario));
    renderScenario();
  }
})();
