// qa (13 Nov, retests before Bake walk 2; Lead 29's row): QA-401 by the frame's person picker, not the hand-off button.
// The case officer sends a family case's filings for review and opens the review (read-only for the officer); the frame's
// picker then changes the person to the Representative: Approve and Send back must appear without a reload; back to the
// Case officer, they must go (the officer never approves). #1583 put the acting person in the review page's query key.
// US$0, live AI off. Headed when DISPLAY is set (a person's view), else headless.
//   zsh tools/isolated.sh qa_401 4473 start && node tests/qa/check_qa401_picker_review.cjs 4473 [shots-folder]
//   (loads the configured checkpoint itself when the copy has no open family case; never :4400)
const fs = require("fs"); const { chromium } = require("playwright");
const port = process.argv[2]; if (!port || port === "4400") { console.log("usage: <port of an isolated copy>, never 4400"); process.exit(2); }
const SHOTS = process.argv[3]; const base = `http://localhost:${port}`;
const call = async (method, path, actor, body) => { const r = await fetch(base + "/api" + path, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); let b = null; try { b = await r.json(); } catch { /* not JSON */ } return { status: r.status, body: b }; };
let failed = 0; const ok = (name, pass, detail) => { if (!pass) failed++; console.log(`${pass ? "PASS" : "FAIL"} ${name}${!pass && detail ? `: ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const shot = async (p, n) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: `${SHOTS}/${n}.png` }); } };
(async () => {
  const fam = async () => { const c = (await call("GET", "/runtime/cases", "user-O")).body; return (Array.isArray(c) ? c : c?.cases ?? []).find((x) => x.reference === "SAMPLE-VV-FAMILY-1"); };
  if (!(await fam())) {
    await call("POST", "/demo/reset", "user-A", { confirm: "RESET" });
    const l = await call("POST", "/demo/load", "user-A", { sample: "configured" });
    if (l.status >= 300) { console.log("STOP the configured checkpoint did not load", l.status); process.exit(2); }
  }
  const c = await fam(); ok("QA-401 setup: the family case is open", !!c); if (!c) process.exit(2);
  const exe = fs.existsSync("/opt/pw-browsers/chromium-1243/chrome-linux64/chrome") ? { executablePath: "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome" } : {};
  const b = await chromium.launch({ headless: !process.env.DISPLAY, ...(process.platform === "darwin" ? { channel: "chrome" } : exe) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem("qa401")) { localStorage.setItem("xr-actor", "user-O"); sessionStorage.setItem("qa401", "1"); } } catch {} });
  const p = await ctx.newPage(); let reloads = 0; p.on("load", () => reloads++);
  await p.goto(`${base}/cases/${c.id}`); await p.waitForLoadState("networkidle");
  const send = p.getByRole("button", { name: "Send for review", exact: true }); await send.scrollIntoViewIfNeeded(); await send.click();
  const d = p.getByRole("dialog"); const go = d.getByRole("button", { name: /^Send \d+ filings? for review$/ });
  ok("QA-401 setup: the officer can send the filings for review", (await go.count()) > 0, (await d.innerText()).slice(0, 300));
  await go.click(); await p.waitForTimeout(2500);
  await p.getByRole("link", { name: "Open the review" }).first().click(); await p.waitForTimeout(2500); await shot(p, "401-1-officer-review");
  const btns = async () => ({ approve: await p.getByRole("button", { name: "Approve", exact: true }).count(), sendBack: await p.getByRole("button", { name: /^Send back/ }).count() });
  const asOfficer = await btns();
  ok("QA-401 the case officer on the review sees no Approve and no Send back", asOfficer.approve === 0 && asOfficer.sendBack === 0, asOfficer);
  const loadsBefore = reloads; const picker = p.locator("header select").first();
  await picker.selectOption({ label: "Representative" }); await p.waitForTimeout(2500); await shot(p, "401-2-picker-representative");
  const asRep = await btns();
  ok("QA-401 fail before #1583: after the picker changes to the Representative, Approve and Send back show without a reload", asRep.approve > 0 && asRep.sendBack > 0 && reloads === loadsBefore, { ...asRep, reloads: reloads - loadsBefore, url: p.url() });
  ok("QA-401 the review page is still the review (the picker kept the page)", /representative-review/.test(p.url()), p.url());
  await picker.selectOption({ label: "Case officer" }); await p.waitForTimeout(2500); await shot(p, "401-3-picker-officer");
  const back = await btns();
  ok("QA-401 reverse: back to the Case officer by the picker, Approve and Send back are gone", back.approve === 0 && back.sendBack === 0, back);
  await b.close(); console.log(failed ? `${failed} failed` : "all passed"); process.exit(failed ? 1 : 0);
})();
