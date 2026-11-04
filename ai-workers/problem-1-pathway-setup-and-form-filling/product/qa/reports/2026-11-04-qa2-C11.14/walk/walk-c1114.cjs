// qa2 C11.14 walk on Reset to the six, 1440 px, as the Content reviewer (user-C). Reads To review › Proposals: the groups,
// the bands of the IMM 5257 edition group, the "cannot be ticked" reason on Ready items, both readings on a Ready and a
// Decide item. Presses nothing that decides; no model call. ARGS: studio base out
const [STUDIO, BASE, OUT] = process.argv.slice(2);
const { chromium } = require(STUDIO + "/node_modules/playwright");
const flat = (s) => s.replace(/\n+/g, " ⏎ ");
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await p.goto(BASE + "/"); await p.evaluate(() => localStorage.setItem("xr-actor", "user-C"));
  await p.goto(`${BASE}/review`); await p.waitForTimeout(3500);
  console.log(`=== /review (To review)\n${flat(await p.locator("main").innerText()).slice(0, 1500)}\n`);
  await p.screenshot({ path: `${OUT}/to-review-1440.png` });
  await p.goto(`${BASE}/review/proposals`); await p.waitForTimeout(4000);
  const groups = await p.locator('nav[aria-label="Groups"] button').allInnerTexts();
  console.log(`=== Proposals groups (${groups.length})\n${groups.map(flat).join("\n")}\n`);
  const g = p.locator('nav[aria-label="Groups"] button').filter({ hasText: /IMM 5257/ }).first();
  if (await g.count()) { await g.click(); await p.waitForTimeout(3000); }
  console.log(`url ${p.url()}`);
  const sec = p.locator("section[aria-label]").first();
  console.log(`=== IMM 5257 group (head)\n${flat(await sec.innerText()).slice(0, 1200)}\n`);
  await p.screenshot({ path: `${OUT}/proposals-imm5257-1440.png` });
  for (const band of ["ready", "check", "decide"]) {
    const t = p.locator(`[data-band="${band}"]`);
    const rows = await t.locator("tbody tr").count().catch(() => 0);
    const chooseAll = await t.locator("[data-choose-all]").count();
    console.log(`band ${band}: rows ${rows}, Choose all buttons ${chooseAll}; head: ${flat(await t.innerText().catch(() => "")).slice(0, 300)}`);
  }
  const ready = p.locator('[data-band="ready"]');
  const dash = ready.locator('[aria-label="Cannot be ticked with others"]');
  console.log(`Ready rows with "Cannot be ticked with others": ${await dash.count()}; checkboxes in Ready: ${await ready.locator('input[type="checkbox"], [role="checkbox"]').count()}`);
  if (await dash.count()) { await dash.first().hover(); await p.waitForTimeout(800); console.log(`tooltip: ${flat(await p.locator('[role="tooltip"]').first().innerText().catch(() => "(none)"))}`); await p.screenshot({ path: `${OUT}/ready-cannot-tick-tooltip-1440.png` }); }
  const openRow = async (band, name) => {
    const row = p.locator(`[data-band="${band}"] tbody tr`).first();
    if (!(await row.count())) { console.log(`(no ${band} row)`); return; }
    const btn = row.locator("button").first(); await (await btn.count() ? btn : row).click(); await p.waitForTimeout(1500);
    const panel = p.locator('[role="dialog"], aside').last();
    console.log(`=== ${band} item panel\n${flat(await panel.innerText().catch(() => "(no panel)")).slice(0, 1800)}\n`);
    await p.screenshot({ path: `${OUT}/${name}-1440.png` });
    await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  };
  await openRow("ready", "ready-item-both-readings");
  await openRow("decide", "decide-item-both-readings");
  console.log(`sideways scroll: ${await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)}`);
  console.log("page/console errors:", errs.length, errs.slice(0, 5).join(" || "));
  await b.close();
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
