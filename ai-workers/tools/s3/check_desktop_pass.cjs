// Targeted checks for the draft 4.2 correction and desktop pass (18 Oct 2026). Run: node tools/s3/check_desktop_pass.cjs
// C-M1–C-M3 are checked on the generated BPMN (gateway type, default attribute, condition expressions) and on every rendered
// panel's text, not only by finding a corrected sentence: a check also fails if any contradicting wording is still on the page.
// Layout checks measure the rendered desktop page at 960, 1280, 1440 and 1920px in both themes. None of this runs a product
// workflow; it shows that the explanatory model and the page agree with themselves.
// Writes checks/one-pager-draft-4-2-desktop-pass-checks-2026-10-18.json.
const path = require('node:path'); const fs = require('node:fs');
const {chromium} = require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..', '..');
const PAGE = 'file://' + path.join(ROOT, 'problem-1-pathway-setup-and-form-filling', 'solution-1-one-pager.html');
const results = []; let failed = 0;
function check(id, name, ok, detail) { results.push({id, name, ok: !!ok, detail}); if (!ok) failed++; console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + (ok ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
async function load(b, w, scheme) {
  const ctx = await b.newContext({viewport: {width: w, height: 900}, colorScheme: scheme || 'light'});
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(PAGE); await p.waitForSelector('body[data-ready="true"]'); return {ctx, p, errs};
}
// the full text of every activity and stage panel, from the page's own templates
const panelText = p => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('template[id^="tpl-"]')].map(t => [t.id.slice(4), t.content.textContent.replace(/\s+/g, ' ')])));

