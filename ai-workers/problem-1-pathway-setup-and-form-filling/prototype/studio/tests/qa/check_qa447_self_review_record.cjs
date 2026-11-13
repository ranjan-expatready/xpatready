// qa (13 Nov, retests before Bake walk 2; Lead 29's ruling on #1656 question 4, P-154/P-155): a filing the Representative
// prepared, sent for review and approved alone must be recorded "Self-reviewed" with their name, licence number and time,
// never as a second person's review. Walk 1's Study permit case: opened with the default team (Case officer (Sample) as
// officer, Representative (Sample) of record), then worked end to end by the Representative. This check repeats that on a
// fresh copy and reads the record on the case page (Ready to file's "Prepared by · Reviewed by" line).
// Part 2 (13 Nov): a contrast case (B) opened with the Representative as the case's only officer (caseOfficers
// ["user-R"]) tells whether "Self-reviewed" turns on case-team membership (the earlier lane's reading of the code).
// The preparer assertion reads the names after the label's colon (the label "Prepared by · Reviewed by" holds a "·" itself).
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
  const row = await sp();
  const exe = fs.existsSync("/opt/pw-browsers/chromium-1243/chrome-linux64/chrome") ? { executablePath: "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome" } : {};
  const b = await chromium.launch({ headless: true, ...exe });
  const walk = async (tag, extra) => {
    const ref = `QA447${tag}-${Date.now() % 100000}`;
    const made = await call("POST", "/runtime/cases", "user-R", { combinationId: row.combination_id, reference: ref, clientActor: "user-P", principal: { displayName: `Sample Student ${tag}` }, idempotencyKey: ref, ...extra });
    ok(`${tag} setup: a Study permit case opens (${extra.caseOfficers ? "the Representative as its only officer" : "the dialog's default team"})`, made.status < 300 && !!made.body?.id, made); if (!made.body?.id) return null;
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    await ctx.addInitScript(() => { try { localStorage.setItem("xr-actor", "user-R"); } catch {} });
    const p = await ctx.newPage(); await p.goto(`${base}/cases/${made.body.id}`); await p.waitForLoadState("networkidle");
    const team = (await call("GET", `/runtime/cases/${made.body.id}/team`, "user-R")).body; console.log(`${tag} TEAM:`, JSON.stringify(team).slice(0, 300));
    const send = p.getByRole("button", { name: /^(Send for review|Review now)$/ }); await send.scrollIntoViewIfNeeded(); await send.click();
    const go = p.getByRole("dialog").getByRole("button", { name: /^(Send|Review) \d+ filings? (for review|now)$/ }); await go.click(); await p.waitForTimeout(2500);
    const open = p.getByRole("link", { name: "Open the review" }); if (await open.count()) { await open.first().click(); await p.waitForTimeout(2500); }
    const sentBy = (await p.locator("main").innerText()).match(/Sent by [^,]+/)?.[0];
    ok(`${tag} setup: the review says it was sent by the Representative`, /Representative/.test(sentBy ?? ""), sentBy);
    await p.getByRole("button", { name: "Approve", exact: true }).click(); await p.waitForTimeout(900);
    let selfBox = false; const d = p.getByRole("dialog");
    if (await d.count()) { const self = d.getByRole("checkbox", { name: /prepared and reviewed this filing myself/ }); selfBox = (await self.count()) > 0; if (selfBox) await self.check(); await d.getByRole("button", { name: "Approve", exact: true }).click(); await p.waitForTimeout(2000); }
    console.log(`${tag} APPROVE DIALOG asked "I prepared and reviewed this filing myself":`, selfBox);
    ok(`${tag} setup: the Representative approved the filing`, (await p.getByRole("button", { name: / · Round 1 Approved/ }).count()) > 0);
    await p.getByRole("link", { name: ref }).first().click(); await p.waitForTimeout(2500);
    const line = (await p.locator("main").innerText()).match(/Prepared by · Reviewed by:[^\n]*/)?.[0] ?? "";
    console.log(`${tag} RECORD:`, line); await ctx.close(); return line;
  };
  // A: walk 1's set-up (default team: Case officer (Sample) as officer; the Representative does everything).
  const A = await walk("A", {});
  if (A !== null) {
    const preparers = A.replace(/^Prepared by · Reviewed by:\s*/, "").split(" · ")[0];
    ok("QA-447 W5 fail today: the record reads \"Self-reviewed\" (the Representative prepared, sent and approved alone)", /Self-reviewed/.test(A), A);
    ok("QA-447 W5: the record names the Representative's licence number and a time", /R\d{6}/.test(A) && /\d{1,2}:\d{2}/.test(A), A);
    ok("QA-447 W5 fail today: the record never names the Case officer as preparer (they did nothing)", !/Case officer \(Sample\)/.test(preparers), { preparers, line: A });
  }
  // B (contrast, not a W5 assertion): the Representative is the case's only officer. Expected "Self-reviewed".
  const B = await walk("B", { caseOfficers: ["user-R"] });
  if (B !== null) ok("contrast B: with the Representative as the case's only officer, the record reads \"Self-reviewed\"", /Self-reviewed/.test(B), B);
  await b.close(); console.log(failed ? `${failed} failed` : "all passed"); process.exit(failed ? 1 : 0);
})();
