// C11.7 part B walk at 1440 px on an isolated copy of the branch: Demo › Reset to the six (through the Demo menu), then
// Provincial nominee › Forms, Documents and To review › Proposals; then user-B accepts the certificate on the Proposals
// page and the author adds it as a required line on Documents (the API stands in only where noted).
const [BASE, OUT, STUDIO, DB] = process.argv.slice(2);
const sql = (q) => require("node:child_process").execFileSync("psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-XAtqc", q], { encoding: "utf8" }).trim();
const { chromium } = require(STUDIO + "/node_modules/playwright");
const api = async (m, path, body, actor = "user-A") => { const r = await fetch(BASE + "/api" + path, { method: m, headers: { "x-actor": actor, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); }); p.on("pageerror", (e) => errs.push(String(e)));
  const as = async (actor) => { await p.goto(BASE + "/"); await p.evaluate((a) => { try { localStorage.setItem("xr-actor", a); } catch {} }, actor); };
  const say = (s) => console.log(s);
  await as("user-A"); await p.goto(BASE + "/"); await p.waitForTimeout(2500);
  // Demo › Reset to the six, as a person: open the Demo menu, choose it, type RESET, confirm.
  await p.getByRole("button", { name: /demo/i }).first().click(); await p.waitForTimeout(500);
  await p.getByRole("menuitem", { name: /reset to the six/i }).or(p.getByRole("button", { name: /reset to the six/i })).first().click(); await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + "/walk-b-0-reset-dialog.png" });
  const t0 = Date.now(); await p.locator('input').last().fill("RESET"); await p.keyboard.press("Enter");
  await p.getByText("Type RESET to confirm").waitFor({ state: "detached", timeout: 180000 });
  await p.waitForTimeout(1500); await p.screenshot({ path: OUT + "/walk-b-0b-after-reset.png" });
  say(`Reset to the six through the Demo menu: ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  const pn = sql("select id from combination where label = 'Express Entry stream'"); say("Provincial nominee id: " + pn);
  await p.goto(BASE + "/c/" + pn + "/forms"); await p.waitForTimeout(3500); await p.screenshot({ path: OUT + "/walk-b-1-pn-forms.png", fullPage: true });
  const f = await p.locator("main").innerText();
  for (const code of ["IMM 0008", "IMM 0008 DEP", "IMM 5669", "IMM 5406", "IMM 5476"]) say(code + " on Forms: " + f.includes(code));
  say("Online named on Forms: " + /Online/.test(f) + " · priced 'Draft with AI (about' text: " + /Draft with AI \(about/.test(f));
  await p.goto(BASE + "/c/" + pn + "/documents"); await p.waitForTimeout(3000); await p.screenshot({ path: OUT + "/walk-b-2-pn-documents-before.png", fullPage: true });
  say("Documents before: " + (await p.locator("main").innerText()).slice(0, 400).replace(/\n/g, " | "));
  await as("user-B"); await p.goto(BASE + "/review/proposals"); await p.waitForTimeout(3500);
  const grp = p.getByText(/Express Entry stream/).first(); say("Express Entry stream group on Proposals: " + (await grp.count() > 0));
  if (await grp.count()) { await grp.scrollIntoViewIfNeeded(); await grp.click(); await p.waitForTimeout(2000); }
  const row = p.getByText("Provincial nomination certificate").first(); say("certificate on To review › Proposals (user-B): " + (await row.count() > 0));
  await row.scrollIntoViewIfNeeded().catch(() => {}); await p.screenshot({ path: OUT + "/walk-b-3-proposals-certificate.png" });
  // user-B accepts it (the queue's decide route, as the Accept button sends it; the UI row is shown above).
  const id = sql("select id from proposal_item where kind = 'document_type' and status = 'waiting' and payload->>'name' = 'Provincial nomination certificate'"); say("waiting proposal: " + !!id);
  const acc = id ? await api("POST", "/review/proposals/decide", { ids: [id], action: "accept" }, "user-B") : { status: 0 };
  const key = acc.body?.items?.[0]?.landedAs; say("accepted by user-B: " + acc.status + " → " + key);
  const add = await api("POST", `/combinations/${pn}/requirements`, { documentTypeKey: key, attachMode: "COMBINATION_MANDATORY", appliesToRoles: "principal_applicant", providedBy: "client" });
  say("author adds the required line: " + add.status);
  await as("user-A"); await p.goto(BASE + "/c/" + pn + "/documents"); await p.waitForTimeout(3000); await p.screenshot({ path: OUT + "/walk-b-4-pn-documents-after.png", fullPage: true });
  say("Documents after shows the certificate: " + /nomination certificate/i.test(await p.locator("main").innerText()));
  say("console errors: " + errs.length + (errs.length ? " " + errs.slice(0, 3).join(" | ") : ""));
  await b.close();
})().catch((e) => { console.error("WALK ERROR " + e.message); process.exit(1); });
