// Targeted checks for the draft 4.3 correction (19 Oct 2026): R-M1 and R-m2 from the validator's final audit of draft 4.2
// (illustrations/actor-handoff-demo/draft-4-validator-2026-10-18/final-audit-4.2.md). Run: node tools/s3/check_draft_4_3.cjs [out.json]
// R-M1 is checked on every rendered panel's text: the corrected statements must be present, and no sentence may release a
// wrong fact for submission. R-m2 measures the rendered map: the wide 6 → 7 wrap starts above stage 6's own column, and at the
// 900–1099px reflow each downward continuation names its source and destination stage. Nothing here runs a product workflow.
const path = require('node:path'); const fs = require('node:fs');
const {chromium} = require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..', '..');
const PAGE = 'file://' + path.join(ROOT, 'problem-1-pathway-setup-and-form-filling', 'solution-1-one-pager.html');
const OUTF = process.argv[2] || path.join(ROOT, 'checks', 'one-pager-draft-4-3-checks-2026-10-19.json');
const SHOTS = process.argv[3] || null;
const results = []; let failed = 0;
function check(id, name, ok, detail) { results.push({id, name, ok: !!ok, detail}); if (!ok) failed++; console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + (ok ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
async function load(b, w, scheme) {
  const ctx = await b.newContext({viewport: {width: w, height: 900}, colorScheme: scheme || 'light'});
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(PAGE); await p.waitForSelector('body[data-ready="true"]'); return {ctx, p, errs};
}
const panelText = p => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('template[id^="tpl-"]')].map(t => [t.id.slice(4), t.content.textContent.replace(/\s+/g, ' ')])));

