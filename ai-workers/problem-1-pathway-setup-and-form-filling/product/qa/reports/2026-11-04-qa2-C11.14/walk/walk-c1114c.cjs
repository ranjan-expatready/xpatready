// qa2 C11.14 walk part 3, 1440 px, Content reviewer: on IMM 5257's AI field-map page, what a person reads about the two
// rounds (checker, agree, differ, Ready/High). Read only. ARGS: studio base out url
const [STUDIO, BASE, OUT, URL] = process.argv.slice(2);
const { chromium } = require(STUDIO + "/node_modules/playwright");
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto(BASE + "/"); await p.evaluate(() => localStorage.setItem("xr-actor", "user-C"));
  await p.goto(BASE + URL); await p.waitForTimeout(4000);
  const lines = (await p.locator("main").innerText()).split("\n").map((s) => s.trim()).filter(Boolean);
  const hits = lines.filter((l) => /checker|round|agree|differ|both readings|High|Ready/i.test(l));
  console.log(`lines ${lines.length}; about the rounds (${hits.length}, first 40):\n${[...new Set(hits)].slice(0, 40).join("\n")}`);
  const h = p.getByText(/checker/i).first(); if (await h.count()) { await h.scrollIntoViewIfNeeded(); await p.screenshot({ path: `${OUT}/imm5257-field-map-rounds-1440.png` }); }
  await b.close();
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
