// Cohesion-pass checks for the Solution 1 one-pager, draft 4 (18 Oct 2026). Run: node tools/s3/check_cohesion.cjs
// One or more targeted checks per audit finding (M1–M6, I1–I6) and scenario (S1–S5), plus words that must no longer appear
// anywhere. Text checks show that the page SAYS the corrected behaviour; they do not run a product workflow.
// Writes checks/one-pager-draft-4-cohesion-checks-2026-10-18.json. Label geometry is checked by check_diagram_geometry.cjs.
const path = require('node:path'); const fs = require('node:fs');
const {chromium} = require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT = '/Users/ranjansingh/Desktop/Xpatready/ai-workers';
const PAGE = 'file:///Users/ranjansingh/Desktop/Xpatready/ai-workers/illustrations/actor-handoff-demo/draft-4-validator-2026-10-18/inputs-4.1/solution-1-one-pager.html';
const results = []; let failed = 0;
function check(id, name, ok, detail) { results.push({id, name, ok: !!ok, detail}); if (!ok) failed++; console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + (ok ? '' : '  ' + JSON.stringify(detail).slice(0, 300))); }
async function load(b, w, scheme) {
  const ctx = await b.newContext({viewport: {width: w, height: 900}, colorScheme: scheme || 'light', hasTouch: w < 1000, isMobile: w < 600});
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(PAGE); await p.waitForSelector('body[data-ready="true"]'); return {ctx, p, errs};
}
const tpl = (p, id) => p.evaluate(id => { const t = document.getElementById('tpl-' + id); return t ? t.content.textContent.replace(/\s+/g, ' ') : ''; }, id);
(async () => {
  const b = await chromium.launch({channel: 'chrome', headless: true});
  const {ctx, p} = await load(b, 1440);
  const all = await p.evaluate(() => { const ts = [...document.querySelectorAll('template')].map(t => t.content.textContent).join(' ');
    return (document.body.innerText + ' ' + ts + ' ' + Object.values(JSON.parse(document.getElementById('dg-data').textContent).views).map(v => v.xml).join(' ')).replace(/\s+/g, ' '); });
  const xml = await p.evaluate(() => Object.fromEntries(Object.entries(JSON.parse(document.getElementById('dg-data').textContent).views).map(([k, v]) => [k, v.xml])));
  // words that must no longer appear anywhere (page, panels, diagram data)
  for (const [id, w] of [['M1', 'closes when every filing is decided'], ['M1', 'ends when every filing is decided'], ['M2', 'No: back to the SQR'], ['M6', 'real read answers'],
                         ['I4', 'Two different kinds of check'], ['I4', 'never at a form'], ['I3', 'Accept, edit or reject'], ['I3', 'Approve, Correct or Flag'], ['I5', 'only a correct form']])
    check(id, `superseded wording gone: "${w}"`, !all.includes(w), w);
  // M1 / S2 / S3
  const s9 = await tpl(p, 'st-9'), a96 = await tpl(p, '9.6');
  check('M1', 'stage 9: a decision leads to After decision; closure when every filing is closed; decision needs its own permission', /After decision/.test(s9) && /every filing is closed/.test(s9) && /record-decision permission/.test(s9), s9.slice(0, 200));
  check('M1/S3', 'stage 9 and 9.6: an approved route level opens the next filing, reusing verified facts', /next filing opens/.test(s9) && /next filing opens on the same case and reuses each person's verified facts/.test(a96) /* checker minor fix m15: reuse, not copying */, '');
  check('S2', '9.6 acceptance: both filings decided, after-decision step open → case stays open', /after-decision step .*still open: the case stays open in After decision/.test(a96), '');
  check('M1', 'overview band end and BPMN overview end agree: every filing closed', all.includes('the case closes when every filing is closed') && xml.v0.includes('Every filing closed') && xml.v6.includes('After decision (case workflow)') && xml.v6.includes('Next filing (view 4)'), '');
  check('M1', 'view 4 has the matching entry for the next filing', xml.v4.includes('Next filing of a route (view 6)'), '');
  // M2 / S1
  check('M2', 'view 4: staff verification (8.1) comes before the readiness question; only a client gap returns to the SQR',
    /sourceRef="A_8_1" targetRef="X9"/.test(xml.v4) && /name="Client answer or document missing" sourceRef="X9" targetRef="A_7_2"/.test(xml.v4) && !/sourceRef="A_7_3" targetRef="X9"/.test(xml.v4), '');
  const a81 = await tpl(p, '8.1');
  check('M2/S1', '8.1: a blank staff fact is entered by the agent, never sent to the client; only forms that read it wait; other filings continue',
    /ever sent to a client's SQR/.test(a81) && /only that form waits/.test(a81) && /Client A's filing goes on to approval/.test(a81), '');
  // M3
  const a73 = await tpl(p, '7.3'), a43 = await tpl(p, '4.3'), a53 = await tpl(p, '5.3'), s3 = await tpl(p, 'st-3');
  check('M3', '7.3: migration with consent and staff verification; historical comparison; a filed form is not automatically correct', /Migration: when a firm moves in/.test(a73) && /consent/.test(a73) && /verify in 8.1/.test(a73) && /not automatically a correct answer/.test(a73), '');
  check('M3', "4.3, 5.3 and stage 3: compare when available; otherwise 'Historical comparison unavailable'; differences classified; suspected error held",
    /Historical comparison unavailable/.test(a43) && /Historical comparison unavailable/.test(a53) && /Historical comparison unavailable/.test(s3) && /mistake in the earlier filed form/.test(a43) && /the mapping and its dependent work are held/.test(a43), '');
  // M6
  const ev = await p.evaluate(() => document.getElementById('evidence').innerText.replace(/\s+/g, ' '));
  check('M6', 'Evidence separates inventory and matching (in the real read) from writing/Validate, final-file read-back, portal and provider runs (not in it)',
    /What each kind of proof establishes/.test(ev) && /Writing and Validate .* No /.test(ev) && /Final-file read-back .* No /.test(ev) && /Portal operation .* No /.test(ev) && /The planned real read does not answer it/.test(ev), ev.slice(0, 200));
  check('M6', 'stage 1 states the bounded real read', /need their own proof by the team/.test(await tpl(p, 'st-1')), '');
  // I2
  check('I2', '3.7 is a platform step in view 2 (rules, not AI); stage 2 names the platform assembling the question sets',
    /<bpmn:lane id="L_v2_setup_sys"[^>]*>.*A_3_7/.test(xml.v2) && /Rules, not AI/.test(await tpl(p, '3.7')) && /assembles the PQR, SQR and staff working view by rules/.test(all), '');
  check('I2', '3.4: approved placements are reused by rule before AI is asked', /placed by rule; AI is asked only for fields with no approved placement/.test(await tpl(p, '3.4')), '');
  // I3
  const st11 = await p.evaluate(() => [...document.getElementById('tpl-st-11').content.querySelectorAll('.story tbody tr')].map(r => r.textContent));
  check('I3', 'stage 11 story: coordination, then re-drafting, then review', st11.findIndex(t => /coordinates/.test(t)) < st11.findIndex(t => /Re-drafts/.test(t)) && st11.findIndex(t => /Re-drafts/.test(t)) < st11.findIndex(t => /Reviews each changed item/.test(t)), st11);
  const dup = await p.evaluate(() => [...document.querySelectorAll('template')].filter(t => { const a = t.content.querySelector('.auth'), c = t.content.querySelector('.chk');
    return a && c && /reviewed in 5\.1|reviewed\./i.test(a.textContent) && /reviewed by/i.test(c.textContent); }).map(t => t.id));
  check('I3', 'no activity repeats its review in both Authority and Checked by', dup.length === 0, dup);
  // I4
  check('I4', "checks table is headed 'Checks and what each establishes' and has three rows", await p.evaluate(() => { const h = [...document.querySelectorAll('#controls h3')].find(x => /Checks and what each establishes/.test(x.textContent));
    return h && h.nextElementSibling.querySelectorAll('tbody tr').length === 3; }), '');
  const cn = fs.readFileSync(path.join(ROOT, 'requirements', 'change-notes', 'CN-SA-01B.md'), 'utf8'), reg = fs.readFileSync(path.join(ROOT, 'requirements', 'team-change-register-2026-10-13.md'), 'utf8');
  check('I4', 'legacy fourth-tier proposals marked superseded by AIW-D235 (CN-SA-01B change 9, TC-177)', /Superseded .*AIW-D235/.test(cn) && /TC-177.*Superseded .*AIW-D235/.test(reg), '');
  // I5
  check('I5', '8.4 statuses in words with reason and required action; colour only supplements', /Blocked \(red\)/.test(await tpl(p, '8.4')) && /State \(colour\)/.test(await tpl(p, '8.4')), '');
  // S4 / S5
  const a104 = await tpl(p, '10.4'), a103 = await tpl(p, '10.3');
  check('S4', '10.4: an already-approved form on another case using the held mapping loses its approval and cannot be submitted', /mapping under correction/.test(a104) && /cannot be submitted until the case adopts the corrected version/.test(a104), '');
  check('S5', '10.3: adoption recomputes checklist items and readiness, not only forms; a guide-only document change holds the filing', /recomputes everything the new version changes/.test(a103) && /no form re-renders/.test(a103), '');
  // Lens 7 (functional language and consistency): corrections from the independent read of all 57 panels
  const a51 = await tpl(p, '5.1'), a44 = await tpl(p, '4.4'), a52 = await tpl(p, '5.2'), a71 = await tpl(p, '7.1'), a84 = await tpl(p, '8.4'), a53b = await tpl(p, '5.3');
  check('L7-1', '5.1, 4.4 and stage 3 agree: a correction and a return both go back to drafting through 4.4', /re-drafted with the correction as input/.test(a51) && /correction or return \(5\.1\)/.test(a44) && /Corrected, returned, or rejected by the SME\?/.test(s3), '');
  check('L7-3', 'reading starts per upload; verification per fact', /A document is uploaded: one reading per upload/.test(a73) && /facts are verified one at a time/.test(a81), '');
  check('L7-4', '7.1 exception agrees with 9.6: open until every filing is closed', /stays open until every filing is closed/.test(a71), '');
  check('L7-5/6', '9.6 answers the pack version from the team (AG17-D65) and keeps staff closure as an open team question', /Open question for the team: may staff close a case/.test(a96) && /pinned pack version unless the agent adopts/.test(a96) /* checker minor fix m5/m6: pack version answered by AG17-D65 */, '');
  check('L7-9', 'second person excludes the author and the submitter (SA1-D6)', /author or submitter/.test(a53b), '');
  check('L7-10', 'an item still waiting for the SME waits; only a corrected or rejected one returns', /still waiting for the SME simply waits/.test(a44) && /not yet looked at waits/.test(a52), '');
  check('L7-18', 'advisory (Major/Minor) warnings never block; Critical ones are acknowledged with a reason', /Advisory \(amber, marked advisory\)/.test(a84) && /only Critical warnings must be fixed or passed/.test(all), '');
  // I1: overview geometry
  const geo = await p.evaluate(() => { const rows = [...document.querySelectorAll('.band-setup .mnode')].map(n => n.getBoundingClientRect().height);
    const end = document.querySelector('.band-setup .mend').getBoundingClientRect().width, card = document.querySelector('.band-setup .mnode').getBoundingClientRect().width; return {rows, end, card}; });
  check('I1', 'setup row: tallest card under 900px (was 1,003px) and the end column narrower than a stage card', Math.max(...geo.rows) < 900 && geo.end < geo.card, geo);
  // I6: tooltip dismissed by page scroll and by a nested scroll
  const tipGone = async scroller => { await p.mouse.move(5, 5); await p.waitForTimeout(300); const side = p.locator('.band-setup .mnode .side').first(); await side.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await side.hover({timeout: 5000}); await p.waitForTimeout(450); const shown = await p.evaluate(() => !document.getElementById('tip').hidden);
    await p.evaluate(sel => { const e = sel ? document.querySelector(sel) : null; if (e) { e.scrollLeft += 40; e.dispatchEvent(new Event('scroll')); } else window.scrollBy(0, 60); }, scroller); await p.waitForTimeout(100);
    return {shown, hidden: await p.evaluate(() => document.getElementById('tip').hidden)}; };
  const t1 = await tipGone(null); check('I6', 'a tooltip is dismissed when the page scrolls', t1.shown && t1.hidden, t1);
  await p.evaluate(() => window.scrollTo(0, 0));
  const t2 = await tipGone('.dg-scroll'); check('I6', 'a tooltip is dismissed when a diagram frame scrolls', t2.shown && t2.hidden, t2);
  await ctx.close();
  // M4 at 375px, both themes
  for (const scheme of ['light', 'dark']) {
    const {ctx: c2, p: q} = await load(b, 375, scheme);
    const r = await q.evaluate(() => ({sw: document.documentElement.scrollWidth, iw: innerWidth, over: [...document.querySelectorAll('#records th, #records td')].filter(e => e.scrollWidth > e.clientWidth + 2).map(e => e.innerText.slice(0, 40)),
      rows: [...document.querySelectorAll('#records tbody tr')].map(t => Math.round(t.getBoundingClientRect().width)), head: getComputedStyle(document.querySelector('#records thead')).display}));
    check('M4', `375px ${scheme}: Shared records stacked, six records, no cell overflow, no page-wide sideways scroll`, r.over.length === 0 && r.sw <= r.iw && r.rows.length === 6 && r.rows.every(w => w <= 375) && r.head === 'none', r);
    await c2.close();
  }
  await b.close();
  const out = '/Users/ranjansingh/Desktop/Xpatready/ai-workers/illustrations/actor-handoff-demo/draft-4-validator-2026-10-18/evidence-4.1/checks' + path.sep + path.join( 'one-pager-draft-4-cohesion-checks-2026-10-18.json');
  fs.writeFileSync(out, JSON.stringify({page: PAGE, checked_at: new Date().toISOString(), passed: results.length - failed, total: results.length, results}, null, 2));
  console.log(`${results.length - failed}/${results.length} passed`); process.exitCode = failed ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 2; });
