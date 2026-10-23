// Browser checks for the Solution 1 one-pager, draft 3 (annotated process map). Run: node tools/s3/check_one_pager.cjs
// Uses the local Playwright install and Chrome. Writes checks/one-pager-draft-3-browser-checks-2026-10-17.json and screenshots.
const path = require('node:path'); const fs = require('node:fs');
const {chromium} = require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..', '..');
const PAGE = 'file://' + path.join(ROOT, 'problem-1-pathway-setup-and-form-filling', 'solution-1-one-pager.html');
const OUT = path.join(ROOT, 'checks');
const results = []; let failed = 0;
function check(name, ok, detail) { results.push({name, ok: !!ok, detail}); if (!ok) failed++; }

async function load(browser, opts) {
  const ctx = await browser.newContext(opts);
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(PAGE + (opts.hash || '')); await p.waitForSelector('body[data-ready="true"]', {timeout: 30000});
  return {ctx, p, errs};
}
const scrollState = p => p.evaluate(() => ({y: Math.round(window.scrollY), x: [...document.querySelectorAll('.dg-scroll')].map(d => d.scrollLeft)}));

(async () => {
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  for (const [w, h] of [[1440, 900], [1280, 800], [768, 1024], [375, 812]]) {
    for (const scheme of ['light', 'dark']) {
      const {ctx, p, errs} = await load(browser, {viewport: {width: w, height: h}, colorScheme: scheme, hasTouch: w < 1000, isMobile: w < 600});
      const m = await p.evaluate(() => ({sw: document.documentElement.scrollWidth, iw: window.innerWidth,
        bg: getComputedStyle(document.body).backgroundColor,
        dgs: [...document.querySelectorAll('.dg')].map(d => ({id: d.id, cw: d.querySelector('.djs-container') ? d.querySelector('.djs-container').getBoundingClientRect().width : 0,
          vb: d.querySelector('svg') ? d.querySelector('svg').getAttribute('viewBox') : null, err: d.dataset.error || null})),
        dgVisible: [...document.querySelectorAll('.dg-scroll')].filter(x => x.offsetParent !== null && !x.closest('details:not([open])')).length,
        listVisible: [...document.querySelectorAll('.listwrap')].filter(x => !x.hidden).length,
        panelBg: getComputedStyle(document.querySelector('.dg-scroll')).backgroundColor}));
      check(`${w}px ${scheme}: no console errors`, errs.length === 0, errs.slice(0, 3));
      // navigation: at most 15% of the viewport height, and a jumped-to heading sits below it
      const navH = await p.evaluate(() => document.querySelector('.nav').getBoundingClientRect().height);
      check(`${w}px ${scheme}: navigation at most 15% of the screen height`, navH <= 0.15 * h, `${Math.round(navH)}px of ${h}px`);
      for (const target of ['view-v5', 'evidence']) {
        if (w >= 1000) await p.click(`.nav a[href="#${target}"]`);
        else await p.selectOption('.nav select', target);
        await p.waitForTimeout(250);
        const pos = await p.evaluate(t => ({navB: document.querySelector('.nav').getBoundingClientRect().bottom,
          hTop: document.querySelector('#' + t + ' h2').getBoundingClientRect().top}), target);
        check(`${w}px ${scheme}: after jumping to #${target} the heading is below the navigation`, pos.hTop >= pos.navB, pos);
      }
      await p.evaluate(() => window.scrollTo(0, 0));
      check(`${w}px ${scheme}: no sideways page scroll`, m.sw <= m.iw, `${m.sw} vs ${m.iw}`);
      check(`${w}px ${scheme}: every diagram imported`, m.dgs.every(d => !d.err), m.dgs.filter(d => d.err));
      if (w >= 1000) check(`${w}px ${scheme}: the seven view diagrams shown at natural size; the technical overview closed`, m.dgVisible === 7 && !(await p.evaluate(() => document.querySelector('details.techov').open)), `${m.dgVisible} visible`);
      else check(`${w}px ${scheme}: lists shown instead of diagrams`, m.dgVisible === 0 && m.listVisible === 8, `${m.dgVisible} diagrams, ${m.listVisible} lists`);
      if (scheme === 'dark') check(`${w}px dark: page dark, diagram panel stays light`, m.bg !== 'rgb(246, 246, 243)' && m.panelBg === 'rgb(255, 255, 255)', `${m.bg} / ${m.panelBg}`);
      if (w === 1440 && scheme === 'light') {
        await p.evaluate(() => { document.querySelector('details.techov').open = true; }); await p.waitForTimeout(200);
        // natural size: container width equals the diagram width from the data
        const nat = await p.evaluate(() => { const D = JSON.parse(document.getElementById('dg-data').textContent);
          return Object.entries(D.views).map(([k, v]) => ({k, w: v.w, cw: Math.round(document.querySelector('#dg-' + k + ' .djs-container').getBoundingClientRect().width)})); });
        check('1440px: every diagram at 100% (container = drawing width, at most 1,240px)', nat.every(n => n.w === n.cw && n.w <= 1240), nat);
        const eyes = await p.$$eval('.eye[data-act]', b => b.length);
        const nActs = await p.evaluate(() => Object.keys(JSON.parse(document.getElementById('dg-data').textContent).acts).length);
        check(`one eye button per activity (${nActs})`, eyes === nActs, eyes);
        await p.screenshot({path: path.join(OUT, 's1-onepager-d3-desktop-top.png')});
        // open from an eye button; the page and map do not move
        await p.locator('#view-v2').scrollIntoViewIfNeeded(); await p.waitForTimeout(150);
        const before = await scrollState(p);
        await p.click('.eye[data-act="3.2"]');
        const s1 = await p.evaluate(() => ({open: !document.getElementById('insp').hidden, h: document.querySelector('#insp h2').textContent,
          focusIn: document.getElementById('insp').contains(document.activeElement), hash: location.hash,
          parts: [...document.querySelectorAll('#insp .card > .psec > h3')].map(h => h.textContent), t: document.getElementById('insp').textContent}));
        check('eye opens the inspector with the activity card', s1.open && s1.h.includes('form field maps') && s1.focusIn, s1);
        check('card reads in order: what it achieves, who acts, before it starts, how it works, result and next; no repeated receiver labels', s1.parts.join('|') === 'What this achieves|Who acts|Before it starts|How it works|Result and what happens next' && !s1.t.includes('Receiving owner') && !s1.t.includes('Next owner') && !s1.t.includes('No screen (background)'), s1.parts);
        check('location hash updated without navigation', s1.hash === '#a=3.2', s1.hash);
        check('opening does not scroll the page or the map', JSON.stringify(before) === JSON.stringify(await scrollState(p)), before);
        // example opens in place, by keyboard
        await p.focus('#insp .ex-btn'); await p.keyboard.press('Enter');
        const ex = await p.evaluate(() => ({exp: document.querySelector('#insp .ex-btn').getAttribute('aria-expanded'), vis: !document.querySelector('#insp .example').hidden,
          label: document.querySelector('#insp .example').textContent.includes('Example')}));
        check('Example opens in the same card by keyboard', ex.exp === 'true' && ex.vis && ex.label, ex);
        await p.locator('#insp').screenshot({path: path.join(OUT, 's1-onepager-d3-inspector-3-2.png')});
        // another selection replaces the content; an unrelated panel's example stays closed; the reader's choice is kept per panel
        await p.click('.eye[data-act="8.3"]');
        const s2 = await p.evaluate(() => ({h: document.querySelector('#insp h2').textContent, n: document.querySelectorAll('#insp').length,
          exp: document.querySelector('#insp .ex-btn').getAttribute('aria-expanded'), sel: document.querySelectorAll('.djs-element.sel').length}));
        check('another selection replaces the card in the same inspector', s2.h.includes('meaning') && s2.n === 1, s2);
        check('an unrelated panel does not open its example because the previous one was open', s2.exp === 'false', s2.exp);
        check('selected activity is outlined on the map', s2.sel === 1, s2.sel);
        // shape click also opens
        await p.locator('#view-v4').scrollIntoViewIfNeeded(); await p.waitForTimeout(100);
        await p.click('#dg-v4 [data-element-id="A_7_3"]', {position: {x: 50, y: 60}});
        check('clicking the shape opens its card', (await p.textContent('#insp h2')).includes('uploaded document'));
        // escape closes, focus returns, map unchanged
        await p.locator('#view-v1').scrollIntoViewIfNeeded(); await p.waitForTimeout(100);
        await p.focus('.eye[data-act="1.2"]'); await p.keyboard.press('Enter');
        const b2 = await scrollState(p);
        await p.keyboard.press('Escape');
        const c = await p.evaluate(() => ({hidden: document.getElementById('insp').hidden, f: document.activeElement && document.activeElement.dataset.act, hash: location.hash}));
        check('Escape closes and returns focus to the eye button', c.hidden && c.f === '1.2' && c.hash === '', c);
        check('closing leaves the page and map where they were', JSON.stringify(b2) === JSON.stringify(await scrollState(p)), b2);
        // hover preview
        await p.hover('.eye[data-act="5.1"]'); await p.waitForTimeout(450);
        const tip = await p.evaluate(() => ({vis: !document.getElementById('tip').hidden, t: document.getElementById('tip').textContent}));
        check('hover preview shows title and Input → Output only', tip.vis && tip.t.includes('→') && !tip.t.includes('Trigger'), tip.t);
        await p.mouse.move(5, 5);
        // close button
        await p.click('.eye[data-act="9.1"]'); await p.click('#insp .closeb');
        check('Close button closes and returns focus', await p.evaluate(() => document.getElementById('insp').hidden && document.activeElement.dataset.act === '9.1'));
        // overview sub-process jumps to its view (technical overview opened above)
        await p.locator('#overview-bpmn').scrollIntoViewIfNeeded();
        await p.click('#dg-v0 [data-element-id="O_v5"]', {position: {x: 20, y: 20}});
        await p.waitForFunction(() => { const t = document.getElementById('view-v5').getBoundingClientRect().top; return t >= 0 && t < 300; }, null, {timeout: 4000}).catch(() => {});
        const top = await p.evaluate(() => ({t: Math.round(document.querySelector('#view-v5 h2').getBoundingClientRect().top), nav: Math.round(document.querySelector('.nav').getBoundingClientRect().bottom)}));
        check('overview phase box jumps to its view, heading below the navigation', top.t >= top.nav && top.t < 300, top);
        // matrix button opens
        await p.click('.mx button[data-act="6.3"]');
        check('who-does-what matrix opens the card', (await p.textContent('#insp h2')).includes('Review the lead'));
        await p.keyboard.press('Escape');
        // every card complete in the browser
        const ids = await p.evaluate(() => Object.keys(JSON.parse(document.getElementById('dg-data').textContent).acts));
        const bad = [];
        for (const id of ids) { await p.evaluate(i => S1.open(i), id);
          const r = await p.evaluate(() => ({parts: document.querySelectorAll('#insp .card > .psec > h3').length, steps: document.querySelectorAll('#insp .steps li').length,
            ex: !!document.querySelector('#insp .example figure, #insp .example .ex-exc, #insp .exlinks .fl-link'), next: document.getElementById('insp').textContent.includes('Done when'),
            nested: document.querySelectorAll('#insp details details, #insp .example details').length}));
          if (!(r.parts === 5 && r.steps >= 1 && r.ex && r.next && r.nested === 0)) bad.push({id, ...r}); }
        await p.evaluate(() => S1.close());
        check(`all ${ids.length} activity panels give the five first-view parts, steps, done-when and an example (or a link to one); no disclosure inside another`, bad.length === 0, bad);
        // deep link
        const d = await load(browser, {viewport: {width: 1440, height: 900}, hash: '#a=5.1'});
        check('deep link #a=5.1 opens that card on load', (await d.p.textContent('#insp h2')).includes('new or changed'));
        await d.p.evaluate(() => { document.querySelector('#insp .ex-btn').click(); });
        await d.ctx.close();
      }
      if ((w === 1280 || w === 1440) && scheme === 'light') {
        // the selected shape stays visible beside the open card (3.8, 9.3 and the rightmost shape of views 3, 5 and 6)
        const right = await p.evaluate(() => { const D = JSON.parse(document.getElementById('dg-data').textContent);
          return ['v3', 'v5', 'v6'].map(v => D.views[v].acts.map(a => { const g = document.querySelector('#dg-' + v + ' [data-element-id="' + D.acts[a].node + '"]');
            return {a, r: g ? g.getBoundingClientRect().right : 0}; }).sort((x, y) => y.r - x.r)[0].a); });
        const ids = [...new Set(['3.8', '9.3', ...right])], hidden = [];
        for (const id of ids) {
          const eye = p.locator('.eye[data-act="' + id + '"]').first(); await eye.scrollIntoViewIfNeeded(); await eye.click(); await p.waitForTimeout(120);
          const r = await p.evaluate(i => { const D = JSON.parse(document.getElementById('dg-data').textContent), a = D.acts[i];
            const g = document.querySelector('#dg-' + a.vid + ' [data-element-id="' + a.node + '"]').getBoundingClientRect(), insp = document.getElementById('insp');
            const hit = document.elementFromPoint(g.left + g.width / 2, g.top + g.height / 2);
            return {open: !insp.hidden, covered: insp.contains(hit), side: insp.classList.contains('left') ? 'left' : 'right'}; }, id);
          if (!r.open || r.covered) hidden.push({id, ...r});
        }
        check(`${w}px: selected shape stays visible beside the open card (${ids.join(', ')})`, hidden.length === 0, hidden);
        await p.locator('.eye[data-act="9.2"]').first().click(); await p.waitForTimeout(120);
        const sw = await p.evaluate(() => ({open: !document.getElementById('insp').hidden, h: document.querySelector('#insp h2').textContent}));
        check(`${w}px: another shape can be selected without closing the card`, sw.open && sw.h.includes('validate'), sw);
        await p.keyboard.press('Escape');
      }
      if (w === 1440 && scheme === 'light') {
        // the hover preview can be dismissed with Escape and stays while the pointer is over it
        await p.locator('#view-v2').scrollIntoViewIfNeeded(); await p.hover('.eye[data-act="3.2"]'); await p.waitForTimeout(450);
        const tb = await p.evaluate(() => { const r = document.getElementById('tip').getBoundingClientRect(); return {vis: !document.getElementById('tip').hidden, x: r.left + r.width / 2, y: r.top + r.height / 2}; });
        if (tb.vis) { await p.mouse.move(tb.x, tb.y, {steps: 4}); await p.waitForTimeout(400); }
        const stays = await p.evaluate(() => !document.getElementById('tip').hidden);
        await p.keyboard.press('Escape');
        const gone = await p.evaluate(() => document.getElementById('tip').hidden && document.getElementById('insp').hidden);
        check('hover preview stays while the pointer is on it, and Escape closes it', tb.vis && stays && gone, {tb, stays, gone});
        await p.mouse.move(5, 5);
      }
      if (w === 1280 && scheme === 'light') {
        await p.locator('#view-v5').scrollIntoViewIfNeeded(); await p.waitForTimeout(100);
        await p.screenshot({path: path.join(OUT, 's1-onepager-d3-1280-view5.png')});
      }
      if (w === 375 && scheme === 'light') {
        await p.screenshot({path: path.join(OUT, 's1-onepager-d3-phone-top.png')});
        await p.locator('#view-v5 .listwrap').scrollIntoViewIfNeeded();
        const btn = p.locator('#view-v5 .fl-open[data-act="8.4"]');
        await btn.tap();
        const s = await p.evaluate(() => { const r = document.getElementById('insp').getBoundingClientRect();
          return {open: !document.getElementById('insp').hidden, modal: document.getElementById('insp').getAttribute('aria-modal'), left: Math.round(r.left), w: Math.round(r.width), iw: innerWidth}; });
        check('phone: list item opens a full-width bottom sheet', s.open && s.modal === 'true' && s.left === 0 && s.w === s.iw, s);
        await p.locator('#insp .ex-btn').tap();
        check('phone: Example opens by touch', await p.evaluate(() => !document.querySelector('#insp .example').hidden));
        await p.screenshot({path: path.join(OUT, 's1-onepager-d3-phone-sheet.png')});
        let inside = true;
        for (let i = 0; i < 14; i++) { await p.keyboard.press('Tab'); if (!(await p.evaluate(() => document.getElementById('insp').contains(document.activeElement)))) inside = false; }
        check('phone: keyboard focus stays inside the sheet', inside);
        // the page behind the sheet cannot be clicked or focused while the sheet is open
        const sb = await p.evaluate(() => { const r = document.querySelector('.nav select').getBoundingClientRect(); return {x: r.left + 8, y: r.top + r.height / 2}; });
        await p.mouse.click(sb.x, sb.y); await p.waitForTimeout(100);
        const bg = await p.evaluate(() => ({open: !document.getElementById('insp').hidden, inside: document.getElementById('insp').contains(document.activeElement),
          inert: document.querySelector('main').hasAttribute('inert')}));
        check('phone: clicking the page behind the sheet does nothing; focus stays in the sheet', bg.open && bg.inside && bg.inert, bg);
        await p.locator('#insp .closeb').tap();
        const f = await p.evaluate(() => ({hidden: document.getElementById('insp').hidden, act: document.activeElement && document.activeElement.dataset.act}));
        check('phone: Close returns focus to the list item', f.hidden && f.act === '8.4', f);
        check('phone: closing makes the page usable again', await p.evaluate(() => ![...document.body.children].some(e => e.hasAttribute('inert'))));
        // show the diagram on demand at full size, scrolling sideways inside its frame only
        await p.locator('#view-v5 [data-mode="dg"]').tap(); await p.waitForTimeout(200);
        const dg = await p.evaluate(() => { const s = document.querySelector('#view-v5 .dg-scroll'); return {vis: s.offsetParent !== null, sw: s.scrollWidth, cw: s.clientWidth, page: document.documentElement.scrollWidth, iw: innerWidth}; });
        check('phone: "Diagram" shows the full-size diagram in a sideways-scrolling frame', dg.vis && dg.sw > dg.cw && dg.page <= dg.iw, dg);
      }
      if (w === 1440 && scheme === 'light') {
        // annotated process map: plain language before any BPMN, in reading order
        const j = await p.evaluate(() => { const ov = document.getElementById('overview'), bp = document.getElementById('overview-bpmn');
          const st = [...ov.querySelectorAll('.mnode')];
          return {first: ov.compareDocumentPosition(bp) & Node.DOCUMENT_POSITION_FOLLOWING ? 'map' : 'bpmn',
            order: st.map(s => s.id.slice(3)), bands: ov.querySelectorAll('.band').length,
            strip: [...ov.querySelectorAll('.stagestrip a')].map(x => x.getAttribute('href').slice(4)).join(','),
            who: st.every(s => s.querySelectorAll('.mwho li b').length >= 1), eye: st.every(s => { const e = s.querySelector('.eye.det'); return e && e.dataset.tip && e.getAttribute('aria-label').startsWith('Details') && e.querySelector('svg'); }),
            receivesOnCard: st.some(s => s.textContent.includes('Receives')),
            arrows: [...ov.querySelectorAll('.marr:not(.phone-only) .hl')].map(a => a.textContent.trim()),
            gates: [...ov.querySelectorAll('.mgate')].map(g => ({q: g.querySelector('.qq').textContent, n: g.querySelectorAll('li b').length})),
            otherSvg: [...ov.querySelectorAll('svg')].filter(x => !x.closest('.eye')).length + ov.querySelectorAll('.dg, .key').length, symbolsClosed: !(document.querySelector('details.symbols') || {}).open /* checker minor fix m10: one symbols control */,
            overflow: st.filter(s => s.scrollWidth > s.clientWidth + 1).map(s => s.id),
            store: !!ov.querySelector('#released-package .rread') && ov.querySelector('#released-package').textContent.includes('Read, not sent'),
            wrap: ov.querySelector('.mwrap').textContent, sides: [...ov.querySelectorAll('.side')].map(x => x.textContent),
            tops: (() => { const g = ov.querySelector('.band-case .mgrid'); const hs = [g.querySelector('.mdoors .mnode header'), ...g.querySelectorAll(':scope > .mnode header')].slice(0, 4).map(h => Math.round(h.getBoundingClientRect().top)); return hs; })()}; });
        check('map: plain-language process map comes before the BPMN overview; no symbols to decode beyond the eye', j.first === 'map' && j.otherSvg === 0 && j.symbolsClosed, j.otherSvg);
        check('map: three bands; ways in A and B, then stages 1–12 in reading order; the stage strip lists every stage', j.bands === 3 && j.order.join(',') === '1,2,3,A,B,4,5,6,7,8,9,10,11,12' && j.strip === '1,2,3,A,B,4,5,6,7,8,9,10,11,12', j);
        check('map: every stage names who acts and has an eye button with a tooltip; no receives/does/hands-over prose on the cards', j.who && j.eye && !j.receivesOnCard, j);
        check('map: the first row of the case band starts level (card headers aligned)', Math.max(...j.tops) - Math.min(...j.tops) <= 2, j.tops);
        check('map: every arrow is labelled with its handoff', j.arrows.length >= 12 && j.arrows.every(Boolean) && ['Draft with sources', 'Published configuration', 'Unresolved facts', 'Checked forms', 'Submitted application'].every(t => j.arrows.includes(t)) && j.wrap.includes('Verified facts'), j.arrows);
        check('map: decisions read as questions with at least two labelled outcomes', j.gates.length >= 9 && j.gates.every(g => g.q.trim().endsWith('?') && g.n >= 2), j.gates);
        check('map: the published pack version is a shared record that cases read (not sent per case); the case band wraps 6 → 7 with a labelled connector', j.store && j.wrap.includes('stage 6 → stage 7'), j);
        check('map: actor side shown in words (Super Admin, Firm, Client portal)', ['Super Admin', 'Firm', 'Client portal'].every(t => j.sides.includes(t)), [...new Set(j.sides)]);
        check('map: no card text overflows at 1440px', j.overflow.length === 0, j.overflow);
        const al = await p.evaluate(() => { const lis = [...document.querySelectorAll('#overview .mwho li, #who .wg li')];
          const bad = lis.filter(li => { const k = li.children[0]; if (!k) return true; const lb = k.getBoundingClientRect().left, lt = li.getBoundingClientRect().left; return Math.abs(lb - lt - 23) > 2; });
          return {n: lis.length, bad: bad.length, letters: [...document.querySelectorAll('#overview .snum')].some(x => /^[AB]$/.test(x.textContent)), counts: [...document.querySelectorAll('#who .wn')].map(x => x.textContent)}; });
        check('lists: every numbered actor line has its text in one aligned column; ways in carry no letters; Who is who shows each side\'s count', al.n > 40 && al.bad === 0 && !al.letters && al.counts.join('|') === '3 roles|2 parts|2 roles|1 role|1 party', al);
        // tooltips: the eye, a side tag, a lane tag and a gateway each explain themselves
        await p.locator('#st-3').scrollIntoViewIfNeeded(); await p.hover('#st-3 .det'); await p.waitForTimeout(400);
        const t1 = await p.evaluate(() => !document.getElementById('tip').hidden && document.getElementById('tip').textContent);
        await p.hover('#st-3 .side'); await p.waitForTimeout(400);
        const t2 = await p.evaluate(() => !document.getElementById('tip').hidden && document.getElementById('tip').textContent);
        await p.locator('#view-v3').scrollIntoViewIfNeeded(); await p.hover('#dg-v3 .lanetag >> nth=2'); await p.waitForTimeout(400);
        const t3 = await p.evaluate(() => !document.getElementById('tip').hidden && document.getElementById('tip').textContent);
        const gb = await p.evaluate(() => { const g = document.querySelector('#dg-v3 [data-element-id="X3"]'); g.scrollIntoView({block: 'center'}); const r = g.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2}; });
        await p.mouse.move(gb.x, gb.y); await p.waitForTimeout(450);
        const t4 = await p.evaluate(() => !document.getElementById('tip').hidden && document.getElementById('tip').textContent);
        await p.hover('.eye[data-act="5.1"]'); await p.waitForTimeout(450);
        const t5 = await p.evaluate(() => !document.getElementById('tip').hidden && document.getElementById('tip').textContent);
        check('tooltips: the eye, a side tag, a lane tag, a gateway and a task mark each explain their meaning on hover',
          t1 && t1.includes('Open the details') && t2 && t2.includes('Super Admin') && t3 && t3.includes('Does:') && t4 && t4.includes('Decision mark') && t5 && t5.includes('Person step'), {t1, t2, t3, t4, t5});
        await p.mouse.move(5, 5);
        // stage panel: opens in the same inspector, without moving the page
        await p.locator('#overview').scrollIntoViewIfNeeded();
        await p.locator('#st-5').scrollIntoViewIfNeeded();
        const y0 = await p.evaluate(() => scrollY);
        await p.click('#st-5 .det'); await p.waitForTimeout(150);
        const sp = await p.evaluate(() => ({open: !document.getElementById('insp').hidden, h: document.querySelector('#insp h2').textContent, focus: document.activeElement.id,
          hash: location.hash, bar: document.querySelector('#insp .bar span').textContent, on: document.querySelector('#st-5 .det').classList.contains('on'), sel: document.getElementById('st-5').classList.contains('sel'), y: scrollY,
          rules: [...document.querySelectorAll('#insp .rules li')].map(l => l.textContent), rulesClosed: !document.querySelector('#insp details.sup').open, story: document.querySelectorAll('#insp .story tbody tr').length}));
        check('map: the eye opens the stage card in the side panel, marks the stage selected, page does not move', sp.open && sp.h === 'Reuse verified information' && sp.focus === 'insp-h' && sp.hash === '#c=st-5' && sp.on && sp.sel && sp.y === y0 && sp.story >= 2, sp);
        check('map: stage 5 carries the shared-record selection rules in context, closed until the reader opens them', sp.rules.length >= 12 && sp.rules.some(r => r.includes('never by copying the latest case')) && sp.rulesClosed, sp.rules.length);
        await p.keyboard.press('Escape'); await p.waitForTimeout(80);
        await p.click('#st-5 .mbtn[data-ex="1"]'); await p.waitForTimeout(150);
        const ex = await p.evaluate(() => ({vis: !document.querySelector('#insp .example').hidden, exp: document.querySelector('#insp .ex-btn').getAttribute('aria-expanded'),
          figs: [...document.querySelectorAll('#insp .example figure.ex-cmp')].map(f => ({cap: f.querySelector('figcaption').textContent, rows: f.querySelectorAll('tr.k').length, cols: f.querySelectorAll('thead th').length})),
          details: document.querySelectorAll('#insp .example details').length}));
        check('map: Example opens Client A\'s example as two-column comparisons with each row explained under it (no cramped five-column table, no disclosure inside it)', ex.vis && ex.exp === 'true' && ex.figs.length === 2 && ex.figs[0].rows === 6 && ex.figs[0].cap.includes('invented') && ex.figs[1].rows === 8 && ex.figs.every(f => f.cols === 2) && ex.details === 0, ex);
        const xr = await p.evaluate(() => { const k = document.querySelectorAll('#insp .ex-cmp tr.k')[2], r = document.querySelectorAll('#insp .ex-cmp tr.x')[2]; return {vis: r.offsetParent !== null, t: k.textContent + ' ' + r.textContent}; });
        check('example row explanation is visible in place and shows the passport proposal with readiness pending', xr.vis && xr.t.includes('needs review') && xr.t.includes('not yet verified'), xr.t.slice(0, 160));
        await p.evaluate(() => { document.querySelector('#insp .body').scrollTop = 400; });
        await p.click('#insp .fl-link[data-act="7.1"]'); await p.waitForTimeout(120);
        const a71 = await p.evaluate(() => ({h: document.querySelector('#insp h2').textContent, hash: location.hash, sel: document.querySelectorAll('.djs-element.sel').length,
          figs: [...document.querySelectorAll('#insp .example figcaption')].map(f => f.textContent), exOpen: !document.querySelector('#insp .example').hidden, stageSel: document.querySelectorAll('.mnode.sel').length,
          back: (document.querySelector('#insp .backb') || {}).textContent || ''}));
        check('map: an activity link in the stage card opens that activity in the same panel, with Back to the stage; the stage stays selected', a71.h.includes('Convert the lead') && a71.hash === '#a=7.1' && a71.sel === 1 && a71.stageSel === 1 && a71.back.includes('Stage 5') && a71.back.includes('Reuse verified information'), a71);
        check('case creation card 7.1 carries the same reuse example and scenario matrix, closed until the reader opens it', !a71.exOpen && a71.figs.some(t => t.startsWith('Reusing facts on a new case')) && a71.figs.some(t => t.startsWith('Who starts where')), a71.figs);
        await p.click('#insp .backb'); await p.waitForTimeout(120);
        const bk = await p.evaluate(() => ({h: document.querySelector('#insp h2').textContent, hash: location.hash, exOpen: !document.querySelector('#insp .example').hidden,
          scroll: document.querySelector('#insp .body').scrollTop, focus: document.activeElement.dataset.act, back: !!document.querySelector('#insp .backb'), y: scrollY, stageSel: document.getElementById('st-5').classList.contains('sel')}));
        check('Back returns to the stage with its example still open, its scroll position and focus on the link used; the page does not move', bk.h === 'Reuse verified information' && bk.hash === '#c=st-5' && bk.exOpen && bk.scroll > 300 && bk.focus === '7.1' && !bk.back && bk.y === y0 && bk.stageSel, bk);
        await p.keyboard.press('Escape'); await p.waitForTimeout(80);
        await p.click('#st-B .det'); await p.waitForTimeout(100);
        const dB = await p.evaluate(() => ({h: document.querySelector('#insp h2').textContent, t: document.querySelector('#insp').textContent}));
        check('map: way in B is an existing client opening a new case without a new lead', dB.h === 'Existing client, new service' && dB.t.includes('no new lead') && dB.t.includes('7.1'), dB.h);
        await p.keyboard.press('Escape'); await p.waitForTimeout(80);
        const fB = await p.evaluate(() => ({hidden: document.getElementById('insp').hidden, f: document.activeElement.dataset.card, cls: document.activeElement.className}));
        check('map: Escape closes the stage card and returns focus to its eye button', fB.hidden && fB.f === 'st-B' && fB.cls.includes('eye'), fB);
        await p.click('#who .eye'); await p.waitForTimeout(100);
        const ww = await p.evaluate(() => ({h: document.querySelector('#insp h2').textContent, rows: document.querySelectorAll('#insp tbody tr').length, t: document.querySelector('#insp').textContent,
          groups: [...document.querySelectorAll('#who .wg h4')].map(x => x.textContent)}));
        await p.locator('#records').scrollIntoViewIfNeeded();
        const rec = await p.evaluate(() => ({links: document.querySelectorAll('#records .alink[data-act]').length, key: document.querySelectorAll('#records .tagkey .rtag').length,
          tips: [...document.querySelectorAll('.rtag')].every(t => t.dataset.tip && t.dataset.tip.includes(':')), plain: document.querySelectorAll('#records .plain').length}));
        await p.click('#records .alink[data-act="5.3"]'); await p.waitForTimeout(120);
        const rc = await p.evaluate(() => document.querySelector('#insp h2').textContent); await p.keyboard.press('Escape');
        check('shared records: plain words per record, a key to the rule tags, every tag explained on hover, readers and writers as links that open the card', rec.plain === 6 && rec.key === 4 && rec.tips && rec.links > 80 && rc.includes('Approve and publish'), {rec, rc});
        check('who is who: five sides and every actor with product role, what they do and never do', ww.h === 'Who is who' && ww.rows === 9 && ww.groups.length === 5 && ww.t.includes('Super Admin') && ww.t.includes('Case Manager') && ww.t.includes('proposed'), ww);
        await p.keyboard.press('Escape');
        await p.locator('#view-v4').scrollIntoViewIfNeeded();
        await p.click('#view-v4 .symb'); await p.waitForTimeout(100);
        const sy = await p.evaluate(() => ({h: document.querySelector('#insp h2').textContent, keys: document.querySelectorAll('#insp .key span').length, lanes: document.querySelectorAll('#insp .lanes > span').length}));
        check('every view has a "Diagram symbols" button that opens the legend in the side panel', sy.h.startsWith('Diagram symbols') && sy.keys === 15 && sy.lanes === 9, sy);
        await p.keyboard.press('Escape');
        const dg = await p.evaluate(() => { const D = JSON.parse(document.getElementById('dg-data').textContent);
          return {lanes: document.querySelectorAll('.dg .lanetag').length, nLanes: Object.values(D.views).reduce((n, v) => n + v.lanes.length, 0),
            pools: document.querySelectorAll('.dg .pooltag').length, nPools: Object.values(D.views).reduce((n, v) => n + v.pools.length, 0),
            vertical: [...document.querySelectorAll('.dg [data-element-id^="L_"] > .djs-visual > text, .dg [data-element-id^="P_"] > .djs-visual > text')].filter(t => getComputedStyle(t).display !== 'none').length,
            notes: document.querySelectorAll('.dg [data-element-id^="N_"]').length, group: D.views.v6.xml.includes('Repeats for each filing') && document.querySelectorAll('#dg-v6 [data-element-id="G6"]').length === 1,
            sides: [...document.querySelectorAll('#dg-v3 .atype span')].map(i => i.textContent), types: document.querySelectorAll('.dg .atype').length,
            x15: D.views.v6.xml.includes('Decision recorded?') && D.views.v6.xml.includes('After decision (case workflow)')  /* draft 4 (M1): a decision leads to After decision, not an end */, notesText: [...document.querySelectorAll('.dg [data-element-id^="N_"]')].map(n => n.textContent).join(' | ')}; });
        check('diagrams: every lane and pool named horizontally; actor-type brackets (System, Super Admin, Firm, Client) in the left strip; no rotated names left visible', dg.lanes === dg.nLanes && dg.pools === dg.nPools && dg.vertical === 0 && dg.sides.join('|') === 'System|Super Admin' && dg.types >= 12, dg);
        check('diagrams: business-rule notes only (symbol meanings live in the legend and tooltips); view 6 repeats per filing', dg.notes === 4 && dg.group && dg.x15 && !/side by side|whichever|Runs once/.test(dg.notesText) && dg.notesText.includes('reason alone never clears'), {n: dg.notes, t: dg.notesText});
        const vn = await p.evaluate(() => [...document.querySelectorAll('.vnotes')].map(v => v.querySelectorAll('li').length));
        check('every view lists what happens in it, one line per activity (41 in all)', vn.length === 7 && vn.reduce((a, b) => a + b, 0) === 41, vn);
        const v4 = await p.evaluate(() => { const D = JSON.parse(document.getElementById('dg-data').textContent); return {v4: D.views.v4.xml.includes('Existing client, new service') && /sourceRef="S4b" targetRef="A_7_1"/.test(D.views.v4.xml),
          v0: D.views.v0.xml.includes('Existing client, new service') && /sourceRef="O_S6" targetRef="O_v4"/.test(D.views.v0.xml)}; });
        check('BPMN: view 4 and the overview start an existing client\'s new case at 7.1, not at the lead form', v4.v4 && v4.v0, v4);
        // nomenclature: the team's words on the page
        const nm = await p.evaluate(() => { const t = document.querySelector('main').textContent + [...document.querySelectorAll('template')].map(x => x.content.textContent).join(' ');
          return ['Pathway Configurator', 'released package', 'combination row', 'master field', 'form copy', 'support report', 'government message', 'Licensed representative', 'Immigration specialist', 'Second publisher'].filter(w => t.includes(w)); });
        check('nomenclature: no retired page terms remain (team words: Content Pack Configurator, published pack version, verified, form, support ticket, Lead representative, Immigration SME)', nm.length === 0, nm);
        // scenario walks: documentation coverage checks on the rendered text (they do not execute a fact resolver or fill a form)
        const txt = await p.evaluate(() => { const t = id => document.getElementById('tpl-' + id).content.textContent; return {r: document.getElementById('records').textContent, c71: t('7.1'), c72: t('7.2'), c73: t('7.3'), c81: t('8.1'), c82: t('8.2'), c83: t('8.3'), c84: t('8.4'), c93: t('9.3'), c94: t('9.4'), c95: t('9.5'), c96: t('9.6'), c62: t('6.2'), c63: t('6.3'), s4: t('st-4'), v6: document.getElementById('view-v6').textContent}; });
        const walks = [
          ['no prior case: a new client goes through the lead form, PQR and duplicate check', txt.c71.includes('New client, no record') && txt.c71.includes('Lead form and PQR (6.1)')],
          ['profile but no case: started from the record; only missing, re-confirmation and needed eligibility questions', txt.c71.includes('Existing client, profile only (no earlier case)') && txt.c71.includes('eligibility questions the new service needs that the record cannot answer')],
          ['one prior case: shared facts reused; that case\'s approvals, signatures, receipts and decision not carried', txt.c71.includes('Existing client, one earlier case') && txt.c71.includes("That case's approvals, signatures, receipts, decision, case-only facts and pack version")],
          ['several cases: each fact resolved on its own, never the latest case', txt.c71.includes('several closed or active cases') && txt.r.includes('never by copying the latest case')],
          ['stable verified fact reused and correctable, with no needless review', txt.c71.includes('12 Apr 1990 · verified · reused') && txt.c72.includes('shown for correction, not re-typed') && txt.c81.includes('stable facts with no dispute and no re-confirmation rule need no review')],
          ['current address supersedes a historical one; history is not a conflict; past dates keep past values', txt.c71.includes('Address 1 kept as history') && txt.r.includes('history, not a conflict') && txt.r.includes("today's value never supersedes it")],
          ['J2: verified passport + proposed new number → two statuses; forms that read it not ready until verified or rejected with evidence', txt.c71.includes("proposed: the new number, 'needs review'") && txt.c81.includes('shows two statuses') && txt.c81.includes('rejects the proposal with evidence') && txt.c82.includes("'needs review'") && txt.c93.includes("any field 'needs review' cannot be approved")],
          ['J2: a required re-confirmation stays pending until answered', txt.c81.includes('counts as re-confirmed only once it is answered') && txt.c71.includes("'still true?' pending until answered")],
          ['J3: the matrix is status-specific (missing blank; re-confirmation pending; proposal shows both statuses; conflict shows alternatives, none selected)', txt.c71.includes('Any start: a fact is missing') && txt.c71.includes("marked 'still true?' (pending)") && txt.c71.includes('each with its status; forms that read it: needs review') && txt.c71.includes('none selected for any form') && !txt.c71.includes('Nothing for that fact')],
          ['genuine disagreement: no value selected, a person verifies', txt.c71.includes('No value selected · conflict') && txt.r.includes('nothing is guessed')],
          ['timestamps alone never decide authority', txt.r.includes('does not by itself make a value more authoritative')],
          ['identity: names or email never merge people; resolved identifier used', txt.c62.includes('Matching names or email alone never link two people') && txt.r.includes('never by matching a name or an email')],
          ['permissions and firm boundary apply to every reuse', txt.r.includes('never across firms') && txt.r.includes("role's permissions apply to every reuse")],
          ['documents re-checked against the new case; expiry warnings unchanged', txt.c71.includes("only if this case's checklist item accepts it") && txt.c71.includes('expiry warnings are unchanged')],
          ['opening a case does not alter an earlier case; later shared-fact changes follow the affected-case rules; submitted forms never change', txt.c71.includes('opening it does not alter the earlier case') && txt.s4.includes('opening it does not alter the earlier case') && !txt.c71.includes('the earlier case is never changed') && txt.c71.includes('submitted forms never change')],
          ['no AI selects among verified values', txt.r.includes('rules, not AI') && txt.c71.includes('Choosing among verified values is rules, not AI')],
          ['same person links the record and still asks gaps and differences', txt.c63.includes("'Same person' links the lead to the existing record")],
          ['R1: missing passport + "awaiting client" stays unresolved; a reason alone never clears a checklist item', txt.c95.includes('never clears a required checklist item by itself') && txt.c95.includes('Only the dependent filing waits') && txt.c72.includes('a recorded reason alone does not clear it') && !txt.c95.includes('carries a reason the agent recorded')],
          ['R1: an authorised disposition the rule permits, or a person accepting readable evidence when reading fails, resolves the item', txt.c95.includes('authorised disposition the applicable checklist or rule permits') && txt.c73.includes('the agent may accept readable evidence by looking at it') && txt.c73.includes('does not itself accept the document')],
          ['R2: approval → signature-only change → submission stays possible; a signed upload with a changed birth date does not inherit approval', txt.c93.includes('does not withdraw it: the signed file is linked to the approved content version') && txt.c94.includes('does not inherit the approval') && txt.c94.includes('no answer changes') && !txt.c93.includes('any change to the file withdraws')],
          ['R3: each filing is approved, signed, submitted and decided on its own; principal decided, partner pending → case open; partner can still be signed and submitted', txt.c96.includes('apply to each filing on its own') && txt.c96.includes('Two filings on one case') && txt.c96.includes('open: one filing pending') && txt.c96.includes('every form approved; the partner signs; submitted') && txt.v6.includes('run for each filing on its own')],
          ['8.3/8.4: unavailable AI checker → "not checked by AI", focused human review completed and recorded; grey is not a review; hard checks still apply', txt.c83.includes("'not checked by AI'") && txt.c84.includes('or it was unavailable and the fallback is marked') && txt.c84.includes('grey alone is a status, never a completed review') && txt.c84.includes('hard checks')],
        ];
        for (const [n, ok] of walks) check('scenario walk (documentation coverage): ' + n, ok);
      }
      if ((w === 1280 || w === 1440) && scheme === 'light') {
        // J1: the selected map stage stays visible beside its open card; another stage can be selected; Escape returns focus
        const hid = [];
        for (const n of ['3', '5', '6', '9', '12']) {
          const b = p.locator('#st-' + n + ' .det'); await b.scrollIntoViewIfNeeded(); await b.click(); await p.waitForTimeout(120);
          const r = await p.evaluate(n => { const node = document.getElementById('st-' + n), g = node.getBoundingClientRect(), insp = document.getElementById('insp'), ir = insp.getBoundingClientRect();
            const ov = Math.max(0, Math.min(g.right, ir.right) - Math.max(g.left, ir.left));
            const title = node.querySelector('h4').getBoundingClientRect(), det = node.querySelector('.det').getBoundingClientRect();
            const cov = el => insp.contains(document.elementFromPoint(el.left + el.width / 2, el.top + el.height / 2));
            return {open: !insp.hidden, overlap: Math.round(ov), titleCovered: cov(title), detCovered: cov(det), side: insp.classList.contains('left') ? 'left' : 'right', sel: node.classList.contains('sel')}; }, n);
          if (!r.open || r.overlap > 0 || r.titleCovered || r.detCovered || !r.sel) hid.push({n, ...r});
        }
        check(`${w}px: J1 — the selected map stage (3, 5, 6, 9, 12) stays fully visible beside its open card`, hid.length === 0, hid);
        // with stage 12's card open (panel on the left), a stage still visible beside it can be selected directly
        await p.locator('#st-9 .det').scrollIntoViewIfNeeded(); await p.locator('#st-9 .det').click(); await p.waitForTimeout(100);
        const sw = await p.evaluate(() => ({open: !document.getElementById('insp').hidden, h: document.querySelector('#insp h2').textContent, sel: [...document.querySelectorAll('.mnode.sel')].map(x => x.id)}));
        check(`${w}px: another visible stage can be selected without closing the card; only it stays selected`, sw.open && sw.h === 'Record the responses' && sw.sel.join() === 'st-9', sw);
        await p.keyboard.press('Escape');
        const fr = await p.evaluate(() => ({hidden: document.getElementById('insp').hidden, f: document.activeElement.dataset.card, sel: document.querySelectorAll('.mnode.sel').length}));
        check(`${w}px: Escape returns focus to the stage's eye button and clears the selection`, fr.hidden && fr.f === 'st-9' && fr.sel === 0, fr);
      }
      if (w === 375 && scheme === 'light') {
        const ph = await p.evaluate(() => ({cols: [...document.querySelectorAll('#overview .mgrid')].map(g => getComputedStyle(g).gridTemplateColumns.split(' ').length),
          wide: [...document.querySelectorAll('#overview .mnode, #overview .marr, #overview .rbox')].filter(s => s.getBoundingClientRect().right > innerWidth + 1).length,
          phoneArrow: [...document.querySelectorAll('#overview .marr.phone-only')].filter(a => a.offsetParent !== null).length,
          wrapHidden: [...document.querySelectorAll('#overview .mwrap, #overview .rv')].every(x => getComputedStyle(x).display === 'none')}));
        check('phone: the map stacks to one column with downward arrows (6 → 7 arrow shown), none wider than the screen', ph.cols.every(c => c === 1) && ph.wide === 0 && ph.phoneArrow === 1 && ph.wrapHidden, ph);
        await p.locator('#st-5 .det').tap(); await p.waitForTimeout(150);
        const ps = await p.evaluate(() => { const i = document.getElementById('insp'), r = i.getBoundingClientRect(); return {open: !i.hidden, modal: i.getAttribute('aria-modal'), w: Math.round(r.width), iw: innerWidth}; });
        check('phone: a stage card opens as the full-width bottom sheet', ps.open && ps.modal === 'true' && ps.w === ps.iw, ps);
        await p.keyboard.press('Escape');
      }
      await ctx.close();
    }
  }
  // deep link to a stage card
  { const d = await load(browser, {viewport: {width: 1440, height: 900}, hash: '#c=st-5'});
    check('deep link #c=st-5 opens that stage card on load', (await d.p.textContent('#insp h2')) === 'Reuse verified information'); await d.ctx.close(); }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'one-pager-draft-3-browser-checks-2026-10-17.json'), JSON.stringify({page: PAGE, run: new Date().toISOString(), passed: results.length - failed, failed, results}, null, 1));
  for (const r of results) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : '  ' + JSON.stringify(r.detail)));
  console.log(`${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})();
