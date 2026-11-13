// qa (13 Nov, retests before Bake walk 2; Lead 29's ruling on #1656 question 4, P-154/P-155): a filing the Representative
// prepared, sent for review and approved alone must be recorded "Self-reviewed" with their name, licence number and time,
// never as a second person's review. Walk 1's Study permit case: opened with the default team (Case officer (Sample) as
// officer, Representative (Sample) of record), then worked end to end by the Representative. This check repeats that on a
// fresh copy and reads the record on the case page (Ready to file's "Prepared by · Reviewed by" line).
// US$0, live AI off. Headless.
//   zsh tools/isolated.sh qa_447 4472 start && node tests/qa/check_qa447_self_review_record.cjs 4472
//   (loads the configured checkpoint itself when Study permit is not released; never :4400)
const fs = require("fs"); const { chromium } = require("playwright");
const port = process.argv[2]; if (!port || port === "4400") { console.log("usage: <port of an isolated copy>, never 4400"); process.exit(2); }
const base = `http://localhost:${port}`;
const call = async (method, path, actor, body) => { const r = await fetch(base + "/api" + path, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); let b = null; try { b = await r.json(); } catch { /* not JSON */ } return { status: r.status, body: b }; };
let failed = 0; const ok = (name, pass, detail) => { if (!pass) failed++; console.log(`${pass ? "PASS" : "FAIL"} ${name}${!pass && detail ? `: ${JSON.stringify(detail).slice(0, 500)}` : ""}`); };
(async () => {
  const sp = async () => ((await call("GET", "/runtime/openable", "user-O")).body ?? []).find((r) => r.combination === "Outside Canada" && r.startable);
  if (!(await sp())) {
    await call("POST", "/demo/reset", "user-A", { confirm: "RESET" });
    const l = await call("POST", "/demo/load", "user-A", { sample: "configured" });
    if (l.status >= 300) { console.log("STOP the configured checkpoint did not load", l.status); process.exit(2); }
  }
  const row = await sp(); const ref = `QA447-${Date.now() % 100000}`;
  // Opened with the dialog's defaults: Case officer (Sample) as officer, Representative (Sample) of record (as walk 1).
  const made = await call("POST", "/runtime/cases", "user-R", { combinationId: row.combination_id, reference: ref, clientActor: "user-P", principal: { displayName: "Sample Student Q" }, idempotencyKey: ref });
  ok("setup: a Study permit case opens with the default team", made.status < 300 && !!made.body?.id, made); if (!made.body?.id) process.exit(2);
  const exe = fs.existsSync("/opt/pw-browsers/chromium-1243/chrome-linux64/chrome") ? { executablePath: "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome" } : {};
  const b = await chromium.launch({ headless: true, ...exe });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(() => { try { localStorage.setItem("xr-actor", "user-R"); } catch {} });
  const p = await ctx.newPage(); await p.goto(`${base}/cases/${made.body.id}`); await p.waitForLoadState("networkidle");
  const team = (await p.locator("main").innerText()).match(/Representative \(Sample\)[^\n]*Case officer \(Sample\)/)?.[0];
  ok("setup: the case team names a separate Case officer", !!team, team);
  const send = p.getByRole("button", { name: "Send for review", exact: true }); await send.scrollIntoViewIfNeeded(); await send.click();
  const go = p.getByRole("dialog").getByRole("button", { name: /^Send \d+ filings? for review$/ }); await go.click(); await p.waitForTimeout(2500);
  await p.getByRole("link", { name: "Open the review" }).first().click(); await p.waitForTimeout(2500);
  const sentBy = (await p.locator("main").innerText()).match(/Sent by [^,]+/)?.[0];
  ok("setup: the review says it was sent by the Representative (the person who prepared it)", /Representative/.test(sentBy ?? ""), sentBy);
  await p.getByRole("button", { name: "Approve", exact: true }).click(); await p.waitForTimeout(900);
  const d = p.getByRole("dialog"); if (await d.count()) { const self = d.getByRole("checkbox", { name: /prepared and reviewed this filing myself/ }); if (await self.count()) await self.check(); await d.getByRole("button", { name: "Approve", exact: true }).click(); await p.waitForTimeout(2000); }
  const approved = await p.getByRole("button", { name: / · Round 1 Approved/ }).count();
  ok("setup: the Representative approved the filing", approved > 0);
  await p.getByRole("link", { name: ref }).first().click(); await p.waitForTimeout(2500);
  const line = (await p.locator("main").innerText()).match(/Prepared by · Reviewed by:[^\n]*/)?.[0] ?? "";
  console.log("RECORD:", line);
  ok("QA-447 W5 fail today: the record reads \"Self-reviewed\" (the Representative prepared, sent and approved alone)", /Self-reviewed/.test(line), line);
  ok("QA-447 W5: the record names the Representative's licence number and a time", /R\d{6}/.test(line) && /\d{1,2}:\d{2}/.test(line), line);
  ok("QA-447 W5 fail today: the record never names the Case officer as preparer (they did nothing)", !/Case officer \(Sample\)/.test(line.split("·")[0] ?? ""), line);
  await b.close(); console.log(failed ? `${failed} failed` : "all passed"); process.exit(failed ? 1 : 0);
})();
