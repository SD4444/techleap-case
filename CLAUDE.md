# Techleap case

Interactive case presentation for Simon's job interview at Techleap. A single-page
site in the style of tarnoc-funding.com: a market problem and the proposed solution,
told as a scrolling narrative with interactive elements. Not a personal pitch; the
case is the content. Built 2026-09-16 from the Tarnoc funding site framework.

## Status

Skeleton with placeholder copy (everything in [brackets]). Simon is drafting the
actual case material and will supply it; sections will be rewritten around it.
The section set (problem / evidence / solution / scenarios / market / plan /
recommendation) is a starting shape, not a commitment.

## Hosting

- GitHub repo `SD4444/techleap-case` (public), GitHub Pages from `main` root.
- URL: https://sd4444.github.io/techleap-case/
- `gh` on this machine has two accounts: SMDevolute (Evolute) and SD4444 (personal).
  This repo lives under SD4444 — run `gh auth switch -u SD4444` before `gh`/push ops
  and check with `gh auth status`. A 404 on the repo usually means the wrong account.

## Architecture

No build step, no dependencies. Static files only:

- `deck.html` + `deck.css` + `deck.js` — slide-deck version of the case, one slide per screen, arrow-key navigation. Static figures; links back to the interactive site.
- `deepdives.html` — all `<template id="dd-…">` deep-dive sheets, fetched at load by both app.js and deck.js (needs http, not file://).
- `index.html` — the whole page. Sections are `<main>>section[data-title]`; the
  header nav, progress bar, present mode and deep-dive sheet all key off that.
- `styles.css` — the design system, copied VERBATIM from tarnoc-funding.com
  (Simon's own Evolute × Tarnoc project, repo SMDevolute/tarnoc-pitch-website was
  empty; assets were pulled from the live Netlify site 2026-09-16). Do not edit it;
  put all overrides in `case.css`. Accent was Tarnoc orange `#ff5a24`, rethemed to green `#3ec26f` on 2026-09-16 with a sed over styles.css (the one permitted edit to that file) — hardcoded in
  many places (incl. 8-digit alpha variants), so a retheme is a sed over the whole
  orange family (#ff5a24 #ff7548 #ff9b75 #ff9d7b #ba3610 #bf3710 #c13a12 #944023
  #995030 #ffb296 #ff2e0f), not a token change.
- `case.css` — project overrides (text brand, placeholder tweaks).
- `app.js` — generic machinery ported from the Tarnoc site and null-guarded:
  mobile menu, scroll progress + % readout, active nav, reveal-on-scroll,
  animated counters (`[data-count]` + `data-prefix/suffix/dec`), deep-dive sheet
  (`[data-dd]` button opens `<template id="dd-…">`, deep-linkable via URL hash),
  A/B scope toggle (`#scopeToggle` + `[data-a]/[data-b]` spans), and **present
  mode** (`#present` button: fullscreen slide deck, one section per slide,
  arrow-key navigation, auto-fit scaling). Case-specific wiring (the scenario
  slider model) lives at the bottom under "CASE WIRING".
- `assets/geist.woff2` — Geist variable font (referenced by styles.css).
- `assets/europe.svg` — western-Europe map; pins are `.eu-pin` spans with
  `--x/--y` percentages, colour classes `w1/w2/w3`.
- `reference/` — the original Tarnoc index.html + JS, kept for pattern lookup
  (segmented product selector, calculator, scroll-pinned cycle diagram, market
  toggle, embers). NOT served; delete before sharing the repo if it matters.

## Interactive patterns available (from the framework)

- Scenario panel: sliders (`.controls` + `input[type=range]`) driving `.cost-row`
  bars — see `#scenario-panel` and the placeholder model in app.js.
- Segmented toggles (`.segmented` + `aria-pressed`) for scenario/scope switching.
- Deep-dive sheet popouts for tables, sources, long-form backing.
- Pin map for geographic distribution.
- Present mode for driving the discussion live in the interview.
- Print styles exist (styles.css `@media print`) — the page prints as a deck.

## Rules

### Communicating with Simon

Short. Literal. No metaphor, no idiom, no figurative verbs. If a word could be
replaced by a plainer one with the same meaning, replace it. No jargon from
writing, design or AI ("beats", "narrative arc", "surface", "carry"). Every
sentence must survive the question "what exactly does that mean?" Say what was
done, what was not done, and what needs a decision. Lead with the result. No
summaries of the process, no closing offers.
Wrong: "the page follows the draft's beats". Right: "the page has one section
per chapter of the draft". Wrong: "the €10k cap could not carry it". Right:
"the €10k cap is smaller than the proposed payment".

### Content on the site

Write as an economist, a scientist and an investor would to a professional
non-specialist. Every claim is measured data, a supplier claim, or a proposal,
and is labelled as such. Literal language only: no metaphor, no idiom, no
figurative verbs. Rhetorical questions only where the question is the actual
discussion prompt. Short sentences. Use the common word when it is as precise
as the technical one; define a technical term the first time it appears. State
a number's scope and limits in the same sentence as the number. Never present
a national figure as a local result or a vendor claim as an outcome. No em
dashes.

### Design

- Alignment: items in one row share the same top edge, the same internal
  structure and the same height. If one card has a label row, every card in
  that row has a label row.
- Capitalisation: sentence case everywhere. Eyebrow labels and badges are the
  only uppercase text. No fragment starts lowercase.
- Spacing: at least 16px between text and any border, rule or box edge. Badges
  sit on their own line, left-aligned with the text above, 10px below it.
  Connectors (arrows, chevrons) have at least 12px clear space on both sides.
- Colour: one colour per heading. Accent green is for numbers, controls,
  active states and badges, not for part of a sentence.
- Length: headings at most 12 words. Trim text before adding space.
- No overflow, no overlap, no clipped text at any width from 400px up.
- Check every change against these rules in the browser before pushing.

### Other

- Never use em dashes in anything user-facing (Simon's standing rule).
- The repo is public: no confidential Techleap material, no personal data beyond
  what Simon approves, and keep `meta name="robots" content="noindex"`.
- Verify locally with `python3 -m http.server 8080` in the repo root.
