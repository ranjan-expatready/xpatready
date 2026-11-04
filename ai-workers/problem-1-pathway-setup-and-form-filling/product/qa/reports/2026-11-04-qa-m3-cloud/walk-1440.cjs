// qa M3 walk at 1440 px as a case officer: what a person sees for C6.12, C6.4, C7.6, C7.7, C7.3 on the case page.
const { chromium } = require('playwright');
const fs = require('fs');
const cases = JSON.parse(fs.readFileSync(__dirname + '/cases.json', 'utf8'));
const OUT = process.argv[2]; const BASE = 'http://localhost:4470';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem('xr-actor', 'user-O'));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  const res = {};
  await p.goto(BASE + '/cases'); await p.waitForLoadState('networkidle');
  await p.screenshot({ path: OUT + '/1-cases-list-1440.png', fullPage: true });
  for (const [k, id] of [['solo', cases.solo], ['family', cases.family]]) {
    await p.goto(`${BASE}/cases/${id}`); await p.waitForLoadState('networkidle'); await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/2-case-${k}-1440.png`, fullPage: true });
    const t = await p.locator('main').innerText().catch(() => p.locator('body').innerText());
    res[k] = {
      tabs: await p.getByRole('tab').allInnerTexts().catch(() => []),
      headings: await p.locator('h1,h2,h3').allInnerTexts(),
      text: t.slice(0, 6000),
      has: Object.fromEntries(['Prepare application', 'Ready to file', 'Fee', 'CAD', 'Biometrics', 'Checklist', 'Document', 'Passport', 'Portal', 'answer sheet', 'Copy', 'Download PDF copy', 'Not ready', 'Validate', 'filing', 'IMM 5257', 'IMM 5707', 'IMM 5476'].map((w) => [w, t.toLowerCase().includes(w.toLowerCase())])),
    };
  }
  res.errors = errs;
  fs.writeFileSync(OUT + '/walk.json', JSON.stringify(res, null, 1)); await b.close();
})();
