// BK-18 walk (P-352), 1440 px, like a person: open a Study permit case as the Representative with the dialog's default
// team (which puts a Case officer on it), work it, send it for review, approve it, read the record on Ready to file,
// and carry on to the next capability's first step (Record the submission). US$0, live AI off.
const { chromium } = require("playwright");
const port = process.argv[2], SHOTS = process.argv[3];
const base = `http://localhost:${port}`;
const call = async (m, path, actor, body) => { const r = await fetch(base + "/api" + path, { method: m, headers: { "x-actor": actor, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); let b = null; try { b = await r.json(); } catch {} return { status: r.status, body: b }; };
let failed = 0; const ok = (n, c, d) => { if (!c) failed++; console.log(`${c ? "PASS" : "FAIL"} ${n}${!c && d !== undefined ? `: ${JSON.stringify(d).slice(0, 400)}` : ""}`); };
const shot = async (p, name) => p.screenshot({ path: `${SHOTS}/${name}-1440.png`, fullPage: true });
(async () => {
  const exe = require("fs").existsSync("/opt/pw-browsers/chromium-1243/chrome-linux64/chrome") ? { executablePath: "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome" } : {};
  const b = await chromium.launch({ headless: true, ...exe });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(() => { try { localStorage.setItem("xr-actor", "user-R"); } catch {} });
  const p = await ctx.newPage();
  // A script error is never allowed. A refused request the screen then explains in words (the self-review statement is
  // asked for, 400; Ready to file is refused while lines are open, 409) is the product answering, not a page error.
  const errors = []; p.on("pageerror", (e) => errors.push(String(e)));
  p.on("console", (m) => { if (m.type() === "error" && !/the server responded with a status of (400|409)/.test(m.text())) errors.push(m.text()); });
  const settle = async (ms = 1500) => { await p.waitForLoadState("networkidle").catch(() => {}); await p.waitForTimeout(ms); };

  // 1. The case list, as the Representative.
  await p.goto(`${base}/cases`); await settle();
  await shot(p, "01-cases");
  // 2. Open a case (the dialog's default team: the Case officer is on it, the Representative is of record).
  await p.getByRole("button", { name: "Open a case" }).click(); await settle(800);
  const dlg = p.getByRole("dialog");
  const combo = dlg.getByLabel("Combination (released)");
  const opts = await combo.locator("option").allInnerTexts();
  const sp = opts.find((o) => /Outside Canada/i.test(o));
  if (sp) await combo.selectOption({ label: sp });
  ok("walk 0: the Study permit's released combination is chosen in Open a case", !!sp, opts);
  await settle(800);
  await shot(p, "02-open-a-case");
  await dlg.getByLabel("Principal applicant's name").fill(`Sample Student ${Date.now() % 10000}`);
  await dlg.getByLabel("Your own reference (optional)").fill(`BK18-${Date.now() % 100000}`);
  await dlg.getByRole("button", { name: "Open case" }).click();
  await p.waitForURL(/\/cases\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  await settle(2000);
  const caseId = new URL(p.url()).pathname.split("/").pop();
  const team = (await call("GET", `/runtime/cases/${caseId}/team`, "user-R")).body;
  const officers = (team?.officers ?? []).map((o) => o.id ?? o);
  ok("walk 1: the case opens with the dialog's default team — a Case officer on it, the Representative of record", officers.length > 0 && team?.representative?.id === "user-R", { officers, rep: team?.representative?.id });
  await shot(p, "03-case-opened");

  // 3. Send the filing for review (the Representative, who opened it and did the work).
  const send = p.getByRole("button", { name: /^(Send for review|Review now)$/ });
  await send.scrollIntoViewIfNeeded(); await send.click(); await settle(800);
  await shot(p, "04-send-for-review");
  await p.getByRole("dialog").getByRole("button", { name: /^(Send|Review) \d+ filings? (for review|now)$/ }).click(); await settle(2500);
  const open = p.getByRole("link", { name: "Open the review" });
  if (await open.count()) { await open.first().click(); await settle(2500); }
  await shot(p, "05-review-page");

  // 4. Approve it. The dialog must ask for the statement first (BK-18): the Representative did the work.
  await p.getByRole("button", { name: "Approve", exact: true }).click(); await settle(1200);
  const d = p.getByRole("dialog");
  const self = d.getByRole("checkbox", { name: /prepared and reviewed this filing myself/ });
  let asked = false, said = "";
  for (let i = 0; i < 2 && (await d.count()); i++) {
    if (await self.count()) { asked = true; await shot(p, "06-approve-asks-the-statement"); await self.check(); }
    await d.getByRole("button", { name: "Approve", exact: true }).click(); await settle(2200);
    if (await d.count()) said = (await d.locator("[role=alert]").allInnerTexts()).join(" | ");
  }
  ok("walk 2 (BK-18): the Approve dialog asks the Representative to confirm \"I prepared and reviewed this filing myself\" before anything is recorded", asked, said);
  await shot(p, "07-approved");

  // 5. The record on Ready to file.
  await p.goto(`${base}/cases/${caseId}`); await settle(2000);
  const line = (await p.locator("main").innerText()).match(/Prepared by · Reviewed by:[^\n]*/)?.[0] ?? "";
  console.log("RECORD:", line);
  ok("walk 3 (QA-448): the record reads Self-reviewed with the name, the licence number and the time — one person did it all", /Self-reviewed by/.test(line) && /R\d{6}/.test(line) && /\d{1,2}:\d{2}/.test(line), line);
  ok("walk 4 (QA-448): the record never names the Case officer, who did nothing", !/Case officer \(Sample\)/.test(line), line);
  const ready = p.getByRole("button", { name: "Ready to file" }).first();
  if (await ready.count()) { await ready.click(); await settle(2500); }
  await shot(p, "08-ready-to-file-record");

  // 6. The next capability's first step. This case is bare, so Ready to file is refused in words while its CRITICAL
  // lines are open (P-237, P-238: the barcode copy is the one hard stop) and C8.2 waits, as the product intends.
  const rec = p.locator("[data-submission]").getByRole("button", { name: /^Record the submission/ }).first();
  const why = (await p.locator("[data-refusal], [data-standing]").allInnerTexts()).join(" | ");
  ok("walk 5: C8.2's first step is on the page under \"Submission to IRCC\"; on this bare case it waits, and Ready to file says why in words", (await rec.count()) === 1 && /not ready|stand|before Ready to file/i.test(why), { button: await rec.count(), why: why.slice(0, 200) });

  // 7. The other branch of the record, on a case two people worked on: the Case officer prepared it, the Representative
  // reviewed it, and the submission is recorded. The record names both, and C8.2's own record agrees.
  const worked = ((await call("GET", "/runtime/cases", "user-R")).body?.cases ?? []).find((x) => /^ACC-/.test(x.reference ?? ""));
  if (worked) {
    await p.goto(`${base}/cases/${worked.id}`); await settle(2500);
    const two = (await p.locator("main").innerText()).match(/Prepared by · Reviewed by:[^\n]*/)?.[0] ?? "";
    console.log("RECORD (two people):", two);
    ok("walk 6: on a case the Case officer prepared and the Representative reviewed, the record names both — never a self-review", /Case officer \(Sample\)/.test(two) && /Representative \(Sample\)/.test(two) && !/Self-reviewed/.test(two), two);
    await shot(p, "10-record-two-people");
  } else ok("walk 6 setup: a case two people worked on is on the list", false);
  ok("walk 7: no script error during the walk", errors.length === 0, errors.slice(0, 3));
  await ctx.close(); await b.close();
  console.log(failed ? `${failed} failed` : "all passed");
  process.exit(failed ? 1 : 0);
})();
