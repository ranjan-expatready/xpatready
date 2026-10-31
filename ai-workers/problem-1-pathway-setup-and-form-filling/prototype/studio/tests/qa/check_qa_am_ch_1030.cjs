// qa after-merge, 30 Oct: W1-10 slice 1 channels (PR #103) walked like a person and probed underneath, beyond the
// forms lane's own checks: paper filing on the Forms tab, two tabs choosing the IRCC account, the library's
// "what IRCC accepts" set per account through its panel (double click, non-English reason), the approver seeing which
// combinations a change leaves with a refused line before Approve, roles by API, wrong and long input in plain words,
// and no decision ids or system names on screen. 400, 1024 and 1440 px, axe. Sample data, no model call, US$0.
// Never clicks a button that names a price (QA-100).
//   zsh studio/tools/isolated.sh qa_ch 4472 start && node studio/tests/qa/check_qa_am_ch_1030.cjs 4472 xr_studio_qa_ch
const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4472), DB = process.argv[3] ?? "xr_studio_qa_ch", BASE = `http://localhost:${PORT}`;
const OUT = process.argv[4] ?? null; // optional screenshot folder
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, fail = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300)}` : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Words a person should never read: decision or requirement ids, enum spellings, raw validator words.
const LEAKS = /\bP-\d{2,3}\b|\bC-\d{1,2}\b|SIGNED_PDF_UPLOAD|PDF_UPLOAD|NOT_NEEDED|IRCC_SECURE_ACCOUNT|PR_PORTAL|HAND_SCANNED|TYPED_NAME|Invalid (enum|input)|Too big|Expected string|String must contain/;

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: process.env.HEADED !== "1" });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const headers = { "content-type": "application/json" }; if (init.actor !== null) headers["x-actor"] = init.actor ?? "user-A";
    const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const axe = async (page, label) => { const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); step(`C1.6: axe: ${label}`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes.length}`).join("; ")); };
  const widths = async (page, label) => { for (const w of [400, 1024, 1440]) { await page.setViewportSize({ width: w, height: 900 }); await sleep(250);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); step(`C1.6: ${w} px: ${label} has no sideways page scroll`, sw <= 1, `${sw} px`); }
    await page.setViewportSize({ width: 1440, height: 900 }); await sleep(150); };
  const shot = async (page, name) => { if (OUT) await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); };
  const asActor = async (page, actor) => { await page.goto(`${BASE}/`); await page.evaluate((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* ignore */ } }, actor); };
  const leaks = async (page, label, scope = "body") => { const t = await page.locator(scope).first().innerText(); const m = t.match(LEAKS); step(`C1.6 PRODUCT §4: ${label}: no decision ids, system names or raw validator words on screen`, !m, m ? `"${m[0]}" in …${t.slice(Math.max(0, t.indexOf(m[0]) - 80), t.indexOf(m[0]) + 60).replace(/\s+/g, " ")}…` : undefined); };
  try {
    await asActor(p, "user-A");
    const load = await api("/demo/load", { method: "POST" });
    step("set-up: Load sample", load.status < 300, load.status);
    const vv = sql("select id from combination where label='With an LMIA' limit 1");
    const row = (page, code) => page.locator(`tr[data-line="${code}"]`);
    const portalOf = () => sql(`select coalesce(portal_key,'') from combination where id='${vv}'`);
    const waitPortal = async (want) => { for (let i = 0; i < 40 && portalOf() !== want; i++) await sleep(250); return portalOf(); };
    const chOf = (code) => sql(`select cf.channel from combination_form cf join gov_form_def d on d.id=cf.gov_form_def_id where cf.combination_id='${vv}' and d.form_key='${code}' and cf.status='DRAFT'`);

    // ── J1 author, Forms tab: the combination files on paper (no IRCC account)
    await p.goto(`${BASE}/c/${vv}/forms`);
    await row(p, "IMM 5707").waitFor({ timeout: 30000 });
    const main = p.locator("main");
    const accountBox = main.getByRole("combobox", { name: "IRCC account this combination files through" });
    const accOpts = await accountBox.locator("option").allInnerTexts();
    step("C1.6 J1: the account picker names every account in words, paper filing included", accOpts.some((t) => /No account \(paper filing\)/.test(t)) && accOpts.some((t) => /IRCC secure account/.test(t)), accOpts);
    await shot(p, "01-forms-tab-account-not-set");
    await accountBox.selectOption("PAPER");
    step("C1.6 J1: picking 'No account (paper filing)' on the screen saves it", (await waitPortal("PAPER")) === "PAPER", portalOf());
    await sleep(800);
    const toast = (await p.locator("[role=status], [role=alert]").allInnerTexts()).join(" ").replace(/\s+/g, " ");
    step("C1.6 J1: after the change the screen names the lines the new account does not accept (they are kept, not changed silently)", /IMM 5707|IMM 5475|IMM 1295|not accept|Paper/i.test(toast) && chOf("IMM 5707") === "PDF_UPLOAD", toast || "(no message)");
    await p.reload(); await row(p, "IMM 5707").waitFor({ timeout: 30000 });
    const filed = row(p, "IMM 5707").getByRole("combobox", { name: "How IMM 5707 is filed" });
    const opts = await filed.locator("option").evaluateAll((os) => os.map((o) => ({ v: o.value, off: o.disabled, text: o.textContent, why: o.title })));
    const o = (v) => opts.find((x) => x.v === v) ?? {};
    step("C1.6 C-3 (break M6) J1: on paper filing only Paper is offered; Online and PDF upload greyed, each with a reason in words", !o("PAPER").off && o("ONLINE").off && o("PDF_UPLOAD").off && !!(o("ONLINE").why || /not|only/i.test(o("ONLINE").text ?? "")), opts);
    const note = (await row(p, "IMM 5707").innerText()).replace(/\s+/g, " ");
    step("C1.6 J1: the PDF upload line kept from before says on its row why it cannot stay", /paper|Paper|not accept|only/i.test(note), note.slice(0, 240));
    await filed.selectOption("PAPER"); await sleep(1200);
    step("C1.6 C-2 J1: Paper saved and signed in pen", chOf("IMM 5707") === "PAPER" && /pen/i.test(await row(p, "IMM 5707").innerText()), chOf("IMM 5707"));
    await leaks(p, "Forms tab on paper filing", "main");
    await axe(p, "Forms tab on paper filing"); await widths(p, "Forms tab on paper filing");
    await shot(p, "02-forms-tab-paper-filing");
    const pdfOnPaper = await api(`/combinations/${vv}/forms/${encodeURIComponent("IMM 1295")}/channel`, { method: "PATCH", data: { channel: "ONLINE", from: "PDF_UPLOAD" } });
    step("C1.6 C-3 J1 fail: Online on a paper-filing combination refused by API, in words", pdfOnPaper.status === 400 && /paper/i.test(JSON.stringify(pdfOnPaper.body)) && !LEAKS.test(pdfOnPaper.body?.detail ?? ""), pdfOnPaper.body?.detail ?? pdfOnPaper.status);

    // ── J2 two tabs: both see 'paper filing'; the first moves to the PR Portal, the second then picks the IRCC secure account
    const p2 = await ctx.newPage(); p2.on("pageerror", (e) => errs.push(e.message));
    await p2.goto(`${BASE}/c/${vv}/forms`); await row(p2, "IMM 5707").waitFor({ timeout: 30000 });
    const box2 = p2.locator("main").getByRole("combobox", { name: "IRCC account this combination files through" });
    await accountBox.selectOption("PR_PORTAL"); await waitPortal("PR_PORTAL");
    await box2.selectOption("IRCC_SECURE_ACCOUNT"); await sleep(1500);
    const msg2 = (await p2.locator("[role=status], [role=alert], [role=note]").allInnerTexts()).join(" ").replace(/\s+/g, " ");
    step("C1.6 Q1 J2: the second tab's stale choice is refused and the screen says so in words (changed to PR Portal while you were choosing)", portalOf() === "PR_PORTAL" && /while you were choosing|PR Portal/.test(msg2) && !LEAKS.test(msg2), `${portalOf()} · ${msg2 || "(no message)"}`);
    await sleep(500);
    step("C1.6 Q1 J2: the second tab's picker shows the saved account after the refusal, not the refused one", (await box2.inputValue()) === "PR_PORTAL", await box2.inputValue());
    await shot(p2, "03-second-tab-stale-account");
    await p2.close();

    // ── J3 author, Shared library › Forms: set what IRCC accepts per account, non-English reason, double click
    await p.goto(`${BASE}/library/forms`);
    await p.getByRole("button", { name: "Actions for IMM 5707" }).first().waitFor({ timeout: 30000 });
    const cell = (await p.locator("tr", { hasText: "IMM 5707" }).first().innerText()).replace(/\s+/g, " ");
    step("C1.6 J3: the library row shows what IRCC accepts", /Online|PDF upload|Paper|Not set yet/.test(cell), cell.slice(0, 200));
    await p.locator("tr", { hasText: "IMM 5707" }).first().getByRole("button", { name: /Open|IMM 5707/ }).first().click().catch(async () => { await p.locator("tr", { hasText: "IMM 5707" }).first().click(); });
    const drawer = p.locator("[role=dialog]").first();
    await drawer.waitFor({ timeout: 10000 });
    await leaks(p, "library drawer", "[role=dialog]");
    const set = drawer.getByRole("button", { name: /what IRCC accepts/ });
    step("C11.18 J3: the author can open 'Set/Correct what IRCC accepts' in the drawer", await set.count() === 1);
    await set.click();
    const accSel = drawer.getByRole("combobox", { name: "For which IRCC account" });
    const accSelText = (await drawer.innerText()).replace(/\s+/g, " ");
    step("C11.18 J3: the panel's hint names no decision id", !/\(P-\d+\)/.test(accSelText), (accSelText.match(/.{0,60}\(P-\d+\).{0,10}/) ?? [""])[0]);
    await accSel.selectOption("PR_PORTAL");
    const nn = drawer.getByRole("checkbox", { name: /Not needed/ });
    step("C11.18 J3: Not needed can be chosen for one account (it is greyed only for any account)", await nn.count() === 1 && !(await nn.isDisabled()));
    for (const c of ["Online", "PDF upload", "Paper", "Not needed"]) { const box = drawer.getByRole("checkbox", { name: new RegExp(`^${c}`) }); if (await box.isChecked().catch(() => false)) await box.uncheck(); }
    await drawer.getByRole("checkbox", { name: /^Online/ }).check();
    const reason = drawer.getByRole("textbox").last();
    await drawer.getByRole("textbox", { name: "The canada.ca line it comes from" }).fill("");
    await reason.fill("Révisé : le portail RP accepte en ligne · 確認済み (test qa)");
    const send = drawer.getByRole("button", { name: /Send|approval|Propose|Save/ }).last();
    await send.dblclick(); await sleep(1500);
    const waiting = sql(`select count(*) from library_change where status='WAITING' and kind ilike '%accept%' and key like '%5707%'`);
    step("C11.18 J3: a double click sends one change, waiting for a second person", waiting === "1", waiting);
    const reasonSaved = sql(`select coalesce(reason,'') || ' ' || matches::text from library_change where status='WAITING' and kind ilike '%accept%' and key like '%5707%' order by proposed_at desc limit 1`);
    step("C11.18 J3: the non-English reason is kept exactly", /Révisé/.test(reasonSaved) && /確認済み/.test(reasonSaved), reasonSaved.slice(0, 200));
    await shot(p, "04-library-accepts-sent");
    const changeId = sql(`select id from library_change where status='WAITING' and kind ilike '%accept%' and key like '%5707%' order by proposed_at desc limit 1`);

    // ── J4 approver: sees which combinations the change leaves with a refused line, before Approve
    const pb = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
    pb.on("pageerror", (e) => errs.push(e.message));
    await asActor(pb, "user-B");
    await pb.goto(`${BASE}/review`); await sleep(2000);
    const queue = (await pb.locator("main").innerText()).replace(/\s+/g, " ");
    step("C11.18 J4: the approver's To review lists the accepts change for IMM 5707", /IMM 5707/.test(queue) && /accept/i.test(queue), queue.slice(0, 300));
    const seen = await api(`/library/changes/${changeId}`, { actor: "user-B" });
    const imp = seen.body?.accepts_impact ?? [];
    step("C11.18 (break M5) J4: the change names With an LMIA (PR Portal, IMM 5707 on Paper) as left with a refused line, with why", imp.some((i) => i.label === "With an LMIA") , imp);
    await pb.goto(`${BASE}/review/change/${changeId}`); await sleep(2500);
    const detail = (await pb.locator("main, [role=dialog]").allInnerTexts()).join(" ").replace(/\s+/g, " ");
    const iImpact = detail.search(/With an LMIA/), iApprove = detail.search(/Approve/);
    step("C11.18 J4: on screen the impact (With an LMIA) is shown above Approve", iImpact >= 0 && iApprove > iImpact, detail.slice(Math.max(0, iImpact - 80), iImpact + 200));
    await leaks(pb, "approver's change detail", "main");
    await axe(pb, "approver's accepts change"); await widths(pb, "approver's accepts change");
    await shot(pb, "05-approver-accepts-impact");
    const self = await api(`/library/changes/${changeId}/approve`, { method: "POST", data: { note: "self" }, actor: "user-A" });
    step("C11.18 J4 fail: the author cannot approve their own change (403, in words)", self.status === 403 && !LEAKS.test(self.body?.detail ?? ""), self.body?.detail ?? self.status);

    // ── J5 roles and input underneath
    const acct = (actor, data) => api(`/combinations/${vv}/account`, { method: "PATCH", data, actor });
    let r = await acct("user-P", { account: "PAPER", from: "PR_PORTAL" });
    step("C1.6 J5 roles: a client cannot change the IRCC account (403)", r.status === 403, r.status);
    r = await acct(null, { account: "PAPER", from: "PR_PORTAL" });
    step("C1.6 J5 roles: nobody signed in: 401", r.status === 401, r.status);
    r = await acct("user-B", { account: "PAPER", from: "PR_PORTAL" });
    step("C1.6 J5 roles: the approver (not an author) cannot change the IRCC account (403)", r.status === 403, r.status);
    r = await acct("user-O", { account: "PAPER", from: "PR_PORTAL" });
    step("C1.6 J5 roles: a case officer cannot change the IRCC account (403)", r.status === 403, r.status);
    r = await acct("user-A", { account: "MAPLE_PORTAL", from: "PR_PORTAL" });
    step("C1.6 J5 input: an unknown account is refused, naming the accounts in words", r.status === 400 && /IRCC secure account/.test(r.body?.detail ?? JSON.stringify(r.body)) && !LEAKS.test(r.body?.detail ?? ""), r.body?.detail ?? r.body);
    const ch = (data) => api(`/combinations/${vv}/forms/${encodeURIComponent("IMM 1295")}/channel`, { method: "PATCH", data });
    r = await ch({ channel: "SIGNED_PDF_UPLOAD", from: "PDF_UPLOAD" });
    step("C1.6 C-1 J5: the old spelling is refused in words", r.status === 400 && /Online, PDF upload, Paper or Not needed/.test(JSON.stringify(r.body)), r.body?.detail ?? r.body);
    r = await ch({ channel: "PDF_UPLOAD", signature: "QUILL", from: "PDF_UPLOAD" });
    step("C1.6 C-2 J5: an unknown signature is refused in words", r.status === 400 && /typed name|signed by hand/.test(JSON.stringify(r.body)) && !LEAKS.test(r.body?.detail ?? ""), r.body?.detail ?? r.body);
    r = await ch({ channel: "PDF_UPLOAD", fromSignature: "QUILL", from: "PDF_UPLOAD" });
    step("C1.6 J5 (break m6): an unknown 'from' signature is refused in words, not validator words", r.status === 400 && !LEAKS.test(JSON.stringify(r.body)), r.body?.detail ?? r.body);
    r = await api(`/library/forms/${encodeURIComponent("IMM 1295")}/accepts`, { method: "POST", data: { account: "ANY", channels: ["PDF_UPLOAD"], quote: "x".repeat(401) } });
    step("C11.18 J5 (break m6): a 401-character quote is refused in words, not validator words", r.status === 400 && !LEAKS.test(JSON.stringify(r.body)), r.body?.detail ?? r.body);
    r = await api(`/library/forms/${encodeURIComponent("IMM 1295")}/accepts`, { method: "POST", data: { account: "ANY", channels: [], reason: "empty" } });
    step("C11.18 J5: no channel ticked is refused in words", r.status === 400 && !LEAKS.test(JSON.stringify(r.body)), r.body?.detail ?? r.body);
    r = await api(`/library/forms/${encodeURIComponent("IMM 1295")}/accepts`, { method: "POST", data: { account: "ANY", channels: ["NOT_NEEDED"], reason: "any" } });
    step("C11.18 J5: Not needed for any account is refused in words", r.status === 400 && /account/i.test(JSON.stringify(r.body)) && !LEAKS.test(r.body?.detail ?? ""), r.body?.detail ?? r.body);
    r = await api(`/library/forms/${encodeURIComponent("IMM 1295")}/accepts`, { method: "POST", data: { account: "PR_PORTAL", channels: ["ONLINE"], reason: "client try" }, actor: "user-P" });
    step("C11.18 J5 roles: a client cannot propose what IRCC accepts (403)", r.status === 403, r.status);
    const two = await Promise.all([0, 1].map(() => api(`/combinations/${vv}/forms/${encodeURIComponent("IMM 1295")}/channel`, { method: "PATCH", data: { channel: "PAPER", from: "PDF_UPLOAD" } })));
    step("C1.6 J5 concurrency: two channel saves from the same 'from' at once: one saved, one refused (409) in words", two.map((x) => x.status).sort().join() === "200,409", two.map((x) => `${x.status}:${x.body?.detail ?? ""}`));

    // ── J6 Preview groups follow the four channels (runtime's words)
    await p.goto(`${BASE}/c/${vv}/preview`); await sleep(2500);
    const prev = (await p.locator("main").innerText()).replace(/\s+/g, " ");
    step("C4.6 J6: Preview names the paper group in words ('PDF to print, sign and mail')", /print, sign and mail/.test(prev), prev.slice(0, 300));
    await leaks(p, "Preview", "main");
    step("C1.6: no script error on any page", errs.length === 0, errs.join(" | "));
  } catch (e) { step("the walk finished", false, e.stack ?? String(e)); }
  finally { await b.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }
})();
