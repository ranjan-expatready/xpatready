// gate A on #1084: beyond the builder's walk, at 1440 px, screens only, nothing priced.
const { chromium } = require("playwright"); const fs = require("fs"), path = require("path");
const [port, out, caseUrl] = process.argv.slice(2); const base = `http://127.0.0.1:${port}`; fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
  const as = async (a, u) => { await p.goto(base + "/"); await p.evaluate((x) => localStorage.setItem("xr-actor", x), a); await p.goto(base + u); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800); };
  const T = async (l = p.locator("body")) => (await l.innerText()).replace(/\s+/g, " ");
  const r = {};
  // Author: Visitor visa › Forms, the Signed by column scrolled into view; then the release's history.
  await as("user-A", "/");
  await p.getByRole("button", { name: "Visitor visa", exact: true }).first().click(); await p.waitForURL(/\/c\/[^/]+/); const combo = p.url().match(/\/c\/([^/?#]+)/)[1];
  await as("user-A", `/c/${combo}/forms`);
  r.formsHeaders = await p.locator("thead th").allInnerTexts();
  r.rows = {}; for (const code of ["IMM 5257", "IMM 5257 SCH1", "IMM 5409", "IMM 5475", "IMM 5476", "IMM 5707", "IRM 0002"]) { const row = p.locator(`tr[data-line="${code}"]`); r.rows[code] = (await row.count()) ? await T(row.first()) : null; }
  const sc = p.locator("table").first(); await sc.evaluate((t) => { let e = t; while (e && e.scrollWidth <= e.clientWidth) e = e.parentElement; if (e) e.scrollLeft = e.scrollWidth; });
  await p.screenshot({ path: path.join(out, "forms-signed-by-scrolled.png") });
  r.aiChip = (await T()).match(/Picked by AI[^.]{0,40}/g);
  for (const tab of ["review", "overview"]) { await as("user-A", `/c/${combo}/${tab}`); r[tab] = (await T()).slice(0, 1500); await p.screenshot({ path: path.join(out, `vv-${tab}.png`), fullPage: true }); }
  await as("user-A", "/releases"); r.releases = (await T()).slice(0, 1500); await p.screenshot({ path: path.join(out, "releases.png"), fullPage: true });
  // Case officer: the builder's case; add a child, then read the case's form and channel panels for signatures.
  await as("user-O", new URL(caseUrl).pathname);
  await p.getByRole("button", { name: "Add child" }).click(); const d = p.getByRole("dialog"); await d.getByLabel("Name").fill("Sample Child A1"); await d.getByRole("button", { name: "Add" }).click(); await d.waitFor({ state: "detached" }).catch(() => {}); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500);
  const c = await T(); fs.writeFileSync(path.join(out, "case.txt"), c);
  const i = c.indexOf("How each form is filed"); r.channelPanel = i >= 0 ? c.slice(i, i + 1200) : null;
  r.signWords = [...new Set((c.match(/[^.]{0,60}sign[^.]{0,80}/gi) ?? []))].slice(0, 15);
  await p.screenshot({ path: path.join(out, "case-with-child.png"), fullPage: true });
  r.errs = errs; fs.writeFileSync(path.join(out, "more.json"), JSON.stringify(r, null, 1)); console.log(JSON.stringify(r, null, 1)); await b.close();
})().catch((e) => { console.error("STOPPED", e.message); process.exit(1); });
