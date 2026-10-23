// Detail-panel checks for the Solution 1 one-pager (18 Oct 2026). Run: node tools/s3/check_panels.cjs
// Text checks show that the panel says the required thing; they do not run a product workflow.
// Writes checks/one-pager-detail-panels-browser-checks-2026-10-18.json.
const path = require('node:path'); const fs = require('node:fs');
const {chromium} = require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..', '..');
const PAGE = 'file://' + path.join(ROOT, 'problem-1-pathway-setup-and-form-filling', 'solution-1-one-pager.html');
const results = []; let failed = 0;
function check(name, ok, detail) { results.push({name, ok: !!ok, detail}); if (!ok) failed++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + JSON.stringify(detail).slice(0, 300))); }
async function load(browser, w, h, scheme) {
  const ctx = await browser.newContext({viewport: {width: w, height: h}, colorScheme: scheme || 'light', hasTouch: w < 1000, isMobile: w < 600});
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(PAGE); await p.waitForSelector('body[data-ready="true"]'); return {ctx, p, errs};
}
const panel = p => p.evaluate(() => { const i = document.getElementById('insp'), b = i.querySelector('.body');
  const first = [...b.querySelectorAll('.card > .psec')].map(s => s.textContent).join(' ');
  return {open: !i.hidden, h: (i.querySelector('h2') || {}).textContent, t: b.textContent, first, parts: [...b.querySelectorAll('.card > .psec > h3')].map(x => x.textContent),
    back: (b.querySelector('.backb') || {}).textContent || '', exBtn: !!b.querySelector('.ex-btn'), exOpen: b.querySelector('.example') ? !b.querySelector('.example').hidden : null,
    words: first.split(/\s+/).filter(Boolean).length, all: b.textContent.split(/\s+/).filter(Boolean).length}; });

