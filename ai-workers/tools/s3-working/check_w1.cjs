// Targeted checks for working edition W1 (19 Oct 2026): AIW-D251–D254, the D253 history rule and the row 13 term,
// read from the rendered working page's panels and stage cards. Run: node tools/s3-working/check_w1.cjs [out.json] [shots dir]
// Checks wording and presence on the page only; nothing here runs a product workflow.
const path = require('node:path'); const fs = require('node:fs');
const {chromium} = require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..', '..');
const PAGE = 'file://' + path.join(ROOT, 'problem-1-pathway-setup-and-form-filling', 'solution-1-one-pager-working.html');
const OUTF = process.argv[2] || path.join(ROOT, 'checks', 'working-edition', 'check_w1.json');
const SHOTS = process.argv[3] || null;
const results = []; let failed = 0;
function check(id, name, ok, detail) { results.push({id, name, ok: !!ok, detail}); if (!ok) failed++; console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + (ok ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
async function load(b, w, scheme) {
  const ctx = await b.newContext({viewport: {width: w, height: 900}, colorScheme: scheme || 'light'});
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(PAGE); await p.waitForSelector('body[data-ready="true"]'); return {ctx, p, errs};
}
const panelText = p => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('template[id^="tpl-"]')].map(t => [t.id.slice(4), t.content.textContent.replace(/\s+/g, ' ')])));
const bodyText = p => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

