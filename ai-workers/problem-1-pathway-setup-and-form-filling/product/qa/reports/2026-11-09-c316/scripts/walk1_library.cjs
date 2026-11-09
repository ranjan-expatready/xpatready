// qa gate A walk of C3.16, part 1 by screens (1024 px): the configuration author opens Library › Fields, finds each
// field by its words, reads "Asked about" and saves the new choice. node walk1_library.cjs <port> <outdir>
const { chromium } = require("playwright");
const [port, out] = [process.argv[2], process.argv[3]];
const shot = async (p, n) => { await p.screenshot({ path: `${out}/${n}.png`, fullPage: true }); console.log("SHOT", n); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 800 }, deviceScaleFactor: 1 });
  await p.addInitScript(() => localStorage.setItem("xr-actor", "user-A"));
  const base = `http://localhost:${port}`;
  for (const [search, choice, n] of [["union", "household", "01"], ["employer", "organisation", "03"]]) {
    await p.goto(`${base}/`); await p.waitForLoadState("networkidle");
    await p.getByRole("link", { name: /^Fields/ }).first().click();
    await p.waitForLoadState("networkidle");
    const box = p.getByRole("searchbox").or(p.getByPlaceholder(/search|find/i)).first();
    await box.fill(search); await p.waitForTimeout(800);
    await shot(p, `${n}a-library-fields-search-${search}`);
    const rows = await p.locator("a[href^='/library/fields/']").allInnerTexts();
    console.log("ROWS", JSON.stringify(rows.slice(0, 12)));
    const target = search === "union" ? /union start date/i : /employer.?s? name|name of employer/i;
    await p.locator("a[href^='/library/fields/']").filter({ hasText: target }).first().click();
    await p.waitForLoadState("networkidle"); await p.waitForSelector("[data-field-scope]");
    console.log("URL", p.url());
    const panel = p.locator("[data-field-scope]");
    console.log("PANEL BEFORE", (await panel.innerText()).replace(/\n+/g, " | "));
    await panel.scrollIntoViewIfNeeded(); await shot(p, `${n}b-asked-about-before`);
    await panel.locator(`[data-scope-choice="${choice}"]`).click();
    console.log("WARNING", await panel.locator("text=Saved AI results").count() ? (await panel.innerText()).match(/Saved AI results[^|]*/)?.[0] : "none");
    await shot(p, `${n}c-asked-about-picked`);
    await panel.locator("[data-scope-save]").click();
    await p.waitForTimeout(1500);
    console.log("TOAST", (await p.locator("[role=status],[data-sonner-toast]").allInnerTexts()).join(" / "));
    console.log("PANEL AFTER", (await panel.innerText()).replace(/\n+/g, " | "));
    console.log("PILL", (await p.locator("main").innerText()).match(/once for the (household|employer)|about each person/g));
    await shot(p, `${n}d-asked-about-saved`);
  }
  await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
