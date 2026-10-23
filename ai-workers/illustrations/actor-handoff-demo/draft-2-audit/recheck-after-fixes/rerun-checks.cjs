// Browser checks for the Solution 1 one-pager, draft 2. Run: node tools/s3/check_one_pager.cjs
// Uses the local Playwright install and Chrome. Writes checks/one-pager-draft-2-browser-checks-2026-10-17.json and screenshots.
const path = require('node:path'); const fs = require('node:fs');
const {chromium} = require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT = "/Users/ranjansingh/Desktop/Xpatready/ai-workers";
const PAGE = 'file://' + path.join(__dirname, 'solution-1-one-pager.html');
const OUT = __dirname;
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
        dgVisible: [...document.querySelectorAll('.dg-scroll')].filter(x => x.offsetParent !== null).length,
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
      if (w >= 1000) check(`${w}px ${scheme}: diagrams shown at natural size`, m.dgVisible === 8, `${m.dgVisible} visible`);
      else check(`${w}px ${scheme}: lists shown instead of diagrams`, m.dgVisible === 0 && m.listVisible === 8, `${m.dgVisible} diagrams, ${m.listVisible} lists`);
      if (scheme === 'dark') check(`${w}px dark: page dark, diagram panel stays light`, m.bg !== 'rgb(246, 246, 243)' && m.panelBg === 'rgb(255, 255, 255)', `${m.bg} / ${m.panelBg}`);
      if (w === 1440 && scheme === 'light') {
        // natural size: container width equals the diagram width from the data
        const nat = await p.evaluate(() => { const D = JSON.parse(document.getElementById('dg-data').textContent);
          return Object.entries(D.views).map(([k, v]) => ({k, w: v.w, cw: Math.round(document.querySelector('#dg-' + k + ' .djs-container').getBoundingClientRect().width)})); });
        check('1440px: every diagram at 100% (container = drawing width, at most 1,240px)', nat.every(n => n.w === n.cw && n.w <= 1240), nat);
        const eyes = await p.$$eval('.eye', b => b.length);
        const nActs = await p.evaluate(() => Object.keys(JSON.parse(document.getElementById('dg-data').textContent).acts).length);
        check(`one eye button per activity (${nActs})`, eyes === nActs, eyes);
        await p.screenshot({path: path.join(OUT, 's1-onepager-d2-desktop-top.png')});
        // open from an eye button; the page and map do not move
        await p.locator('#view-v2').scrollIntoViewIfNeeded(); await p.waitForTimeout(150);
        const before = await scrollState(p);
        await p.click('.eye[data-act="3.2"]');
        const s1 = await p.evaluate(() => ({open: !document.getElementById('insp').hidden, h: document.querySelector('#insp h2').textContent,
          focusIn: document.getElementById('insp').contains(document.activeElement), hash: location.hash,
          dt: document.querySelectorAll('#insp .ten dt').length, io: document.querySelectorAll('#insp .io li').length}));
        check('eye opens the inspector with the activity card', s1.open && s1.h.includes('form field mappings') && s1.focusIn, s1);
        check('card has ten groups and the Input → Action → Output → Receiving owner line', s1.dt === 10 && s1.io === 4, s1);
        check('location hash updated without navigation', s1.hash === '#a=3.2', s1.hash);
        check('opening does not scroll the page or the map', JSON.stringify(before) === JSON.stringify(await scrollState(p)), before);
        // example opens in place, by keyboard
        await p.focus('#insp .ex-btn'); await p.keyboard.press('Enter');
        const ex = await p.evaluate(() => ({exp: document.querySelector('#insp .ex-btn').getAttribute('aria-expanded'), vis: !document.querySelector('#insp .example').hidden,
          label: document.querySelector('#insp .example').textContent.includes('Example')}));
        check('Example opens in the same card by keyboard', ex.exp === 'true' && ex.vis && ex.label, ex);
        await p.locator('#insp').screenshot({path: path.join(OUT, 's1-onepager-d2-inspector-3-2.png')});
        // another selection replaces the content; example stays open
        await p.click('.eye[data-act="8.3"]');
        const s2 = await p.evaluate(() => ({h: document.querySelector('#insp h2').textContent, n: document.querySelectorAll('#insp').length,
          exp: document.querySelector('#insp .ex-btn').getAttribute('aria-expanded'), sel: document.querySelectorAll('.djs-element.sel').length}));
        check('another selection replaces the card in the same inspector', s2.h.includes('meaning') && s2.n === 1, s2);
        check('Example stays open across selections', s2.exp === 'true', s2.exp);
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
        // overview sub-process jumps to its view
        await p.locator('#overview').scrollIntoViewIfNeeded();
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
          const r = await p.evaluate(() => ({dt: document.querySelectorAll('#insp .ten dt').length, io: document.querySelectorAll('#insp .io li').length,
            ex: !!document.querySelector('#insp .example table, #insp .example ol, #insp .example .ex-none'), human: !!document.querySelector('#insp .human')}));
          if (!(r.dt === 10 && r.io === 4 && r.ex && r.human)) bad.push({id, ...r}); }
        await p.evaluate(() => S1.close());
        check(`all ${ids.length} cards complete (ten groups, flow line, person line, example or reason)`, bad.length === 0, bad);
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
        await p.screenshot({path: path.join(OUT, 's1-onepager-d2-1280-view5.png')});
      }
      if (w === 375 && scheme === 'light') {
        await p.screenshot({path: path.join(OUT, 's1-onepager-d2-phone-top.png')});
        await p.locator('#view-v5 .listwrap').scrollIntoViewIfNeeded();
        const btn = p.locator('#view-v5 .fl-open[data-act="8.4"]');
        await btn.tap();
        const s = await p.evaluate(() => { const r = document.getElementById('insp').getBoundingClientRect();
          return {open: !document.getElementById('insp').hidden, modal: document.getElementById('insp').getAttribute('aria-modal'), left: Math.round(r.left), w: Math.round(r.width), iw: innerWidth}; });
        check('phone: list item opens a full-width bottom sheet', s.open && s.modal === 'true' && s.left === 0 && s.w === s.iw, s);
        await p.locator('#insp .ex-btn').tap();
        check('phone: Example opens by touch', await p.evaluate(() => !document.querySelector('#insp .example').hidden));
        await p.screenshot({path: path.join(OUT, 's1-onepager-d2-phone-sheet.png')});
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
      await ctx.close();
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'independent-rerun-results.json'), JSON.stringify({page: PAGE, run: new Date().toISOString(), passed: results.length - failed, failed, results}, null, 1));
  for (const r of results) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : '  ' + JSON.stringify(r.detail)));
  console.log(`${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})();