(async () => {
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  const {ctx, p, errs} = await load(browser, 1440, 900);
  const open = (id, o) => p.evaluate(([i, x]) => S1.open(i, null, x || {}), [id, o]);

  // 1. representative panels say what the brief requires
  await open('3.2'); let r = await panel(p);
  check('3.2 automatic mapping: runs automatically with its result location, AI performs, the publisher reviews in 5.1, uncertain person or meaning held with its snippet',
    r.t.includes('Runs automatically. Results appear in the review workbench (5.1)') && !r.t.includes('No screen') && r.first.includes('AI in the product') && r.first.includes('reviewed by the content publisher (5.1)') && r.first.includes('marked uncertain with the page snippet') && r.first.includes('Not built yet'), r.first.slice(0, 200));
  await open('5.1'); r = await panel(p);
  check('5.1 review: the reviewer\'s choices and the no-self-publication limit are in the first view', r.first.includes('Approve, Correct or Flag') && r.first.includes('cannot publish their own work') && r.first.includes("'decide'"), r.first.slice(0, 200));
  await open('7.1'); r = await panel(p);
  check('7.1 case creation: new and existing entry in the first view; family, reuse and corporate examples behind one Example control, closed', r.first.includes('existing client needs a new service') && r.exBtn && r.exOpen === false, {first: r.first.slice(0, 160), ex: r.exOpen});
  await open('8.3'); r = await panel(p);
  check('8.3 meaning check: decides nothing; flags go to the agent (8.4); approval stays with the representative', r.first.includes('it decides nothing') && r.first.includes('decided by the agent (8.4)') && r.first.includes('approval stays with the representative'), r.first.slice(0, 200));
  await open('9.3'); r = await panel(p);
  check('9.3 approval: performer is the form-approve holder (Owner and Case Manager by default); unmatched signed file comes back here; next is signing, not "the case"',
    r.first.includes("form-approve permission") && r.first.includes('Owner and Case Manager') && r.first.includes('comes back from signing (9.4)') && r.first.includes('Signing (9.4) continues'), r.first.slice(0, 200));
  await open('9.4'); r = await panel(p);
  check('9.4 signing: each signatory signs their own part; the representative never signs for the client; three causes, two return routes', r.first.includes('each for their own part') && r.t.includes('The representative does not sign for the client') && r.first.includes("back to the representative's check (9.3)") && r.first.includes('back to 8.1'), r.first.slice(0, 200));
  await open('9.5'); r = await panel(p);
  check('9.5 submit and pay: authorised submitter (submit permission) and fee payer (client, or the firm on the client\'s behalf) named separately; no implication that the representative pays',
    r.first.includes('Authorised submitter') && r.first.includes('submit permission') && r.first.includes("Fee payer: the client, or the firm on the client's behalf") && !/representative (personally )?pays/.test(r.t), r.first.slice(0, 260));
  await open('10.2'); r = await panel(p);
  const roles = await p.evaluate(() => [...document.querySelectorAll('#insp .roles tr')].map(t => t.textContent));
  check('10.2 composite: coordinator, AI and platform, SME and a second-person approver who is never the drafter or coordinator; no empty Example button; links to real examples',
    roles.length === 4 && roles[0].includes('Coordinates') && roles[2].includes('Signs off') && roles[3].includes('Never the person who drafted or coordinated') && !r.exBtn && !r.t.includes('No separate example') && (await p.$$('#insp .exlinks .fl-link')).length === 3, roles);
  await p.click('#insp .exlinks .fl-link[data-act="3.2"]'); await p.waitForTimeout(100); r = await panel(p);
  check('10.2 → example link opens 3.2 with Back to 10.2', r.h.includes('form field maps') && r.back.includes('10.2'), r.back);
  await p.click('#insp .backb'); await p.waitForTimeout(100); r = await panel(p);
  check('Back from 3.2 returns to 10.2', r.h.includes('Re-run and publish') && !r.back, r.h);
  await open('st-A'); r = await panel(p);
  const story = await p.evaluate(() => [...document.querySelectorAll('#insp .story tbody tr')].map(t => t.querySelector('th').textContent));
  check('New client: client → platform → agent story with results, next step, the two decisions and the no-automatic-merge rule visible',
    story.length === 3 && story[0].includes('Client') && story[1].includes('Platform') && story[2].includes('Agent') && r.first.includes('Accepted: open the case (stage 4)') && r.first.includes('Same person as an existing client?') && r.first.includes('Firm takes the case?') && r.first.includes('never merge people'), story);
  await open('st-5'); r = await panel(p);
  check('Reuse verified information: field-by-field selection and the pending-state hold are visible; the 15 rules are closed until opened',
    r.first.includes('one fact at a time') && r.first.includes("forms that read it cannot be approved or submitted") && await p.evaluate(() => !document.querySelector('#insp details.sup').open), r.first.slice(0, 200));
  await open('st-3'); r = await panel(p);
  check('Stage 3: blocking failures go back to drafting; items marked \'decide\' are decided by the reviewer with no re-draft; corrections are a separate decision',
    r.first.includes("arrive marked 'decide' and the reviewer decides them, with no re-draft") && r.first.includes('Any blocking check failure?') && r.first.includes('Correction, or a rule not signed off?'), r.first.slice(0, 120));
  await open('st-8'); r = await panel(p);
  check('Stage 8: approver, signatories, authorised submitter and fee payer separate; the signing problem has its own decision', r.first.includes('authorised submitter') && r.first.includes("on the client's behalf") && r.first.includes('Problem when signing?'), r.first.slice(0, 160));
  await open('actors'); r = await panel(p);
  check('Who is who (reference): role, side and limits; payment wording aligned; no activity fields forced in', r.t.includes("on the client's behalf") && r.t.includes('proposed') && !r.t.includes('Starts when') && !r.t.includes('Acceptance checks') && r.parts.length === 0, r.t.slice(0, 120));
  await open('symbols'); r = await panel(p);
  check('Diagram symbols (reference): symbols and their meaning only', r.t.includes('User task') && !r.t.includes('Starts when') && !r.t.includes('Done when'), r.t.slice(0, 80));

  // 2. every panel: required parts for its type; first-view and expanded word counts (labels included)
  const ids = await p.evaluate(() => { const d = JSON.parse(document.getElementById('dg-data').textContent); return [...Object.keys(d.acts), ...Object.keys(d.cards)]; });
  const stats = [], bad = [];
  for (const id of ids) { await open(id); r = await panel(p);
    const exp = await p.evaluate(() => { document.querySelectorAll('#insp details').forEach(d => d.open = true); const e = document.querySelector('#insp .example'); if (e) e.hidden = false;
      return document.querySelector('#insp .body').textContent.split(/\s+/).filter(Boolean).length; });
    stats.push({id, first: r.words, expanded: exp});
    const isAct = /^\d/.test(id), isStage = id.startsWith('st-');
    if (isAct && r.parts.join('|') !== 'What this achieves|Who acts|Before it starts|How it works|Result and what happens next') bad.push({id, parts: r.parts});
    if (isStage && !(r.parts[0] === 'What this achieves' && r.parts[1] === 'Who does what, in order' && r.parts.includes('Result and what happens next'))) bad.push({id, parts: r.parts});
    if (/\bN\/A\b|No separate example|No human action at this step|Receiving owner/.test(r.t)) bad.push({id, filler: true}); }
  await p.evaluate(() => S1.close());
  check(`every one of the ${ids.length} panels shows the parts its type needs and no filler`, bad.length === 0 && ids.length === 57, bad);
  const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const acts = stats.filter(s => /^\d/.test(s.id));
  check(`activity first views: median ${med(acts.map(s => s.first))} words (range ${Math.min(...acts.map(s => s.first))}–${Math.max(...acts.map(s => s.first))}); expanded median ${med(acts.map(s => s.expanded))} (recorded, not a limit)`, true, stats);

  // 3. drill-down, Back, switching, selection, keyboard and focus at 1280px (floating panel)
  await ctx.close();
  const d = await load(browser, 1280, 800);
  await d.p.locator('#st-A').scrollIntoViewIfNeeded(); const y0 = await d.p.evaluate(() => scrollY);
  await d.p.focus('#st-A .det'); await d.p.keyboard.press('Enter'); await d.p.waitForTimeout(120);
  await d.p.focus('#insp .fl-link[data-act="6.1"]'); await d.p.keyboard.press('Enter'); await d.p.waitForTimeout(120);
  r = await panel(d.p);
  const vis = await d.p.evaluate(() => { const g = document.getElementById('st-A').getBoundingClientRect(), i = document.getElementById('insp');
    const hit = document.elementFromPoint(g.left + g.width / 2, g.top + 30); return {covered: i.contains(hit), sel: document.getElementById('st-A').classList.contains('sel'), y: scrollY}; });
  check('keyboard drill-down: New client → 6.1 shows "Back to Way in · start · New client"; the selected map element stays visible and selected; the page does not move',
    r.h.includes('Lead form and PQR') && r.back.includes('New client') && !vis.covered && vis.sel && vis.y === y0, {back: r.back, vis});
  await d.p.focus('#insp .backb'); await d.p.keyboard.press('Enter'); await d.p.waitForTimeout(120);
  const fb = await d.p.evaluate(() => ({h: document.querySelector('#insp h2').textContent, f: document.activeElement.dataset.act}));
  check('keyboard Back returns to New client with focus on the 6.1 link', fb.h === 'New client' && fb.f === '6.1', fb);
  await d.p.click('#insp .fl-link[data-act="6.3"]'); await d.p.waitForTimeout(80);
  await d.p.locator('#view-v2').scrollIntoViewIfNeeded(); await d.p.click('.eye[data-act="3.4"]'); await d.p.waitForTimeout(100);
  r = await panel(d.p); const selA = await d.p.evaluate(() => document.getElementById('st-A').classList.contains('sel'));
  check('switching: a new selection on a diagram replaces the drill-down; no stale Back; the old stage is no longer selected', r.h.includes('Place fields') && !r.back && !selA, {back: r.back, selA});
  await d.p.keyboard.press('Escape');
  const fc = await d.p.evaluate(() => ({hidden: document.getElementById('insp').hidden, f: document.activeElement.dataset.act}));
  check('Escape closes and returns focus to the element that opened the panel', fc.hidden && fc.f === '3.4', fc);
  await d.p.locator('#st-5').scrollIntoViewIfNeeded(); await d.p.click('#st-5 .det'); await d.p.waitForTimeout(80);
  await d.p.click('#insp .fl-link[data-act="8.1"]'); await d.p.waitForTimeout(80); await d.p.keyboard.press('Escape');
  const fc2 = await d.p.evaluate(() => ({hidden: document.getElementById('insp').hidden, f: document.activeElement.dataset.card, sel: document.querySelectorAll('.mnode.sel, .djs-element.sel').length}));
  check('Escape after a drill-down closes the panel, clears every selection and returns focus to the stage\'s eye', fc2.hidden && fc2.f === 'st-5' && fc2.sel === 0, fc2);
  // deliberate example choice is kept per panel
  await d.p.evaluate(() => S1.open('8.2')); await d.p.click('#insp .ex-btn'); await d.p.evaluate(() => S1.open('9.6'));
  const e1 = await d.p.evaluate(() => !document.querySelector('#insp .example').hidden); await d.p.evaluate(() => S1.open('8.2'));
  const e2 = await d.p.evaluate(() => !document.querySelector('#insp .example').hidden); await d.p.evaluate(() => S1.close());
  check('examples: opening one panel\'s example does not open another\'s; returning to it shows it as the reader left it', !e1 && e2, {e1, e2});
  check('no page errors at 1280px', d.errs.length === 0, d.errs); await d.ctx.close();

  // 4. phone sheet and narrow examples, light and dark
  for (const [w, scheme] of [[375, 'light'], [375, 'dark'], [768, 'light']]) {
    const m = await load(browser, w, 812, scheme);
    await m.p.locator('#st-5 .det').scrollIntoViewIfNeeded(); await m.p.locator('#st-5 .det').tap(); await m.p.waitForTimeout(120);
    await m.p.locator('#insp .ex-btn').tap(); await m.p.waitForTimeout(80);
    const ov = await m.p.evaluate(() => { const b = document.querySelector('#insp .body'); const t = [...b.querySelectorAll('.example table, .story')];
      return {over: t.filter(x => x.scrollWidth > x.parentElement.clientWidth + 1).length, page: document.documentElement.scrollWidth <= innerWidth,
        bg: getComputedStyle(document.getElementById('insp')).backgroundColor, ink: getComputedStyle(b).color}; });
    check(`${w}px ${scheme}: stage 5's example comparisons and the story table fit the panel (no sideways scroll)`, ov.over === 0 && ov.page, ov);
    if (w === 375) {
      await m.p.locator('#insp .fl-link[data-act="7.2"]').tap(); await m.p.waitForTimeout(100);
      const s = await m.p.evaluate(() => ({h: document.querySelector('#insp h2').textContent, back: !!document.querySelector('#insp .backb'), inert: document.querySelector('main').hasAttribute('inert'), modal: document.getElementById('insp').getAttribute('aria-modal')}));
      await m.p.locator('#insp .backb').tap(); await m.p.waitForTimeout(100);
      const s2 = await m.p.evaluate(() => ({h: document.querySelector('#insp h2').textContent, inert: document.querySelector('main').hasAttribute('inert')}));
      let inside = true; for (let i = 0; i < 12; i++) { await m.p.keyboard.press('Tab'); if (!(await m.p.evaluate(() => document.getElementById('insp').contains(document.activeElement)))) inside = false; }
      check(`${w}px ${scheme}: drill-down and Back work inside the sheet; the page behind stays inactive; focus stays in the sheet`, s.h.includes('Complete the SQR') && s.back && s.inert && s.modal === 'true' && s2.h === 'Reuse verified information' && s2.inert && inside, {s, s2, inside});
      await m.p.locator('#insp .closeb').tap();
      check(`${w}px ${scheme}: closing re-activates the page`, await m.p.evaluate(() => ![...document.body.children].some(e => e.hasAttribute('inert'))));
      if (scheme === 'light') { await m.p.locator('#st-A .det').scrollIntoViewIfNeeded(); await m.p.locator('#st-A .det').tap(); await m.p.waitForTimeout(100);
        await m.p.locator('#insp').screenshot({path: path.join(ROOT, 'checks', 's1-onepager-panel-newclient-phone.png')}); }
    }
    check(`${w}px ${scheme}: no page errors`, m.errs.length === 0, m.errs); await m.ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(ROOT, 'checks', 'one-pager-detail-panels-browser-checks-2026-10-18.json'), JSON.stringify({run: new Date().toISOString(), passed: results.length - failed, failed, results}, null, 1));
  console.log(`${results.length - failed}/${results.length} passed`); process.exit(failed ? 1 : 0);
})();