(async () => {
  const b = await chromium.launch({channel: 'chrome', headless: true});
  const {ctx, p, errs} = await load(b, 1440);
  const T = await panelText(p); const panel = id => T[id] || ''; const all = Object.values(T).join(' ') + ' ' + await bodyText(p);

  // ---------- D251: one workspace, flagged first, section confirmation never verifies unresolved items
  const a81 = panel('8.1');
  check('D251', '8.1: one workspace by person and section; conflicts and uncertain values first, deduplicated, with sources; AI-read values marked',
    /One staff workspace grouped by person and section; conflicts and uncertain values come first, deduplicated, each with its source evidence beside it; AI-read values are visibly marked/.test(a81), '');
  check('D251', '8.1: section confirmation needs no per-AI-value acknowledgement and never marks an unresolved item verified',
    /without a separate acknowledgement for each AI-read value/.test(a81) && /a section confirmation never marks it verified/.test(a81), '');
  check('D251', '8.1: per-fact provenance, status and confirmation history kept underneath', /Per-fact provenance, status and confirmation history stay underneath/.test(a81), '');
  check('D251', 'no "verifies each fact once", "least certain first" or "verified one at a time" anywhere', !/verifies each fact once|least certain first|facts are verified one at a time/i.test(all), '');
  check('D251', 'stage 6 card says the agent confirms facts section by section, flagged first', /confirms facts section by section, flagged first/.test(panel('st-6') + all), '');

  // ---------- D252: information, mapping or not sure
  const a84 = panel('8.4'), a82 = panel('8.2');
  check('D252', '8.2: a form fix shows person, shared fact and source, then asks information, mapping or not sure',
    /first shows the field's person, shared fact and source, then asks what is wrong: the information .* the mapping .* or not sure/.test(a82), '');
  check('D252', '8.4: information wrong updates the case fact; profile update separate and unchecked; signed and filed versions preserved',
    /the confirmed case fact is updated; updating the client's profile is a separate choice, unchecked by default/.test(a84) && /signed and filed versions are preserved unchanged/.test(a84), '');
  check('D252', '8.4: mapping wrong stays on the form, shared facts untouched, reported automatically; not sure changes nothing shared',
    /the reviewed correction stays on this form only, shared facts are untouched, and the mapping issue is reported to Expat Ready automatically/.test(a84) && /Not sure: no shared fact changes/.test(a84), '');
  check('D252', '8.4: filling again keeps manual corrections and flags them when their source fact, mapping or edition changes',
    /Filling again keeps intentional manual corrections; when a correction's source fact, mapping or form edition changes, it is flagged for review/.test(a84), '');
  check('D252', 'no "fixes the fact, never the field" anywhere', !/fixes the fact, never the field|never a field or a mapping/.test(all), '');
  check('D252', 'stage 7 decision offers Wrong information, Wrong mapping, Not sure and All clear',
    /Wrong information/.test(all) && /form-only correction; issue reported to Expat Ready/.test(all) && /Not sure/.test(all), '');
  check('D252/D253', '10.4 and 9.3: a reviewed form-only correction lets the reporting case continue while the mapping issue stays reported',
    /a reviewed form-only correction of the affected field \(8\.4\) resolves that form's output/.test(panel('10.4')) && /carries a reviewed form-only correction \(8\.4\) may be approved/.test(panel('9.3')), '');

  // ---------- D253: few hard stops, waivers with reasons, history gap is a warning
  check('D253', 'Blocked = required validation failed, material fact missing or in conflict, or person uncertain; resolved, never waived',
    /the form's required validation failed, a material fact is missing or in conflict, or the person a value belongs to is uncertain; resolve it with a recorded, evidence-based decision/.test(a84), '');
  check('D253', 'Critical warning passed only with the waive permission and a recorded reason shown to the representative; never marks verified',
    /a holder of the waive permission passes it with a recorded reason, shown to the representative; a waiver never marks information verified/.test(a84), '');
  check('D253', '9.3: the representative sees every waived Critical warning with its reason', /sees every waived Critical warning with its reason/.test(panel('9.3')), '');
  check('D253', 'no "cannot be waived" and no history-gap block anywhere', !/cannot be waived|history gap longer than allowed blocks|history gaps block submission/i.test(all), '');
  check('D253 history', '3.8: a history gap is a warning met by recording the period, citing the official instruction',
    /A history gap is a warning, not a stop/.test(panel('3.8')) && /Do not leave gaps\. If retired, not working or studying, please indicate/.test(panel('3.8')), '');

  // ---------- D254: SME duty, Platform Owner self-approval refused
  check('D254', 'the SME is a duty assigned to a Content publisher, not a seventh role', /duty assigned to a (qualified )?Content publisher/.test(all) && !/Super Admin role \(proposed\)|not one of today's staff roles: it is proposed/.test(all), '');
  check('D254', '5.3: the author or submitter cannot approve or publish, the Platform Owner included', /The same applies when the author or submitter is the Platform Owner/.test(panel('5.3')), '');

  // ---------- Row 13 and labels
  check('Row 13', 'AI step named Writer (formerly Drafter)', /Writer \(formerly Drafter\)/.test(all), '');
  check('Label', 'page states it is working edition W1 and not accepted', /working edition W1/.test(all) && /not accepted/.test(all), '');
  check('Load', 'no page errors at 1440', errs.length === 0, errs);

  if (SHOTS) {
    fs.mkdirSync(SHOTS, {recursive: true});
    for (const id of ['8.1', '8.4', '3.8', '9.3', '5.3']) {
      await p.evaluate(i => S1.open(i), id); await p.waitForTimeout(300);
      await p.locator('#insp').screenshot({path: path.join(SHOTS, `1440-light-panel-${id}.png`)});
    }
  }
  await ctx.close();

  for (const [w, scheme] of [[960, 'dark'], [375, 'light']]) {
    const d = await load(b, w, scheme);
    check('Load', `no page errors at ${w} ${scheme}`, d.errs.length === 0, d.errs);
    const wide = await d.p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    check('Layout', `no sideways page scroll at ${w} ${scheme}`, wide, '');
    if (SHOTS) {
      await d.p.locator('#overview .band-case').screenshot({path: path.join(SHOTS, `${w}-${scheme}-case.png`)});
      await d.p.evaluate(() => S1.open('8.4')); await d.p.waitForTimeout(300);
      await d.p.screenshot({path: path.join(SHOTS, `${w}-${scheme}-panel-8.4.png`)});
    }
    await d.ctx.close();
  }
  await b.close();
  fs.writeFileSync(OUTF, JSON.stringify({page: PAGE, checked_at: new Date().toISOString(), passed: results.length - failed, total: results.length, results}, null, 1));
  console.log(`${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})();
