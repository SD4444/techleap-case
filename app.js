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

  /* ════════════════ CASE WIRING ════════════════════════════════
     Generic switchers plus the conditional order-book model for the
     scenario explorer. All figures in the model are hypothetical. */

  /* Switchers: [data-switch="x"] button[data-val] shows [data-panel="x"][data-val] */
  $$('[data-switch]').forEach(group => {
    const name = group.dataset.switch, buttons = [...group.querySelectorAll('button[data-val]')];
    const apply = val => {
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.val === val)));
      $$(`[data-panel="${name}"]`).forEach(p => { const show = p.dataset.val === val; if (show && p.hidden) pulse(p); p.hidden = !show; });
    };
    buttons.forEach(b => b.addEventListener('click', () => apply(b.dataset.val)));
  });

  /* Scenario explorer: conditional order book */
  const panel = $('#scenario-panel');
  if (panel) {
    const inputs = $$('#scenario-panel input[type=range]');
    const eur = n => '€' + (n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 1 : 2) + 'm' : n >= 1e3 ? Math.round(n / 1e3).toLocaleString('en-GB') + 'k' : Math.round(n).toLocaleString('en-GB'));
    const num = n => Math.round(n).toLocaleString('en-GB');
    const fmt = { haRes: v => num(v), signRate: v => v + '%', passes: v => v, price: v => '€' + v, pubShare: v => v + '%', seasons: v => v, valHa: v => num(v) + ' ha' };
    function render() {
      const v = Object.fromEntries(inputs.map(i => [i.id, +i.value]));
      inputs.forEach(i => { const out = $('#' + i.id + 'V'); if (out) out.textContent = (fmt[i.id] || String)(v[i.id]); });
      const signed = v.haRes * v.signRate / 100;
      const driven = signed * v.passes;
      const season = driven * v.price;
      const total = season * v.seasons;
      const pub = total * v.pubShare / 100, grower = total - pub;
      const val = v.valHa * v.passes * v.price;
      const rows = { grower, public: pub, total };
      Object.entries(rows).forEach(([k, val]) => {
        const row = panel.querySelector(`.cost-row[data-k="${k}"]`); if (!row) return;
        row.querySelector('.bar i').style.width = (total ? val / total * 100 : 0) + '%';
        row.querySelector('strong').textContent = eur(val);
      });
      $('#kSigned').textContent = num(signed) + ' ha';
      $('#kDriven').textContent = num(driven) + ' ha';
      $('#kSeason').textContent = eur(season);
      $('#kVal').textContent = eur(val);
      const head = $('#scenario-head');
      if (head) head.textContent = v.pubShare
        ? `A ${eur(total)} conditional order book over ${v.seasons} season${v.seasons > 1 ? 's' : ''}, of which ${eur(pub)} would be a proposed public contribution.`
        : `A ${eur(total)} conditional order book over ${v.seasons} season${v.seasons > 1 ? 's' : ''}, paid by growers alone. It must work on private economics.`;
      const note = $('#scenario-note');
      if (note) note.textContent = `Hypothetical. ${num(v.haRes)} ha reserved × ${v.signRate}% signing = ${num(signed)} ha under conditional order; × ${v.passes} pass${v.passes > 1 ? 'es' : ''} × €${v.price} per driven hectare = ${eur(season)} per season. The €${v.price} is based on a supplier's under-€100 claim, not a measured farm cost. The ${v.pubShare}% equals the rate Rijnland pays on listed measures today. Its current scheme is capped at €10,000 per applicant under the crop-protection theme, so a multi-season payment would need a new, approved instrument. The validation slot is what the winning supplier is paid before the larger purchase activates.`;
    }
    inputs.forEach(i => i.addEventListener('input', render));
    render();
  }

  /* Grower payback calculator */
  const pbk = $('#payback-panel');
  if (pbk) {
    const ins = $$('#payback-panel input[type=range]');
    const eur = n => '€' + (n >= 1e6 ? (n / 1e6).toFixed(2) + 'm' : n >= 1e3 ? Math.round(n / 1e3).toLocaleString('en-GB') + 'k' : Math.round(n).toLocaleString('en-GB'));
    const fmt = { pbkCost: v => '€' + v.toLocaleString('en-GB'), pbkHa: v => v + ' ha', pbkReplace: v => v + '%', pbkPrice: v => eur(v), pbkService: v => eur(v) };
    function render() {
      const v = Object.fromEntries(ins.map(i => [i.id, +i.value]));
      ins.forEach(i => { const o = $('#' + i.id + 'V'); if (o) o.textContent = fmt[i.id](v[i.id]); });
      $$('#pbkPreset button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.cost === v.pbkCost)));
      const saving = v.pbkCost * v.pbkHa * v.pbkReplace / 100;
      const net = saving - v.pbkService;
      const years = net > 0 ? v.pbkPrice / net : null;
      const machines = Math.max(1, Math.ceil(v.pbkHa / 225));
      $('#pbkSaving').textContent = eur(saving);
      $('#pbkNet').textContent = (net < 0 ? '−' : '') + eur(Math.abs(net));
      $('#pbkYears').textContent = years === null ? 'None' : years >= 100 ? '>100' : years.toFixed(1);
      $('#pbkCap').textContent = String(machines);
      const head = $('#pbkHead');
      head.textContent = years === null
        ? `No payback. The saving of ${eur(saving)} a year is below the ${eur(v.pbkService)} annual service cost.`
        : years > 10
          ? `Payback in ${years >= 100 ? 'more than 100' : years.toFixed(1)} years. At this weeding cost the machine does not pay for itself within its likely life.`
          : `Payback in ${years.toFixed(1)} years on ${v.pbkHa} hectares at €${v.pbkCost.toLocaleString('en-GB')} per hectare.`;
      $('#pbkNote').textContent = `${eur(v.pbkPrice)} price ÷ (${eur(saving)} replaced cost − ${eur(v.pbkService)} service). Assumes the robot replaces ${v.pbkReplace}% of current weeding cost with no extra labour, energy, downtime or yield change, and no financing cost. Price, service and capacity are one supplier's figures, converted to euros and rounded. Presets are that supplier's cost estimates, not measured Dutch farm costs.`;
    }
    ins.forEach(i => i.addEventListener('input', render));
    $$('#pbkPreset button').forEach(b => b.addEventListener('click', () => { $('#pbkCost').value = b.dataset.cost; render(); }));
    render();
  }
})();
