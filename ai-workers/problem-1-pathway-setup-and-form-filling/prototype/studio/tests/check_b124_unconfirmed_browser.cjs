// B124 (M3 row A8, P-393; C6.9): the eligibility outcome says when it rests on answers not confirmed yet, walked by
// screens on the configured checkpoint. The officer's answers to the three deciding facts are not confirmed: the result
// reads "Likely eligible, on 3 answers not yet confirmed" and names each with a link to the Agent view; Confirm section
// on the passport section by screen leaves one; after every section is confirmed the line goes. Possibly eligible
// (can't tell yet) is unchanged. axe, 1440 and 1024 px. Screenshots: product/screens/B124/walk/. US$0, live AI off.
//   zsh studio/tools/isolated.sh b124 4446 start && node studio/tests/check_b124_unconfirmed_browser.cjs 4446 xr_studio_b124
const path = require("node:path"); const fs = require("node:fs"); const http = require("node:http"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4446), DB = process.argv[3] ?? "xr_studio_b124", BASE = `http://localhost:${PORT}`;
const sql = (q) => execFileSync(process.env.PSQL || "/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const OUT = path.join(__dirname, "..", "..", "..", "product", "screens", "B124", "walk");
const AUTHOR = "user-A", OFFICER = "user-O";
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  C6.9: ${n}${!c && d !== undefined ? ` — ${JSON.stringify(d).slice(0, 400)}` : ""}`); };
const call = (method, p, body, actor = OFFICER) => new Promise((res, rej) => {
  const data = body === undefined ? undefined : JSON.stringify(body);
  const r = http.request({ host: "localhost", port: PORT, path: `/api${p}`, method, agent: false, timeout: 900_000, headers: { "x-actor": actor, ...(data ? { "content-type": "application/json", "content-length": Buffer.byteLength(data) } : {}) } }, (s) => {
    let t = ""; s.on("data", (c) => (t += c)); s.on("end", () => { let b = null; try { b = t ? JSON.parse(t) : null; } catch { b = t; } res({ status: s.statusCode, body: b }); });
  });
  r.on("error", rej); if (data) r.write(data); r.end();
});

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const load = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
  ok("set-up: the configured checkpoint loads (Visitor visa released with its two Sample gates, A1)", load.status < 300, load.body?.detail ?? load.status);
  const vv = sql("select id from combination where label = 'Visitor visa' and retired_at is null order by created_at limit 1");
  const open = async (ref, name) => { const r = await call("POST", "/runtime/cases", { combinationId: vv, reference: ref, clientActor: "user-P", principal: { displayName: name } }); return { id: r.body?.id, p: (r.body?.people ?? []).find((x) => x.role === "principal")?.subject_id, status: r.status, detail: r.body?.detail }; };
  const answer = (c, fact, value) => call("PUT", `/runtime/cases/${c.id}/answers/${c.p}/${fact}`, { value, expectedId: null });
  const stamp = Date.now() % 100000;
  const c = await open(`ACC-B124-${stamp}`, "Sample Client B124");
  ok("set-up: a Visitor visa case opens on the checkpoint", !!c.id && !!c.p, c);
  const expiry = new Date(Date.now() + 3 * 365 * 86_400_000).toISOString().slice(0, 10);
  const answered = [await answer(c, "person.passport_number", "SAMPLEP24"), await answer(c, "person.passport_expiry_date", expiry), await answer(c, "person.criminal_history", false)];
  ok("set-up: the case officer answers the three deciding facts (not confirmed yet)", answered.every((r) => r.status < 300), answered.map((r) => r.body?.detail ?? r.status));
  const idle = await open(`ACC-B124-idle-${stamp}`, "Sample Client Idle");

  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium/chrome-linux/chrome") ? { executablePath: "/opt/pw-browsers/chromium/chrome-linux/chrome" } : fs.statSync("/opt/pw-browsers/chromium", { throwIfNoEntry: false })?.isFile() ? { executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] } : {}) });
  const as = async (width) => { const ctx = await b.newContext({ viewport: { width, height: 900 } }); ctx.setDefaultNavigationTimeout(180_000); ctx.setDefaultTimeout(30_000); await ctx.addInitScript((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* blocked */ } }, OFFICER); return ctx.newPage(); };
  const errors = [];
  const page = await as(1440); page.on("pageerror", (e) => errors.push(String(e)));
  const eligibility = async (p, caseId) => { await p.goto(`${BASE}/cases/${caseId}/eligibility`, { waitUntil: "networkidle" }); await p.getByRole("button", { name: /Run eligibility check|Run again/ }).first().waitFor({ timeout: 60_000 }); };
  const body = (p) => p.locator("body").innerText();
  const resting = (p) => p.locator("[data-resting-on]");

  // Can't tell yet is unchanged: nothing answered gives Possibly eligible, with no "not yet confirmed" line.
  await eligibility(page, idle.id);
  await page.getByRole("button", { name: "Run eligibility check" }).click();
  await page.getByText(/Rules checked/).first().waitFor({ timeout: 60_000 });
  ok("fail: Possibly eligible (can't tell yet) is unchanged, with no 'not yet confirmed' line", /Possibly eligible — needs/.test(await body(page)) && (await resting(page).count()) === 0 && !/not yet confirmed/.test(await body(page)));

  // None confirmed: the outcome says it rests on 3 answers and names each, with a link.
  await eligibility(page, c.id);
  await page.getByRole("button", { name: "Run eligibility check" }).click();
  await page.getByText(/Rules checked/).first().waitFor({ timeout: 60_000 });
  const t1 = await body(page);
  ok("none confirmed: the outcome reads 'Likely eligible, on 3 answers not yet confirmed'", /Likely eligible, on 3 answers not yet confirmed/.test(t1), t1.match(/Likely[^\n]*/)?.[0]);
  const links = resting(page).getByRole("link");
  ok("none confirmed: the line names each deciding answer with a link to confirm it", (await links.count()) === 3 && /Passport number[\s\S]*Passport expiry date[\s\S]*Criminal history/.test(await resting(page).innerText()), await resting(page).innerText().catch(() => ""));
  ok("none confirmed: the people list says it too ('Likely · 3 not confirmed')", /Likely · 3 not confirmed/.test(t1));
  await page.screenshot({ path: path.join(OUT, "1-none-confirmed-1440.png") });
  const axe = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  ok("axe (WCAG 2.2 AA): the eligibility page with the line", axe.violations.length === 0, axe.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`));

  // Some confirmed: follow the link, Confirm section on the passport section by screen.
  await links.first().click();
  const sec = page.locator(`section[id^="s-${c.p}-"]`, { has: page.locator(`[id="a-${c.p}-person-passport_number"]`) }).first();
  await sec.waitFor({ timeout: 60_000 });
  ok("link: it opens this person's tab in the Agent view with the passport question in view, where its section is confirmed", await page.evaluate((id) => { const e = document.getElementById(`a-${id}-person-passport_number`); if (!e) return false; const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; }, c.p));
  await sec.getByRole("button", { name: /Confirm section/ }).click();
  await page.waitForTimeout(1500);
  await eligibility(page, c.id);
  const t2 = await body(page);
  ok("some confirmed: the outcome reads 'on 1 answer not yet confirmed' and names only Criminal history (no new run needed)", /Likely eligible, on 1 answer not yet confirmed/.test(t2) && /Criminal history/.test(await resting(page).innerText()) && !/Passport/.test(await resting(page).innerText()), await resting(page).innerText().catch(() => t2.slice(0, 300)));
  await page.screenshot({ path: path.join(OUT, "2-some-confirmed-1440.png") });

  // 1024 px while the line shows.
  const small = await as(1024); small.on("pageerror", (e) => errors.push(String(e)));
  await eligibility(small, c.id);
  ok("1024 px: the line shows and the page does not scroll sideways", (await resting(small).count()) === 1 && !(await small.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
  await small.screenshot({ path: path.join(OUT, "3-some-confirmed-1024.png") });

  // All confirmed: every section confirmed by screen; the line goes and the outcome is plain.
  await page.goto(`${BASE}/cases/${c.id}#a-${c.p}-person-criminal_history`, { waitUntil: "networkidle" });
  const bg = page.locator(`section[id^="s-${c.p}-"]`, { has: page.locator(`[id="a-${c.p}-person-criminal_history"]`) }).first();
  await bg.waitFor({ timeout: 60_000 });
  await bg.getByRole("button", { name: /Confirm section/ }).click();
  await page.waitForTimeout(1500);
  await eligibility(page, c.id);
  const t3 = await body(page);
  ok("all confirmed: the line goes and the outcome reads plain 'Likely eligible'", (await resting(page).count()) === 0 && /Likely eligible/.test(t3) && !/not yet confirmed/.test(t3) && !/· \d+ not confirmed/.test(t3), t3.match(/Likely[^\n]*/g));
  await page.screenshot({ path: path.join(OUT, "4-all-confirmed-1440.png") });
  await eligibility(small, c.id);
  ok("1024 px: all confirmed, no line, no sideways scroll", (await resting(small).count()) === 0 && !(await small.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
  await small.screenshot({ path: path.join(OUT, "5-all-confirmed-1024.png") });

  ok("no page errors", errors.length === 0, errors);
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); console.log(`\n${pass}/${pass + fail + 1} passed`); process.exit(1); });
