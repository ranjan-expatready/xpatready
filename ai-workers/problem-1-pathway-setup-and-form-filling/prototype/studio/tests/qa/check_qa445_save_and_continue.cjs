// qa (13 Nov, Bake walk 1 on main b26ad9430): QA-445. On a Visitor visa family case (principal, spouse, child), Client A
// fills part 1 "Details of visit to Canada" and presses "Save and continue": the screen says "✓ Saved" and stays on part 1
// (the overview then reads it Done). Likely cause: #1643 orders the application's parts after the principal's
// (engine/runtime/case.ts), the web's byPerson puts them first, and #1659's Save and continue works out its target on one
// order and opens it as a position in the other. Expected: Save and continue opens another part (or the overview).
// Fails today; passes when fixed. US$0, live AI off. Through the screens, except opening the case (the product's own route).
//   zsh tools/isolated.sh qa_445 4472 start && node tests/qa/check_qa445_save_and_continue.cjs 4472
//   (loads the configured checkpoint itself when the copy has no released Visitor visa, about 2 min; never :4400)
const fs = require("fs"); const { chromium } = require("playwright");
const port = process.argv[2]; if (!port || port === "4400") { console.log("usage: <port of an isolated copy>, never 4400"); process.exit(2); }
const base = `http://localhost:${port}`;
const call = async (method, path, actor, body) => { const r = await fetch(base + "/api" + path, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); let b = null; try { b = await r.json(); } catch { /* not JSON */ } return { status: r.status, body: b }; };
let failed = 0; const ok = (name, pass, detail) => { if (!pass) failed++; console.log(`${pass ? "PASS" : "FAIL"} ${name}${!pass && detail ? `: ${JSON.stringify(detail).slice(0, 500)}` : ""}`); };
(async () => {
  const vv = async () => ((await call("GET", "/runtime/openable", "user-O")).body ?? []).find((r) => r.combination === "Visitor visa" && r.startable);
  if (!(await vv())) {
    await call("POST", "/demo/reset", "user-A", { confirm: "RESET" });
    const l = await call("POST", "/demo/load", "user-A", { sample: "configured" });
    if (l.status >= 300) { console.log("STOP the configured checkpoint did not load", l.status); process.exit(2); }
  }
  const row = await vv();
  const ref = `QA445-${Date.now() % 100000}`;
  const made = await call("POST", "/runtime/cases", "user-O", { combinationId: row.combination_id, reference: ref, clientActor: "user-P", principal: { displayName: "Sample Principal Q" }, idempotencyKey: ref });
  ok("QA-445 setup: a Visitor visa case opens", made.status < 300 && !!made.body?.id, made); if (!made.body?.id) process.exit(2);
  const caseId = made.body?.id;
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium-1243/chrome-linux64/chrome") ? { executablePath: "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem("qa445")) { localStorage.setItem("xr-actor", "user-O"); sessionStorage.setItem("qa445", "1"); } } catch {} });
  const p = await ctx.newPage(); await p.goto(`${base}/cases/${caseId}`); await p.waitForLoadState("networkidle");
  for (const [btn, name] of [["Add spouse or partner (travelling)", "Sample Spouse Q"], ["Add child (travelling)", "Sample Child Q"]]) {
    await p.getByRole("button", { name: btn }).click(); const d = p.getByRole("dialog"); await d.getByLabel("Name").fill(name); await d.getByRole("button", { name: "Add", exact: true }).click(); await p.waitForTimeout(1500);
  }
  await p.getByRole("button", { name: "Hand to Client A (simulated)" }).click(); await p.waitForTimeout(2000);
  await p.getByRole("button", { name: "Start", exact: true }).first().click(); await p.waitForTimeout(1200);
  const m = p.locator("main");
  ok("QA-445 setup: part 1 is Details of visit to Canada", /Part 1 of \d+ · Details of visit to Canada/.test(await m.innerText()));
  await m.getByLabel("Purpose of the visit to Canada").selectOption({ label: "Family Visit" });
  await m.getByLabel("Street number").fill("12"); await m.getByLabel("Street name").fill("Sample Street"); await m.getByLabel("City or town").fill("Toronto");
  await m.getByLabel("Country", { exact: true }).fill("Canada");
  await m.getByLabel(/Name of a person or institution/).fill("Sample Host Q"); await m.getByLabel(/Relationship of the person/).fill("Cousin");
  await m.getByLabel(/Funds available/).fill("8000");
  for (const [lg, d, mo] of [["Planned first day", "14", "06"], ["Planned last day", "20", "07"]]) { const fsx = m.locator("fieldset", { hasText: lg }); await fsx.getByLabel("Day").fill(d); await fsx.getByLabel("Month").fill(mo); await fsx.getByLabel("Year").fill("2027"); }
  await m.getByRole("button", { name: "Save and continue" }).click(); await p.waitForTimeout(2500);
  const after = new URL(p.url()).searchParams.get("part"); const text = await m.innerText();
  ok("QA-445 setup: the part saved", /✓ Saved|Part 2 of|Client questionnaire/.test(text));
  ok("QA-445 fail today: Save and continue on part 1 opens another part (or the overview), not part 1 again", after !== "1", { part: after, head: text.slice(0, 160) });
  await b.close(); console.log(failed ? `${failed} failed` : "all passed"); process.exit(failed ? 1 : 0);
})();