(async () => {
  const b = await chromium.launch({channel: 'chrome', headless: true});
  const {ctx, p, errs} = await load(b, 1440);
  const T = await panelText(p); const panel = id => T[id] || '';
  const a104 = panel('10.4');

  // ---------------- R-M1: a disproved mapping fault never clears a known wrong fact
  check('R-M1', 'the contradicting acceptance case is gone: no "(the verified fact was wrong)" followed by "keeps its approval"',
    !Object.values(T).some(t => /fact was wrong[^.]*keeps its approval/.test(t)), Object.keys(T).filter(k => /fact was wrong[^.]*keeps its approval/.test(T[k])));
  check('R-M1', '10.4 acceptance, unchanged correct facts: hold released with evidence; an earlier approval stands, subject to every normal submission check (9.5)',
    /finds the mapping right and the facts it reads correct: the hold is released with the evidence; a form approved before the report keeps its approval and can be submitted once every normal submission check passes \(9\.5\)/.test(a104), '');
  check('R-M1', '10.4 acceptance, wrong fact found: only the mapping hold is released; forms reading the fact stay held at approval and submission until 8.1; prepared and checked again; old approvals withdrawn; approved and signed again; unrelated forms keep approvals',
    /mapping right but the partner's verified date of birth wrong: only the mapping hold is released/.test(a104) && /stays held at approval and submission until the agent corrects and verifies it in 8\.1/.test(a104) &&
    /prepared and checked again, their earlier approvals are withdrawn and they are approved again, and signed again where required/.test(a104) && /forms that do not read the date keep their approvals/.test(a104), '');
  check('R-M1', '10.4 rule: releasing the mapping hold does not release forms that read a wrong fact; normal fact correction and approval/signing apply (9.3)',
    /releasing the mapping hold does not release the forms not yet submitted that read that fact/.test(a104) && /approval and any required signing apply to the corrected content \(9\.3\)/.test(a104), '');
  check('R-M1', '10.4 done-when, return route and exception distinguish the mapping hold from the forms held for a wrong fact',
    /Disproved: the mapping hold is released/.test(a104) && /If the investigation finds a wrong fact instead, only the mapping hold is released/.test(a104) &&
    /A wrong fact found instead goes to the agent in 8\.1/.test(a104) && /only the mapping hold is released, with that evidence/.test(a104), '');
  const kept = await p.evaluate(() => { const t = document.getElementById('tpl-10.4'); const li = [...t.content.querySelectorAll('li')].find(l => l.textContent.includes('an approval given earlier is not yet withdrawn')); return li ? li.textContent : ''; });
  check('R-M1', 'keeping an earlier approval during investigation stays labelled "Proposed here", and now applies only when the facts are correct',
    /Proposed here/.test(kept) && /If the mapping stands and the facts it reads are correct/.test(kept), kept.slice(0, 200));
  // each rule, line and cell is read on its own (template text joins list items without a separator), then split into sentences
  const units = await p.evaluate(() => [...document.querySelectorAll('template[id^="tpl-"]')].flatMap(t => [...t.content.querySelectorAll('li, p, td, dd')].filter(e => !e.querySelector('li, p, td, dd')).map(e => [t.id.slice(4), e.textContent.replace(/\s+/g, ' ')])));
  const sentences = units.flatMap(([k, t]) => t.split(/(?<=\.)\s/).map(s => [k, s]));
  const loose = sentences.filter(([, s]) => /wrong fact/i.test(s) && /hold is released/.test(s) && !/(only the mapping hold|stay held|kept held|keeps the forms that read it held|does not release)/.test(s));
  check('R-M1', 'no sentence anywhere releases a hold for a wrong fact without keeping the forms that read it held', loose.length === 0, loose.map(([k, s]) => k + ': ' + s.slice(0, 160)));
  check('R-M1', 'related guards: 9.3 cannot approve and 9.5 does not submit a form kept held for a wrong fact the investigation found',
    /kept held because the investigation found a wrong fact cannot be approved until the fact is corrected in 8\.1/.test(panel('9.3')) && /or that is kept held for a wrong fact the investigation found, is not submitted/.test(panel('9.5')), '');
  check('R-M1', '4.3 and stage 10 say the same: a wrong fact found instead keeps the forms that read it held',
    /a wrong fact found instead is corrected through 8\.1, and the forms that read it stay held until they are approved again, 10\.4/.test(panel('4.3')) &&
    /a wrong fact found instead keeps the forms that read it held until it is corrected \(stage 6\)/.test(panel('st-10')), '');
  check('R-M1', 'the rules R-M1 relies on are unchanged: 8.1 withdraws approvals on a fact change; 9.3 withdraws on a later fact change; 9.5 holds a replacement "needs review"',
    /Changing the partner's date of birth re-renders every form that reads it and withdraws their approvals/.test(panel('8.1')) &&
    /a later fact change or any change to the approved content withdraws it/.test(panel('9.3')) && /no form of this filing reads a fact with a replacement 'needs review'/.test(panel('9.5')), '');
  check('R-M1', 'the confirmed-error route is unchanged: other cases\' approved forms are marked "mapping under correction" and lose their approval',
    /that form is marked 'mapping under correction', its approval is withdrawn and it cannot be submitted until the case adopts the corrected version or staff complete it by hand/.test(a104), '');
  check('Load', 'no page errors at 1440', errs.length === 0, errs);
  await ctx.close();

  // ---------------- R-m2: continuation arrows start from their real source
  const expectRoutes = ['(stage 2 → stage 3)', '(stage 4 → stage 5)', '(stage 6 → stage 7)', '(stage 8 → stage 9)', '(stage 11 → stage 12)'];
  for (const w of [960, 1280, 1440, 1920]) for (const scheme of ['light', 'dark']) {
    const d = await load(b, w, scheme); const tag = `${w}px ${scheme}`;
    const m = await d.p.evaluate(() => {
      const r = e => e.getBoundingClientRect(); const cx = e => { const q = r(e); return q.left + q.width / 2; };
      const wrap = document.querySelector('#overview .mwrap'); const vis = wrap && getComputedStyle(wrap).display !== 'none';
      const out = {wrapVisible: vis, routes: [...document.querySelectorAll('#overview .marr .hs')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.textContent),
        hsColour: [...document.querySelectorAll('#overview .marr .hs')].map(x => getComputedStyle(x).color === getComputedStyle(x.parentElement.querySelector('.hl')).color).every(Boolean),
        hsOver: [...document.querySelectorAll('#overview .marr .hs')].filter(x => getComputedStyle(x).display !== 'none' && x.getBoundingClientRect().right > x.closest('.marr').getBoundingClientRect().right + 1).length,
        sw: document.documentElement.scrollWidth, iw: innerWidth};
      if (vis) {
        const before = getComputedStyle(wrap, '::before'), wr = r(wrap);
        out.riser = Math.round(wr.right - parseFloat(before.right)); out.foot = Math.round(wr.left + parseFloat(before.left));
        out.s6 = Math.round(cx(document.getElementById('st-6'))); out.s5 = Math.round(cx(document.getElementById('st-5'))); out.s7 = Math.round(cx(document.getElementById('st-7')));
      }
      return out;
    });
    check('R-m2', `${tag}: no sideways page scroll`, m.sw <= m.iw, {sw: m.sw, iw: m.iw});
    if (w < 1100) {
      check('R-m2', `${tag}: every downward continuation names its source and destination stage`, JSON.stringify(m.routes) === JSON.stringify(expectRoutes), m.routes);
      check('R-m2', `${tag}: the stage cue uses the handoff label's colour and stays inside its arrow row`, m.hsColour && m.hsOver === 0, m);
      if (SHOTS) for (const band of ['setup', 'case']) await d.p.locator(`#overview .band-${band}`).screenshot({path: path.join(SHOTS, `${w}-${scheme}-${band}.png`)});
    } else {
      check('R-m2', `${tag}: the 6 → 7 wrap rises above stage 6's own column (within 6px), not stage 5's, and lands on stage 7`,
        m.wrapVisible && Math.abs(m.riser - m.s6) <= 6 && Math.abs(m.riser - m.s5) > 40 && Math.abs(m.foot - m.s7) <= 6, m);
      check('R-m2', `${tag}: stage cues are hidden where arrows run along the row`, m.routes.length === 0, m.routes);
      if (SHOTS && scheme === 'light') await d.p.locator('#overview .band-case').screenshot({path: path.join(SHOTS, `${w}-${scheme}-case.png`)});
    }
    await d.ctx.close();
  }
  const ph = await load(b, 375);
  const phone = await ph.p.evaluate(() => ({hs: [...document.querySelectorAll('#overview .marr .hs')].filter(x => getComputedStyle(x).display !== 'none').length, sw: document.documentElement.scrollWidth, iw: innerWidth}));
  check('R-m2', '375px phone: unchanged one-column arrows (no stage cue shown, no sideways scroll)', phone.hs === 0 && phone.sw <= phone.iw, phone);
  await ph.ctx.close();
  await b.close();
  fs.writeFileSync(OUTF, JSON.stringify({page: PAGE, checked_at: new Date().toISOString(), passed: results.length - failed, total: results.length, results}, null, 1));
  console.log(`${results.length - failed}/${results.length} passed`); process.exit(failed ? 1 : 0);
})();