(async () => {
  const b = await chromium.launch({channel: 'chrome', headless: true});
  const {ctx, p, errs} = await load(b, 1440);
  const X = await p.evaluate(() => JSON.parse(document.getElementById('dg-data').textContent).views);
  const all = await p.evaluate(() => { let s = document.body.innerText; document.querySelectorAll('template').forEach(t => { const d = document.createElement('div'); d.append(t.content.cloneNode(true)); s += ' ' + d.textContent; }); return s.replace(/\s+/g, ' '); });
  const T = await panelText(p);
  const panel = id => T[id] || '';
  check('setup', 'panel text extracted for activities and stages', Object.keys(T).length >= 50, Object.keys(T).length);

  // ---------------- C-M2: view 4's inclusive gateway has no default; both conditions can apply
  const v4 = X.v4.xml;
  const gw = (v4.match(/<bpmn:inclusiveGateway[^>]*id="X9"[^>]*>/) || [''])[0];
  const flows = [...v4.matchAll(/<bpmn:sequenceFlow id="([^"]+)" name="([^"]*)" sourceRef="X9" targetRef="([^"]+)">(.*?)<\/bpmn:sequenceFlow>/g)].map(m => ({id: m[1], name: m[2], to: m[3], cond: /conditionExpression/.test(m[4])}));
  check('C-M2', 'view 4 X9 is an inclusive gateway with no default flow', gw && !/ default=/.test(gw), gw);
  check('C-M2', 'X9 has two conditioned branches: ready forms continue (to view 6) and a client gap returns to the SQR (7.2)',
    flows.length === 2 && flows.every(f => f.cond) && flows.some(f => f.to === 'L4b' && /ready/i.test(f.name)) && flows.some(f => f.to === 'A_7_2' && /missing/i.test(f.name)), flows);
  const incl = Object.entries(X).flatMap(([v, d]) => [...d.xml.matchAll(/<bpmn:inclusiveGateway[^>]*>/g)].map(m => ({v, g: m[0]})));
  check('C-M2', 'no inclusive gateway in any view uses a default that would suppress a branch that should run alongside (only X9 changed; others keep a true "otherwise" path)',
    incl.filter(x => / default=/.test(x.g)).every(x => !/id="X9"/.test(x.g)), incl.map(x => x.v + ':' + (x.g.match(/id="([^"]+)"/) || [])[1] + (/ default=/.test(x.g) ? '(default)' : '')));
  check('C-M2', '8.1 shows the worked example of both branches at once: a ready form goes on while the partner\'s missing answer is asked',
    /Ready and missing at the same time/.test(panel('8.1')) && /At the same time, missing/.test(panel('8.1')) && /Only the forms that read the partner's previous address wait/.test(panel('8.1')), '');
  check('C-M2', 'the old default label "Facts ready for forms" is gone from the model', !X.v4.xml.includes('Facts ready for forms'), '');

  // ---------------- C-M1: hold at suspicion
  check('C-M1', 'no page text holds a suspected mapping error only "once confirmed"', !/once confirmed, the mapping and its dependent work are held/.test(all), '');
  check('C-M1', '4.3: a suspected material mapping error is held from that moment, pending investigation; affected forms cannot be approved or submitted; unrelated work continues',
    /suspected material mapping error: from that moment the mapping and its dependent work are held pending investigation \(10\.4\)/.test(panel('4.3')) && /cannot be approved or submitted; unrelated work stays usable/.test(panel('4.3')), '');
  check('C-M1', '4.3: disproved → hold released with evidence; confirmed → existing correction route (10.2, 10.3)', /hold is released and the evidence recorded/.test(panel('4.3')) && /re-publishing \(10\.2\) and adoption \(10\.3\)/.test(panel('4.3')), '');
  const a104 = panel('10.4');
  check('C-M1', '10.4: held from the moment it is suspected; investigated; confirmed → mapping under correction; disproved → released', /from the moment it is suspected/.test(a104) && /mapping under investigation/.test(a104) && /mapping under correction/.test(a104) && /Disproved: the (mapping )?hold is released/.test(a104), '');
  check('C-M1', '10.4: an ordinary question holds nothing (no material hold for every ticket)', /holds nothing/.test(a104), '');
  check('C-M1', 'release and submission guards: 9.3 cannot approve and 9.5 cannot submit a form whose mapping is held for investigation', /mapping held for investigation \(10\.4\) cannot be approved/.test(panel('9.3')) && /held for investigation or marked 'mapping under correction'/.test(panel('9.5')), '');
  check('C-M1', 'view 7: "Mapping stands" ends with the hold released', X.v7.xml.includes('Mapping stands; hold released'), '');
  check('C-M1', 'stage 10 states the suspicion-time hold', /suspected wrong mapping is held at once/.test(panel('st-10')), '');

  // ---------------- C-M3: one fact-state contract
  check('C-M3', 'the contradicting phrase "a missing or held fact stops it at review" is gone everywhere', !/missing or held fact stops it at review/.test(all), '');
  check('C-M3', '8.1: missing/conflict → preview, stops at 8.4 before filling; Held with a verified value → filled, held at approval and submission; no verified value → missing',
    /rendered as a preview, but stops at review \(8\.4\), before filling/.test(panel('8.1')) && /have a verified value is prepared and filled from that value, but held at approval and submission/.test(panel('8.1')) && /without a verified value the fact counts as missing/.test(panel('8.1')), '');
  check('C-M3', '8.2: trigger and rules agree (Held with a verified value proceeds; missing/conflict previews and stops at 8.4; no verified value = needs a fact)',
    /Held with a verified value/.test(panel('8.2')) && /stops at review \(8\.4\), before filling/.test(panel('8.2')) && /prepared, checked and filled with that verified value/.test(panel('8.2')) && /treated as missing/.test(panel('8.2')), '');
  check('C-M3', '8.4: Held fields go on to filling; approval and submission wait for 8.1', /Held fields go on to filling with their verified value/.test(panel('8.4')) && /holds approval and submission until 8\.1 resolves it/.test(panel('8.4')), '');
  check('C-M3', '9.1: the prerequisite allows a Held field filled from its verified value', /a Held field is filled with its verified value; approval stays held/.test(panel('9.1')), '');
  check('C-M3', 'stage 6 decision and view 6 start state the same boundary', /with a verified value/.test(panel('st-6')) && /counts as missing/.test(panel('st-6')) && X.v6.xml !== undefined, '');
  const v6s = await p.evaluate(() => document.getElementById('view-v6').textContent);
  check('C-M3', 'view 6 "starts" text: missing or conflicting stops at review (8.4); Held is filled but not approved or submitted', /stops only the forms that read it, at review \(8\.4\); a Held fact with a verified value lets its forms be filled but not approved or submitted/.test(v6s), '');
  check('C-M3', 'no panel says a Held fact stops a form before filling', !Object.values(T).some(t => /(held|'needs review')[^.]{0,60}stops? (it )?at review/i.test(t)), Object.entries(T).filter(([k, t]) => /(held|'needs review')[^.]{0,60}stops? (it )?at review/i.test(t)).map(([k]) => k));

  // ---------------- tooltip defect and decision semantics
  const tips = await p.evaluate(() => [...document.querySelectorAll('[data-tip]')].map(e => e.getAttribute('data-tip')));
  check('Tip', "the per-filing tooltip is complete: \"Per-filing mark: each applicant's filing moves on its own\"", tips.includes("Per-filing mark: each applicant's filing moves on its own") && !tips.includes('Per-filing mark: each applicant'), tips.filter(t => t.startsWith('Per-filing')));
  check('Tip', 'no tooltip attribute is cut at an apostrophe (every apostrophe-containing source tip survives whole)', tips.every(t => !/ (each|the|a) applicant$/.test(t)) && tips.some(t => t.includes("’") || t.includes("'")), '');
  await p.locator('#st-8 .mruns').scrollIntoViewIfNeeded(); await p.hover('#st-8 .mruns'); await p.waitForTimeout(450);
  const ht = await p.evaluate(() => !document.getElementById('tip').hidden && document.getElementById('tip').textContent);
  check('Tip', 'hovering the per-filing mark shows the full sentence', ht && ht.includes("filing moves on its own"), ht);
  const gt = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#overview .mgate')].map(g => [g.querySelector('.qq').textContent, g.querySelector('.q').getAttribute('data-tip')])));
  check('Tip', 'decision tooltips: combined outcomes after a recorded decision say they apply together; a yes/no change check says exactly one',
    /apply together/.test(gt['What follows a recorded decision?'] || '') && /exactly one/.test(gt['Anything changed?'] || ''), gt);
  check('Tip', 'the start mark distinguishes an enquiry from a case', await p.evaluate(() => /no case exists until the firm accepts it/.test(document.querySelector('#st-A .snum.start').dataset.tip)), '');

  // ---------------- language: case initiation, After decision, published as a whole word
  const map = await p.evaluate(() => document.getElementById('overview').innerText);
  check('L', 'case initiation: "Start a new case" with 4A and 4B; "Two ways in" gone', /Start a new case/i.test(map) && map.includes('4A') && map.includes('4B') && !/two ways in/i.test(all), '');
  check('L', '4A says no case exists before the firm accepts the enquiry; the known person links to the existing record', /no case is created/.test(map) && /linked to the existing record/.test(map), '');
  check('L', 'stage 9 hands off to After decision; case closure is a separate line; no "End." shortcut on the case band',
    await p.evaluate(() => { const e = document.querySelector('.band-case .mend'); return e && e.classList.contains('mcont') && /After decision/.test(e.textContent) && /closes when every filing is closed/.test(e.querySelector('.mend-c').textContent) && !/End\./.test(e.textContent); }), '');
  check('L', "'Good to know' replaced by 'Key rules'; 5.3 names the country pack, not a pathway version", !/Good to know/.test(all) && !/one pathway version/.test(all) && /new version of the country pack/.test(panel('5.3')), '');
  check('L', 'IRCC named in the Canadian example', /Immigration, Refugees and Citizenship Canada \(IRCC\)/.test(all), '');
  check('L', 'activity 1.1 names the content publisher and the base forms; conditional forms are not found by hand', /content publisher creates/.test(panel('1.1')) && /base government forms/.test(panel('1.1')) && /not found by hand/.test(panel('1.1')), '');
  check('L', 'the legal caveat keeps its exact words where used', all.includes('Unconfirmed: no counsel (AIW-D94)') || all.includes("Unconfirmed: no counsel"), '');
  check('Load', 'no page errors at 1440', errs.length === 0, errs);
  await ctx.close();

  // ---------------- desktop layout, both themes
  const lum = c => { const srgb = c.startsWith('color(srgb'); const m = c.match(/[\d.]+/g).map(Number).slice(0, 3).map(v => { v = srgb ? v : v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
  for (const w of [960, 1280, 1440, 1920]) for (const scheme of ['light', 'dark']) {
    const d = await load(b, w, scheme);
    const m = await d.p.evaluate(() => {
      const r = e => e.getBoundingClientRect();
      const hl = [...document.querySelectorAll('#overview .marr .hl')].filter(x => x.offsetParent);
      const bandRows = [...document.querySelectorAll('#overview .band')].map(bd => { const g = bd.querySelector('.mgrid'); return {cols: getComputedStyle(g).gridTemplateColumns.split(' ').length}; });
      const ends = [...document.querySelectorAll('#overview .mend')].map(e => { const prev = e.previousElementSibling, card = prev && prev.previousElementSibling; return {dy: card ? Math.round(r(e).top - r(card).top) : 99, dx: card ? Math.round(r(e).left - r(card).right) : 999}; });
      // text colours actually used for actor names, side tags, muted text and decision text, with the background behind them
      const bg = e => { while (e) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; e = e.parentElement; } return getComputedStyle(document.body).backgroundColor; };
      const pairs = [...document.querySelectorAll('#overview .mwho b, #overview .side, #overview .mlab, #overview .mgate li span, #overview .marr .hl, #overview .mend p, #overview .ak, .akey')].slice(0, 400).map(e => [getComputedStyle(e).color, bg(e), e.className || e.tagName]);
      return {sw: document.documentElement.scrollWidth, iw: innerWidth, hl: hl.map(x => ({t: x.textContent, over: x.scrollWidth > x.clientWidth + 1, ow: getComputedStyle(x.parentElement).overflowWrap, hy: getComputedStyle(x.parentElement).hyphens})),
        bandRows, ends, pairs, nodeOver: [...document.querySelectorAll('#overview .mnode, #overview .mend')].filter(n => n.scrollWidth > n.clientWidth + 1).map(n => n.id || n.className)};
    });
    const tag = `${w}px ${scheme}`;
    check('D', `${tag}: no sideways page scroll`, m.sw <= m.iw, {sw: m.sw, iw: m.iw});
    check('D5', `${tag}: every handoff label is whole words (no hyphen splits, no clipping)`, m.hl.length >= 12 && m.hl.every(h => !h.over && h.ow === 'normal' && h.hy === 'none'), m.hl.filter(h => h.over || h.ow !== 'normal'));
    check('D1', `${tag}: map grid is ${w < 1100 ? 'two cards per line (3 tracks)' : 'four cards per line (7 tracks)'}`, m.bandRows.every(x => x.cols === (w < 1100 ? 3 : 7)), m.bandRows);
    check('D3', `${tag}: each end or handoff strip is attached: level with the previous card (≤ 4px) and beside its arrow`, m.ends.length === 3 && m.ends.every(e => Math.abs(e.dy) <= 4 && e.dx >= 0 && e.dx <= 100), m.ends);
    check('D6', `${tag}: no card or strip text overflows`, m.nodeOver.length === 0, m.nodeOver);
    const low = m.pairs.map(([c, g, k]) => { const a = lum(c), z = lum(g); return {k, c, g, r: Math.round(100 * (Math.max(a, z) + 0.05) / (Math.min(a, z) + 0.05)) / 100}; }).filter(x => x.r < 4.5);
    check('D7', `${tag}: actor names, side tags, labels and decision text reach 4.5:1 contrast on their backgrounds`, low.length === 0, low.slice(0, 8));
    if (w === 960 && scheme === 'light') {
      await d.p.locator('#st-6 .det').scrollIntoViewIfNeeded(); await d.p.click('#st-6 .det'); await d.p.waitForTimeout(150);
      const v = await d.p.evaluate(() => { const g = document.getElementById('st-6').getBoundingClientRect(), i = document.getElementById('insp'); const hit = document.elementFromPoint(g.left + 30, g.top + 20);
        return {modal: i.getAttribute('aria-modal'), covered: i.contains(hit), w: Math.round(i.getBoundingClientRect().width), sel: document.getElementById('st-6').classList.contains('sel'),
          story: [...document.querySelectorAll('#insp .story tr')].map(tr => getComputedStyle(tr).display)}; });
      check('D6', '960px: the details open as a side panel that leaves the selected stage visible; the story reads one actor per row', v.modal === 'false' && !v.covered && v.sel && v.w <= 470 && v.story.length >= 3 && v.story.every(s => s === 'grid'), v);
      await d.p.keyboard.press('Escape');
      const f = await d.p.evaluate(() => ({hidden: document.getElementById('insp').hidden, f: document.activeElement && document.activeElement.dataset.card}));
      check('D6', '960px: Escape closes and returns focus to the stage', f.hidden && f.f === 'st-6', f);
    }
    if (w === 1920 && scheme === 'light') {
      await d.p.locator('#st-6 .det').click(); await d.p.waitForTimeout(150);
      const v = await d.p.evaluate(() => ({docked: document.body.classList.contains('docked'), w: Math.round(document.getElementById('insp').getBoundingClientRect().width), right: Math.round(document.querySelector('main').getBoundingClientRect().right), il: Math.round(document.getElementById('insp').getBoundingClientRect().left)}));
      check('D6', '1920px: the wider details pane docks beside the page without covering it', v.docked && v.w >= 520 && v.right <= v.il, v);
    }
    await d.ctx.close();
  }
  await b.close();
  fs.writeFileSync(path.join(ROOT, 'checks', 'one-pager-draft-4-2-desktop-pass-checks-2026-10-18.json'), JSON.stringify({page: PAGE, results}, null, 1));
  console.log(`${results.length - failed}/${results.length} passed`); process.exit(failed ? 1 : 0);
})();
