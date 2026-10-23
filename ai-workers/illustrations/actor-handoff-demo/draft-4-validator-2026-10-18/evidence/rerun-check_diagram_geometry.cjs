// Diagram label geometry check for the Solution 1 one-pager (cohesion pass, 18 Oct 2026). Run: node tools/s3/check_diagram_geometry.cjs [outfile]
// Measures the RENDERED diagrams (bpmn.io viewer output), not the builder's estimates: every label's text box against every
// connector segment, every flow-node shape, every other label, and every task's text against its own marks (person/gear,
// multi-instance, eye). A collision is a label struck through by a line or overlapping another mark. Lanes, pools, bands and the
// dashed group boundary are backgrounds and are not counted, except that a label may not cross the group's dashed border.
// This checks geometry only; it does not judge typography, spacing or colour, which still need screenshot inspection.
const path = require('node:path'); const fs = require('node:fs');
const {chromium} = require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT = '/Users/ranjansingh/Desktop/Xpatready/ai-workers';
const PAGE = 'file:///Users/ranjansingh/Desktop/Xpatready/ai-workers/illustrations/actor-handoff-demo/draft-4-validator-2026-10-18/inputs/solution-1-one-pager.html';
const OUTF = process.argv[2] || '/Users/ranjansingh/Desktop/Xpatready/ai-workers/illustrations/actor-handoff-demo/draft-4-validator-2026-10-18/evidence/checks' + path.sep + path.join( 'one-pager-diagram-geometry-2026-10-18.json');
(async () => {
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const p = await ctx.newPage(); await p.goto(PAGE); await p.waitForSelector('body[data-ready="true"]');
  await p.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
  await p.waitForTimeout(300);
  const res = await p.evaluate(() => {
    const out = [];
    const inter = (a, b, pad = 0) => a.l < b.r - pad && a.r > b.l + pad && a.t < b.b - pad && a.b > b.t + pad;
    const R = r => ({l: r.left, r: r.right, t: r.top, b: r.bottom});
    function segHitsRect(x1, y1, x2, y2, q) {
      // axis-aligned segments only (all connectors here are orthogonal); diagonal ones are sampled
      const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 2));
      for (let i = 0; i <= n; i++) { const x = x1 + (x2 - x1) * i / n, y = y1 + (y2 - y1) * i / n; if (x > q.l && x < q.r && y > q.t && y < q.b) return true; }
      return false;
    }
    for (const dg of document.querySelectorAll('.dg')) {
      const svg = dg.querySelector('.djs-container > svg'); if (!svg) continue;
      const view = dg.id.replace('dg-', '');
      const segs = [], shapes = [], labels = [], tasks = [];
      svg.querySelectorAll('.djs-connection').forEach(c => {
        const id = c.dataset.elementId; const vis = c.querySelector('.djs-visual > path, .djs-visual > polyline'); if (!vis) return;
        const m = vis.getScreenCTM(); const len = vis.getTotalLength(); const pts = [];
        // read the path's corner points from its 'd' (M/L commands)
        const d = vis.getAttribute('d') || ''; const nums = (d.match(/-?\d+(\.\d+)?/g) || []).map(Number);
        for (let i = 0; i + 1 < nums.length; i += 2) { const pt = svg.createSVGPoint(); pt.x = nums[i]; pt.y = nums[i + 1]; const s = pt.matrixTransform(m); pts.push([s.x, s.y]); }
        for (let i = 0; i + 1 < pts.length; i++) segs.push({id, x1: pts[i][0], y1: pts[i][1], x2: pts[i + 1][0], y2: pts[i + 1][1], assoc: id.startsWith('As_')});
      });
      svg.querySelectorAll('.djs-shape').forEach(s => {
        const id = s.dataset.elementId || '';
        const vis = s.querySelector(':scope > .djs-visual');
        if (id.endsWith('_label')) {
          const t = s.querySelector('text'); if (!t || !t.textContent.trim()) return;
          labels.push({id, owner: id.replace(/_label$/, ''), text: t.textContent.trim(), box: R(t.getBoundingClientRect())});
          return;
        }
        if (/^(P_|L_|B_)/.test(id) || !vis) return;
        if (/^G/.test(id) && s.querySelector('.djs-visual rect[stroke-dasharray], .djs-visual rect')) {
          const gl = s.querySelector('.djs-visual text'); const b = R(vis.querySelector('rect').getBoundingClientRect());
          shapes.push({id, group: true, box: b});
          if (gl && gl.textContent.trim()) labels.push({id: id + '_glabel', owner: id, text: gl.textContent.trim(), box: R(gl.getBoundingClientRect())});
          return;
        }
        const main = vis.querySelector('rect, circle, polygon, path'); if (!main) return;
        const box = R(main.getBoundingClientRect());
        if (/^Note_|^N_/.test(id) || s.classList.contains('bpmn-textannotation') || vis.querySelector('path') && !vis.querySelector('rect,circle,polygon') && /text/i.test(id)) {}
        shapes.push({id, box, note: /annotation/i.test(s.getAttribute('class') || '') || id.startsWith('N_')});
        const txt = vis.querySelector('text');
        if (id.startsWith('A_') && txt) {
          const marks = [...vis.querySelectorAll('path, circle')].filter(x => x !== main).map(x => R(x.getBoundingClientRect())).filter(b => b.r - b.l < 30 && b.b - b.t < 30);
          tasks.push({id, lines: [...txt.querySelectorAll('tspan')].map(x => R(x.getBoundingClientRect())), marks});
        }
        // text annotations: their inner text is a label too
        if (txt && !id.startsWith('A_') && !id.startsWith('O_')) labels.push({id: id + '_inner', owner: id, text: txt.textContent.trim(), box: R(txt.getBoundingClientRect()), inner: true});
      });
      // eye buttons overlaid by the page
      const eyes = [...dg.querySelectorAll('.eye')].map(e => ({id: 'eye:' + e.dataset.act, box: R(e.getBoundingClientRect())}));
      const issues = [];
      for (const L of labels) {
        const q = {l: L.box.l + 1, r: L.box.r - 1, t: L.box.t + 1, b: L.box.b - 1};
        if (q.r <= q.l || q.b <= q.t) continue;
        for (const s of segs) if (!(L.inner && s.assoc && s.id === 'As_' + L.owner) && segHitsRect(s.x1, s.y1, s.x2, s.y2, q)) { issues.push({kind: 'label crossed by a connector', label: L.text, by: s.id}); break; }
        for (const s of shapes) {
          if (s.id === L.owner && L.inner) continue;
          if (s.group) { // a label may sit inside or outside the group, not across its border
            const inside = q.l >= s.box.l && q.r <= s.box.r && q.t >= s.box.t && q.b <= s.box.b; const outside = !inter(q, s.box);
            if (!inside && !outside) issues.push({kind: 'label crosses the group boundary', label: L.text, by: s.id}); continue; }
          const container = q.l >= s.box.l && q.r <= s.box.r && q.t >= s.box.t && q.b <= s.box.b && (s.box.r - s.box.l) > 200;
          if (!container && inter(q, s.box, 1)) { issues.push({kind: 'label overlaps a shape', label: L.text, by: s.id}); break; }
        }
        for (const M of labels) if (M !== L && M.id > L.id && inter(q, M.box, 1)) issues.push({kind: 'labels overlap', label: L.text, by: M.text});
        for (const e of eyes) if (inter(q, e.box, 1)) issues.push({kind: 'label under an eye button', label: L.text, by: e.id});
      }
      for (const t of tasks) { let hit = false; for (const ln of t.lines) for (const m of t.marks) if (!hit && inter(ln, m, 1)) { hit = true; issues.push({kind: 'task text under its own mark', label: t.id, by: 'mark'}); } }
      out.push({view, labels: labels.length, connectors: segs.length, issues});
    }
    return out;
  });
  await browser.close();
  const total = res.reduce((s, v) => s + v.issues.length, 0);
  fs.writeFileSync(OUTF, JSON.stringify({page: PAGE, checked_at: new Date().toISOString(), total, views: res}, null, 2));
  for (const v of res) { console.log(`${v.view}: ${v.labels} labels, ${v.connectors} segments, ${v.issues.length} issues`); for (const i of v.issues) console.log('   ' + i.kind + ': ' + JSON.stringify(i.label).slice(0, 60) + ' ← ' + i.by); }
  console.log(total ? `GEOMETRY: ${total} issues` : 'GEOMETRY: no collisions');
  process.exitCode = total ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 2; });
