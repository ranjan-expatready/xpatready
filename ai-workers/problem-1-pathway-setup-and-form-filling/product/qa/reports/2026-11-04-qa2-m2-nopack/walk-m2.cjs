// qa2 4 Nov: 1440 px walk on Demo › Reset to the six of the first 11 M2 Works rows with no acceptance pack (Lead 4's job).
// Like a person: pages and the words on them, two uploads through Shared library › Forms, the held file as uploader and as
// the Approver. US$0, no priced button clicked. Prints one line per check; screenshots per row.
const STUDIO = process.argv[2], OUT = process.argv[3], BASE = "http://localhost:4480", ALTERED = process.argv[4];
const { chromium } = require(STUDIO + "/node_modules/playwright");
const OFF = STUDIO + "/../../official-sources/ircc";
const api = (path, actor = "user-A", init = {}) => fetch(BASE + "/api" + path, { ...init, headers: { "x-actor": actor, "content-type": "application/json", ...(init.headers || {}) } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
let pass = 0, fail = 0; const ok = (s, v, d) => { v ? pass++ : fail++; console.log((v ? "PASS  " : "FAIL  ") + s + (d !== undefined ? " — " + JSON.stringify(d).slice(0, 220) : "")); };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const as = async (actor) => { await p.goto(BASE + "/"); await p.evaluate((a) => { try { localStorage.setItem("xr-actor", a); } catch {} }, actor); };
  const go = async (u, wait = 2500) => { await p.goto(BASE + u); await p.waitForTimeout(wait); return p.locator("main").innerText().catch(() => p.locator("body").innerText()); };
  const shot = (n, full = false) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: full });
  await as("user-A");
  // C1.1 every combination by workspace
  let t = await go("/", 3500); await shot("C1.1-programs");
  const combos = (await api("/combinations")).body; const list = Array.isArray(combos) ? combos : (combos?.combinations ?? combos?.items ?? []);
  ok("C1.1 Immigration programs lists the six's combinations (5 Retail + 1 Corporate), each with its trail and status", /5 combinations/.test(t) && /Retail\s*5/.test(t) && /Corporate and employers\s*1/.test(t), (t.match(/\d+ combinations[^\n]*/) || [""])[0]);
  ok("C1.1 a card shows its step count and one button", /of 5 steps/.test(t) && /(Resume setup|Start setup|Open)/.test(t));
  // C1.2 path builder: Program structure › Add
  t = await go("/structure", 3000); await shot("C1.2-structure");
  ok("C1.2 Program structure shows the tree and one Add", /Program structure/.test(t) && (await p.getByRole("button", { name: /^Add/ }).count()) > 0, (t.match(/Add[^\n]{0,40}/) || [""])[0]);
  // C1.4 combination page: trail, status, the one next step
  const vv = (await api("/demo/status")).body; const rows = (await p.evaluate(async () => (await fetch("/api/review/proposals", { headers: { "x-actor": "user-A" } })).json())).groups || [];
  const vvId = (rows.find((g) => g.kind === "combination") || {}).id?.split(":")[1];
  t = await go(`/c/${vvId}`, 3500); await shot("C1.4-combination");
  ok("C1.4 the combination page shows the trail, status and exactly one Next step", /Immigration programs/.test(t) && /(In progress|In setup|Not released yet)/.test(t) && (t.match(/Next step/g) || []).length === 1, (t.match(/Next step[^\n]*\n[^\n]*/) || [""])[0]);
  // C1.8 form line: copies, minimum age, who signs
  t = await go(`/c/${vvId}/forms`, 3500);
  ok("C1.8 the form lines show Signature and Signed by columns", /Signature/.test(t) && /Signed by/.test(t));
  const line = p.getByRole("button", { name: /IMM 5257\b/ }).first();
  if (await line.count()) { await line.click(); await p.waitForTimeout(2000); const d = await p.getByRole("dialog").first().innerText().catch(() => ""); await shot("C1.8-line-drawer"); ok("C1.8 the line drawer offers copies, a minimum age and who signs", /Copies/i.test(d) && /age/i.test(d) && /sign/i.test(d), d.slice(0, 200)); await p.keyboard.press("Escape"); }
  else { await shot("C1.8-forms", true); ok("C1.8 a form line opens its drawer from the row (IMM 5257)", false, "no IMM 5257 row button"); }
  // C2.1 upload an IRCC PDF not in the six: code, edition, checksum read without AI
  t = await go("/library/forms", 3000);
  await p.locator('input[type="file"]').first().setInputFiles(OFF + "/forms/imm1295e.pdf"); await p.waitForTimeout(8000);
  t = await p.locator("main").innerText(); await shot("C2.1-upload-imm1295");
  ok("C2.1 uploading IMM 1295 reads its code and edition by rules, no AI, US$0", /IMM 1295/.test(t) && /(No AI|no AI|without AI|US\$0)/.test(t), (t.match(/[^\n]*IMM 1295[^\n]*/) || [""])[0]);
  // C2.2 a file not on the approved list (an altered official PDF) is held with a plain reason
  await p.locator('input[type="file"]').first().setInputFiles(ALTERED); await p.waitForTimeout(8000);
  t = await p.locator("main").innerText(); await shot("C2.2-held-altered");
  ok("C2.2 an altered IMM 5409 is held with a plain reason, not added", /(Held|held)/.test(t) && /(source|verif|check)/i.test(t), (t.match(/[^\n]*(Held|held)[^\n]*/) || [""])[0]);
  // C2.3 the uploader cannot approve; the Approver compares and approves on To review
  const held = (await p.evaluate(async () => { const r = await fetch("/api/review", { headers: { "x-actor": "user-A" } }); return r.ok ? r.json() : null; }));
  t = await go("/review", 3500); await shot("C2.3-to-review-uploader");
  const heldLink = p.locator('a[href*="/review/held/"]').first();
  ok("C2.3 To review lists the held file", (await heldLink.count()) > 0);
  if (await heldLink.count()) {
    const href = await heldLink.getAttribute("href"); await heldLink.click(); await p.waitForTimeout(3000); t = await p.locator("main").innerText(); await shot("C2.3-held-as-uploader", true);
    const apA = p.getByRole("button", { name: /^Approve/ }).first();
    ok("C2.3 the uploader sees the reason and cannot approve their own file (button off or refused)", (await apA.count()) === 0 || (await apA.isDisabled()), (t.match(/[^\n]*(different person|second person|another person)[^\n]*/i) || [""])[0]);
    await as("user-B"); t = await go(href, 3500); await shot("C2.3-held-as-approver", true);
    const apB = p.getByRole("button", { name: /^Approve/ }).first();
    ok("C2.3 the Approver sees what to compare and an Approve button", (await apB.count()) > 0 && !(await apB.isDisabled()), (t.match(/[^\n]*(compare|IRCC page|canada\.ca)[^\n]*/i) || [""])[0]);
    await as("user-A");
  }
  // C3.1 AI field proposals: reuse/new/ambiguous beside the source, the field's format
  t = await go("/review/proposals?group=" + encodeURIComponent("edition:IMM 5257 (09-2023)"), 6000); await shot("C3.1-proposals-imm5257");
  ok("C3.1 IMM 5257's field proposals say reuse or new and how sure (bands)", /(New library item|Reuses|reuse)/i.test(t) && /(Check|Decide|Ready to accept)/.test(t));
  const jobLink = p.getByRole("link", { name: /form-field page|Open on/i }).first();
  if (await jobLink.count()) { await jobLink.click(); await p.waitForTimeout(5000); t = await p.locator("main").innerText(); await shot("C3.1-form-field-page"); ok("C3.1 the form-field page shows each form field beside IRCC's words and its proposed shared field", /(IRCC|printed|quote|On the form)/i.test(t) && /(shared field|Shared field)/i.test(t), t.slice(0, 160)); }
  // C3.5 shared fields keep aliases; merge
  t = await go("/library/fields", 4000); await shot("C3.5-fields");
  ok("C3.5 Shared library › Fields lists fields in words", /Fields/.test(t) && !/canonical/i.test(t));
  const fl = p.locator('a[href*="/library/fields/"]').first();
  if (await fl.count()) { await fl.click(); await p.waitForTimeout(3000); t = await p.locator("main").innerText(); await shot("C3.5-field-page"); ok("C3.5 a field's page shows its other names (aliases) and a way to merge", /(Also called|Other names|alias)/i.test(t) && /Merge/i.test(t), (t.match(/[^\n]*(Also called|Other names|alias)[^\n]*/i) || [""])[0]); }
  else ok("C3.5 a field opens its page", false, "no field link on the six (library empty until field maps are applied)");
  // C3.7 retire or delete, blocked while in use
  t = await go("/library/forms", 4000); await shot("C3.7-forms-library", true);
  ok("C3.7 a form in use is not deletable, and says why", /(Still used|used by|Used by)/i.test(t), (t.match(/[^\n]*(Still used|Used by)[^\n]*/i) || [""])[0]);
  console.log(`${pass} passed, ${fail} failed · page errors ${errs.length}${errs.length ? ": " + errs.slice(0, 2).join(" | ") : ""}`);
  await b.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("WALK ERROR " + e.message); process.exit(2); });
