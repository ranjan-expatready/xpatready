// Checker's additional probes (draft 3 review): every map node at seven widths; docked mode; map text for failure paths.
const path = require('node:path'); const fs = require('node:fs');
const {chromium} = require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const PAGE = 'file://' + path.join(__dirname, 'solution-1-one-pager.html');
(async () => {
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  const out = {occlusion: [], text: {}};
  for (const w of [1000, 1100, 1280, 1440, 1600, 1759, 1760, 1920]) {
    const ctx = await browser.newContext({viewport: {width: w, height: 900}}); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(PAGE); await p.waitForSelector('body[data-ready="true"]', {timeout: 30000});
    const ids = await p.$$eval('.mnode', ns => ns.filter(n => n.querySelector('.det')).map(n => n.id));
    const bad = [];
    for (const id of ids) {
      const b = p.locator('#' + id + ' .det').first(); await b.scrollIntoViewIfNeeded(); await b.click(); await p.waitForTimeout(120);
      const r = await p.evaluate(id => { const node = document.getElementById(id), g = node.getBoundingClientRect(), insp = document.getElementById('insp'), ir = insp.getBoundingClientRect();
        const ov = insp.hidden ? -1 : Math.max(0, Math.min(g.right, ir.right) - Math.max(g.left, ir.left)) * (Math.min(g.bottom, ir.bottom) > Math.max(g.top, ir.top) ? 1 : 0);
        return {open: !insp.hidden, overlapPx: Math.round(ov), cardW: Math.round(g.width), side: insp.classList.contains('left') ? 'left' : 'right', docked: document.body.classList.contains('docked')}; }, id);
      if (!r.open || r.overlapPx > 0) bad.push({id, ...r});
      await p.keyboard.press('Escape'); await p.waitForTimeout(60);
    }
    out.occlusion.push({width: w, nodes: ids.length, occluded: bad, errors: errs});
    if (w === 1440) {
      out.text.map = await p.evaluate(() => document.getElementById('overview') ? document.getElementById('overview').innerText : null);
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'extra-probes.json'), JSON.stringify(out, null, 1));
  for (const o of out.occlusion) console.log(o.width, 'nodes', o.nodes, 'occluded', o.occluded.length, JSON.stringify(o.occluded).slice(0, 400), o.errors.length ? 'ERR ' + o.errors[0] : '');
})();
