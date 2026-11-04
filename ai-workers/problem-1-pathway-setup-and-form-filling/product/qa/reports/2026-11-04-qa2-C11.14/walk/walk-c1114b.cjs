// qa2 C11.14 walk part 2, 1440 px, Content reviewer: from Proposals › IMM 5257, follow a Ready row and a Decide row to
// where it is decided and read both AI readings there. Presses no accept or refuse. ARGS: studio base out
const [STUDIO, BASE, OUT] = process.argv.slice(2);
const { chromium } = require(STUDIO + "/node_modules/playwright");
const flat = (s) => s.replace(/\n+/g, " ⏎ ");
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await p.goto(BASE + "/"); await p.evaluate(() => localStorage.setItem("xr-actor", "user-C"));
  for (const [band, name] of [["ready", "ready-row-followed"], ["decide", "decide-row-followed"]]) {
    await p.goto(`${BASE}/review/proposals?group=${encodeURIComponent("edition:IMM 5257 (09-2023)")}`); await p.waitForTimeout(3500);
    const row = p.locator(`[data-band="${band}"] tbody tr`).first();
    const links = await row.locator("a, button").evaluateAll((xs) => xs.map((x) => `${x.tagName}:${x.innerText.trim().slice(0, 60)}:${x.getAttribute("href") ?? ""}`));
    console.log(`=== ${band} row controls: ${links.join(" | ")}`);
    const go = row.getByRole("link", { name: /form-field page/ }).or(row.getByRole("button", { name: /form-field page/ })).first();
    if (await go.count()) { await go.click(); } else { await row.locator("a, button").first().click(); }
    await p.waitForTimeout(3500);
    console.log(`url ${p.url()}`);
    const t = flat(await p.locator("main").innerText());
    const i = t.search(/First reading|Both readings|checker/i);
    console.log(`${t.slice(0, 600)}\n…\n${i >= 0 ? t.slice(Math.max(0, i - 200), i + 1000) : "(no 'reading' words on the page)"}\n`);
    await p.screenshot({ path: `${OUT}/${name}-1440.png` });
  }
  console.log(`sideways scroll: ${await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)}`);
  console.log("page/console errors:", errs.length, errs.slice(0, 5).join(" || "));
  await b.close();
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
