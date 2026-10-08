/* Techleap case: generic page machinery.
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
  const sections = $$('main>section:not([data-noslide])'), stage = $('main'), controls = $('.deck-controls');
  /* A section with [data-part="N"] blocks becomes N slides: part 1 is every block without a data-part. */
  const slides = sections.flatMap(s => { const n = Math.max(1, ...[...s.querySelectorAll('[data-part]')].map(e => +e.dataset.part)); return n > 1 ? Array.from({ length: n }, (_, i) => ({ s, part: i + 1 })) : [{ s, part: 0 }]; });
  let current = 0, presenting = false, frame = 0, fitFrame = 0, returnY = 0, ownedFullscreen = false;
  const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  const cur = () => slides[current].s;
  sections.forEach(s => { s.setAttribute('tabindex', '-1'); s.setAttribute('aria-label', s.dataset.title || s.id); });
  if (controls) { controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', 'Presentation navigation'); $('#slide-count')?.setAttribute('aria-live', 'polite'); }
  function updateControls() {
    if (!controls) return;
    $('#slide-count').textContent = String(current + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    $('#slide-title').textContent = cur().dataset.title || '';
    $('#prev-slide').disabled = current === 0; $('#next-slide').disabled = current === slides.length - 1;
  }
  function applyPart() {
    const { s, part } = slides[current];
    const wrap = s.querySelector('.wrap');
    let label = wrap.querySelector('.part-eyebrow');
    if (part > 1 && !label) { label = document.createElement('p'); label.className = 'eyebrow part-eyebrow'; label.textContent = s.dataset.title || ''; wrap.prepend(label); }
    let first = true;
    wrap.querySelectorAll(':scope > *').forEach(el => {
      const isLabel = el.classList.contains('part-eyebrow');
      const p = isLabel ? part : +(el.dataset.part || 1);
      const hide = part !== 0 && (isLabel ? part < 2 : p !== part);
      el.classList.toggle('part-hidden', hide);
      el.classList.toggle('part-first', !hide && first && part > 1 && !isLabel);
      if (!hide && !isLabel) first = false;
    });
  }
  function fitSlide() {
    fitFrame = 0; if (!presenting) return;
    const slide = cur();
    stage.style.setProperty('--controls-height', Math.ceil(controls.getBoundingClientRect().height) + 'px');
    slide.style.transform = ''; slide.style.removeProperty('--slide-offset');
    if (innerWidth <= 800 || innerHeight <= 500) return;
    /* Never enlarge; shrink only when the slide is taller than the stage. */
    const height = slide.offsetHeight;
    const scale = Math.min(1, stage.clientHeight / height);
    slide.style.transform = `scale(${scale})`;
    /* Lead slides share one top edge so labels and headings do not jump between slides.
       Continuation slides (second half of a section), the hero and the single question are vertically centred. */
    const spare = Math.max(0, stage.clientHeight - height * scale);
    const centred = slides[current].part > 1 || slide.id === 'thesis' || slide.id === 'gap-q' || slide.id === 'close';
    slide.style.setProperty('--slide-offset', (centred ? spare / 2 : Math.min(48, spare)) + 'px');
  }
  function queueFit() { if (!fitFrame) fitFrame = requestAnimationFrame(fitSlide); }
  function showSlide() {
    const active = cur();
    sections.forEach(s => { s.classList.toggle('is-slide', s === active); s.inert = s !== active; });
    applyPart();
    stage.style.background = getComputedStyle(active).backgroundColor;
    active.scrollTop = 0;
    active.querySelectorAll('img[loading="lazy"]').forEach(img => img.loading = 'eager');
    updateControls(); fitSlide();
  }
  function setPresent(on) {
    if (on === presenting || !controls) return;
    if (on) { returnY = scrollY; closeMenu(); }
    presenting = on; document.body.classList.toggle('presenting', on); controls.hidden = !on;
    $('header').inert = on; const skip = $('.skip'); if (skip) skip.inert = on;
    $('#present')?.setAttribute('aria-pressed', String(on));
    if (on) {
      showSlide(); cur().focus({ preventScroll: true });
      const request = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
      if (request && !fullscreenElement()) {
        try { const r = request.call(document.documentElement); Promise.resolve(r).then(() => { ownedFullscreen = !!fullscreenElement(); if (!presenting && ownedFullscreen) leaveFullscreen(); queueFit(); }).catch(() => {}); } catch {}
      }
    } else {
      sections.forEach(s => { s.inert = false; s.classList.remove('is-slide'); s.style.transform = ''; s.style.removeProperty('--slide-offset'); s.querySelectorAll('.part-hidden,.part-first').forEach(el => el.classList.remove('part-hidden', 'part-first')); s.querySelectorAll('.part-eyebrow').forEach(el => el.remove()); });
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
    if (!sections.length) return;
    let sec = 0; sections.forEach((s, i) => { if (s.getBoundingClientRect().top <= innerHeight * .4) sec = i; });
    current = slides.findIndex(sl => sl.s === sections[sec]);
    updateControls();
    $$('header nav a').forEach(a => a.classList.toggle('active', a.hash === '#' + sections[sec].id || a.getAttribute('aria-current') === 'page'));
  }
  addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(updateScroll); }, { passive: true });
  addEventListener('resize', () => { if (presenting) queueFit(); else updateScroll(); });
  if (window.visualViewport) visualViewport.addEventListener('resize', queueFit);
  if (stage) { new ResizeObserver(queueFit).observe(stage); sections.forEach(s => new ResizeObserver(queueFit).observe(s)); }
  document.fonts.ready.then(queueFit);
  if (stage) { stage.addEventListener('load', queueFit, true); stage.addEventListener('toggle', queueFit, true); }
  updateScroll();
  const go = d => { current = Math.max(0, Math.min(slides.length - 1, current + d)); showSlide(); cur().focus({ preventScroll: true }); };
  $('#present')?.addEventListener('click', () => setPresent(!presenting));
  $('#exit-present')?.addEventListener('click', () => setPresent(false));
  $('#prev-slide')?.addEventListener('click', () => go(-1));
  $('#next-slide')?.addEventListener('click', () => go(1));
  stage?.addEventListener('click', e => { if (!presenting) return; const link = e.target.closest('a[href^="#"]'); if (!link) return; const i = slides.findIndex(sl => '#' + sl.s.id === link.hash); if (i >= 0) { e.preventDefault(); go(i - current); } });
  addEventListener('keydown', e => {
    if (!presenting || document.querySelector('dialog[open]')) return;
    if (e.key === 'Escape') { e.preventDefault(); setPresent(false); return; }
    if (e.target.closest('input,select,textarea,summary,[contenteditable=true]')) return;
    if (['ArrowRight', 'PageDown', 'ArrowLeft', 'PageUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault(); go(e.key === 'Home' ? -current : e.key === 'End' ? slides.length - 1 - current : ['ArrowRight', 'PageDown'].includes(e.key) ? 1 : -1);
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
    B.replaceChildren(t.content.cloneNode(true)); if (window.noOrphans) window.noOrphans(B);
    B.querySelectorAll('table').forEach(table => { const sc = document.createElement('div'); sc.className = 'table-scroll'; sc.tabIndex = 0; sc.setAttribute('role', 'region'); sc.setAttribute('aria-label', H.textContent + ', scrollable table'); table.before(sc); sc.append(table); });
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
    fetch('deepdives.html', { cache: 'no-cache' }).then(r => r.text()).then(html => {
      const t = document.createElement('template'); t.innerHTML = html; document.body.append(t.content);
      const deep = location.hash.slice(1);
      if (deep && document.getElementById('dd-' + deep)) openSheet(deep);
    }).catch(() => {});
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

  /* ════════════════ CASE WIRING ════════════════════════════════
     Generic switchers plus the conditional order-book model for the
     scenario explorer. All figures in the model are hypothetical. */

  /* Switchers: [data-switch="x"] button[data-val] shows [data-panel="x"][data-val] */
  $$('[data-switch]').forEach(group => {
    const name = group.dataset.switch, buttons = [...group.querySelectorAll('button[data-val]')];
    const apply = val => {
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.val === val)));
      group.dataset.active = val;
      $$(`[data-panel="${name}"]`).forEach(p => { const show = p.dataset.val === val; if (show && p.hidden) pulse(p); p.hidden = !show; });
    };
    buttons.forEach(b => b.addEventListener('click', () => apply(b.dataset.val)));
  });

  /* Grower payback calculator: costs split by method */
  const pbk = $('#payback-panel');
  if (pbk) {
    const ins = $$('#payback-panel input[type=range]');
    const eur = n => '€' + (Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(2) + 'm' : Math.round(n).toLocaleString('en-GB'));
    const fmt = { pbkPasses: v => v, pbkPassCost: v => '€' + v, pbkHours: v => v + ' h', pbkWage: v => '€' + v, pbkPassesAfter: v => v, pbkHoursAfter: v => v + ' h', pbkHa: v => v + ' ha', pbkPrice: v => eur(v), pbkService: v => eur(v), pbkCap: v => v.toLocaleString('en-GB') + ' ha' };
    function render() {
      const v = Object.fromEntries(ins.map(i => [i.id, +i.value]));
      const herb = pbk.dataset.herb !== '0';
      $$('.pbk-herb', pbk).forEach(el => { el.hidden = !herb; });
      ins.forEach(i => { const o = $('#' + i.id + 'V'); if (o) o.textContent = fmt[i.id](v[i.id]); });
      $$('#pbkPreset button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.passes === v.pbkPasses && +b.dataset.hours === v.pbkHours)));
      const before = v.pbkPasses * v.pbkPassCost + v.pbkHours * v.pbkWage;
      const after = v.pbkPassesAfter * v.pbkPassCost + v.pbkHoursAfter * v.pbkWage;
      const savingHa = before - after;
      const machines = Math.max(1, Math.ceil(v.pbkHa / v.pbkCap));
      const net = savingHa * v.pbkHa - v.pbkService * machines;
      const capex = v.pbkPrice * machines;
      const years = net > 0 ? capex / net : null;
      const grossYear = savingHa * v.pbkHa, serviceYear = v.pbkService * machines;
      const beforeYear = before * v.pbkHa, afterYear = after * v.pbkHa + serviceYear;
      const peak = Math.max(beforeYear, afterYear, 1);
      const rows = { before: beforeYear, after: afterYear };
      Object.entries(rows).forEach(([key, val]) => { const row = pbk.querySelector(`.cost-row[data-k="${key}"]`); row.querySelector('.bar i').style.width = (val / peak * 100) + '%'; row.querySelector('strong').textContent = eur(val); });
      const gain = $('#pbkGain'); gain.textContent = (net < 0 ? '−' : '') + eur(Math.abs(net)); gain.classList.toggle('pos', net > 0); gain.classList.toggle('neg', net < 0);
      $('#pbkMachines').textContent = String(machines);
      $('#pbkTotal').textContent = eur(capex);
      $('#pbkYears').textContent = years === null ? 'Not reached' : years.toFixed(1) + ' years';
      const card = $('#pbkCard'); card.classList.toggle('pos', net > 0);
      if (savingHa <= 0) {
        $('#pbkHead').textContent = 'The robot does not reduce weed-control costs.';
        $('#pbkBody').textContent = 'The machine does not recover its purchase price under these assumptions.';
      } else if (net <= 0) {
        $('#pbkHead').textContent = 'Annual savings do not cover service costs.';
        $('#pbkBody').textContent = 'The machine does not recover its purchase price under these assumptions.';
      } else {
        $('#pbkHead').textContent = `Upfront purchase price recovered in ${years.toFixed(1)} years.`;
        $('#pbkBody').textContent = `The ${eur(capex)} purchase price is recovered in ${years.toFixed(1)} years through annual operating savings of ${eur(net)}.`;
      }
      $('#pbkMeaning').textContent = net > 0
        ? 'Under these assumptions, the robot generates annual savings that can recover its upfront purchase price. The farmer\'s actual contribution is determined separately using verified farm economics and a signed offer.'
        : 'Under these assumptions, the robot increases annual operating costs. Reducing the upfront price would not fix that. Recurring costs must fall or a verified crop-margin benefit must offset the difference.';
    }
    ins.forEach(i => i.addEventListener('input', render));
    /* A preset resets every slider to its default, then sets the scenario's own values. */
    $$('#pbkPreset button').forEach(b => b.addEventListener('click', () => { pbk.dataset.herb = b.dataset.herb; ins.forEach(i => { i.value = i.defaultValue; }); $('#pbkPasses').value = b.dataset.passes; $('#pbkHours').value = b.dataset.hours; if (b.dataset.herb === '0') $('#pbkPassesAfter').value = 0; render(); }));
    render();
  }
  /* Big pop-out: [data-big="id"] opens <dialog id> nearly full screen */
  $$('[data-big]').forEach(b => b.addEventListener('click', () => {
    const dlg = document.getElementById(b.dataset.big); if (!dlg) return;
    dlg.querySelectorAll('.reveal').forEach(e => e.classList.add('visible'));
    dlg.showModal(); const inn = dlg.querySelector('.big-in'); inn.scrollTop = 0; inn.focus({ preventScroll: true });
    dlg.addEventListener('close', () => b.focus(), { once: true });
  }));
  $$('dialog.dark').forEach(dlg => {
    dlg.querySelector('.sheet-x')?.addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  });

  /* No orphans: join the last two words of every text block with a non-breaking space. */
  const NO_ORPHAN = 'h1,h2,h3,h4,h5,p,li,dd,dt,small,blockquote,.tag,.cond b,.tl-marks span,.role-out b,.paybar-bar .seg span,.seg b,.kpi .k,.bar-lab span,.chain span,.actor small,.tri-node,label';
  let noOrphans = function (root) {
    root.querySelectorAll(NO_ORPHAN).forEach(el => {
      if (el.children.length && !el.textContent.trim()) return;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n => n.data.trim() && !n.parentElement.closest('button.tl-bar,.eq-line,.frac,.dd-eq,.paybar-total') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
      let last = null; while (walker.nextNode()) last = walker.currentNode;
      if (!last) return;
      const words = el.textContent.trim().split(/\s+/); if (words.length < 3) return;
      let s = last.data.trimEnd(); let i = s.lastIndexOf(' ');
      if (i > 0) { s = s.slice(0, i) + '\u00a0' + s.slice(i + 1); const j = s.lastIndexOf(' ', i - 1); if (j > 0 && s.slice(i + 1).replace('\u00a0', '').length <= 3) s = s.slice(0, j) + '\u00a0' + s.slice(j + 1); last.data = s + last.data.slice(last.data.trimEnd().length); }
    });
  };
  const NO_ORPHAN_LINKS = '.src a, .source a';
  const noOrphansBase = noOrphans;
  noOrphans = function (root) { noOrphansBase(root); root.querySelectorAll(NO_ORPHAN_LINKS).forEach(a => { const t = a.lastChild; if (!t || t.nodeType !== 3) return; let s = t.data.trimEnd(); const i = s.lastIndexOf(' '); if (i > 0) t.data = s.slice(0, i) + '\u00a0' + s.slice(i + 1) + t.data.slice(s.length); }); };
  window.noOrphans = noOrphans;
  noOrphans(document.body);
})();

/* Bridge site: one view per idea. #thesis is the overview; #idea1 and #idea2 show only that idea. */
(() => {
  const views = ['thesis', 'idea1', 'idea2'];
  function show() {
    let id = location.hash.slice(1); if (!views.includes(id)) id = 'thesis';
    document.body.dataset.view = id;
    document.querySelectorAll('#main-nav a, .tl-ideas a').forEach(a => a.classList.toggle('current', a.hash === '#' + id));
    document.querySelectorAll('#' + id + ' .reveal').forEach(e => e.classList.add('visible'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  addEventListener('hashchange', show); show();
})();
