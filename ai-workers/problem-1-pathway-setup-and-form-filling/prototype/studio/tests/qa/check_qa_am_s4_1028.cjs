// qa lane, /qa after-merge on main 06a8fc30 (28 Oct, PR #65): S4 Form library and form finder, walked like a configuration
// author and a second person at 1440 and 1024 px (desktop only). The library list with every action (upload, Delete when
// unused, Retire / Restore on the shared lifecycle guard), What IRCC accepts (Load sample fixtures, set by a person, C11.18),
// the form finder in Rules and Replay only (never live; a live plan is read, never launched), the run card, and the second
// person's page with Where used. Resets the copy and loads the sample itself. Findings fail here today and pass when fixed
// (QA-61 onwards; QA-53 re-checked). Every name and person is Sample. No model call (US$0); canada.ca from recorded copies.
//   zsh studio/tools/isolated.sh qa_s4 4474 start
//   node studio/tests/qa/check_qa_am_s4_1028.cjs 4474 xr_studio_qa_s4        (QA_HEADED=1 shows the browser)
const fs = require("node:fs"); const path = require("node:path"); const os = require("node:os"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const [PORT, DB] = [process.argv[2] ?? "4474", process.argv[3] ?? "xr_studio_qa_s4"];
const BASE = `http://localhost:${PORT}`;
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/local/bin/psql"].find((p) => fs.existsSync(p));
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const FORMS = path.join(__dirname, "..", "..", "..", "..", "official-sources", "ircc", "forms");
const SHOTS = path.join(__dirname, "..", "..", "..", "..", "product", "qa", "reports", "2026-10-28-after-merge-s4");
fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).replace(/\s+/g, " ").slice(0, 320)}` : ""}`); };
const info = (t) => console.log(`INFO  ${t}`);
const call = async (method, url, body, actor = "user-A") => { const h = { ...(body ? { "content-type": "application/json" } : {}) }; if (actor) h["x-actor"] = actor; const r = await fetch(`${BASE}/api${url}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(240000) }); return { status: r.status, body: await r.json().catch(() => null) }; };
const enc = encodeURIComponent;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const load = await call("POST", "/demo/load");
  step("setup: Reset, then Load sample", load.status < 300, load.status);
  const fillLine = (load.body?.log ?? []).find((l) => /^library forms:/.test(l)) ?? "";
  const browser = await chromium.launch({ channel: "chrome", headless: !process.env.QA_HEADED });
  const errors = [];
  const page = async (actor, width = 1440) => {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    await ctx.addInitScript((a) => { try { if (!sessionStorage.getItem("qa-init")) { localStorage.setItem("xr-actor", a); sessionStorage.setItem("qa-init", "1"); } } catch { /* private window */ } }, actor);
    const p = await ctx.newPage(); p.on("pageerror", (e) => errors.push(String(e))); return p;
  };
  const axe = async (p, name) => { const v = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze()).violations; step(`${name}: axe clean`, !v.length, v.map((x) => `${x.id} (${x.nodes.length}) ${x.nodes[0]?.target} ${x.nodes[0]?.any?.[0]?.message?.slice(0, 100) ?? ""}`).join(", ") || "clean"); };
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const shot = (p, n) => p.screenshot({ path: path.join(SHOTS, `${n}.png`) });
  const text = async (p, sel = "main") => (await p.locator(sel).first().innerText()).replace(/\s+/g, " ");
  const rowOf = (p, code) => p.locator("main tbody tr[data-form]").filter({ has: p.getByText(code, { exact: true }) }).first();
  const openLib = async (p, qs = "") => { await p.goto(`${BASE}/library/forms${qs}`); await p.locator("main tbody tr[data-form]").first().waitFor({ timeout: 30000 }); await wait(300); };

  // ═════════════ 1. The library list after Load sample (C11.11, P-123)
  const a = await page("user-A");
  await openLib(a);
  const list = (await call("GET", "/library/forms/list")).body;
  const rows = await a.locator("main tbody tr[data-form]").count();
  step("C11.11: one list of every form, guide and checklist (no groups); the rows equal the library", rows === list.rows.length && list.rows.length === list.counts.all, `${rows} rows, ${list.counts.all} in the library`);
  const chips = (await a.getByRole("button", { name: /^(All|Forms|Guides|Checklists)\s*\d+/ }).allInnerTexts()).map((t) => t.replace(/\s+/g, "").replace(/(\D)(\d)/, "$1 $2"));
  step("C11.11: Type chips count what they say (All, Forms, Guides, Checklists)", chips.join("|") === `All ${list.counts.all}|Forms ${list.counts.form}|Guides ${list.counts.guide}|Checklists ${list.counts.checklist}`, chips.join(" | "));
  const acc = (code) => list.rows.find((r) => r.code === code);
  const forms = list.rows.filter((r) => r.type === "form" && r.edition);
  const set = forms.filter((r) => r.accepts && r.accepts !== "READ_BY_AI").map((r) => r.code), unset = forms.filter((r) => !r.accepts).map((r) => r.code);
  info(`Load sample: ${fillLine}`);
  info(`What IRCC accepts after Load sample: set for ${set.length} of ${forms.length} forms with a file (${set.join(", ")}); Not set yet: ${unset.join(", ")}. The Lead's brief expected 5 of 7 set (all but IMM 5257 SCH1 and IMM 5409); the forms lane log and filing.ts after the Lead check say only lines that say how the form is filed count`);
  step("C11.11 P-123: every value Load sample sets is a PDF upload with IRCC's own line (Sample · canada.ca words); nothing is invented", set.every((c) => acc(c).accepts_basis === "SAMPLE_FIXTURE" && (acc(c).accepts_quote ?? "").length >= 15), set.map((c) => `${c} ${acc(c).accepts} ${acc(c).accepts_basis}`));
  const r5476 = (await rowOf(a, "IMM 5476").innerText()).replace(/\s+/g, " "), r5409 = (await rowOf(a, "IMM 5409").innerText()).replace(/\s+/g, " "), rg = (await rowOf(a, "Guide 5256").innerText()).replace(/\s+/g, " ");
  step("C11.11: the IRCC accepts column says the value and who said it (IMM 5476: PDF upload · Sample · canada.ca words), Not set yet (IMM 5409), Not filed (a guide)", /PDF upload/.test(r5476) && /Sample · canada.ca words/.test(r5476) && /Not set yet/.test(r5409) && /Not filed/.test(rg), `${r5476.slice(0, 90)} | ${r5409.slice(0, 70)}`);
  await axe(a, "Forms library at 1440 px");
  await shot(a, "s4-library-1440");
  // Filters
  await a.getByRole("button", { name: /^Guides\s*\d+/ }).click(); await wait(500);
  step("C11.11: the Guides chip shows the 4 guides only", await a.locator("main tbody tr[data-form]").count() === list.counts.guide);
  await a.getByRole("button", { name: /^All\s*\d+/ }).click(); await wait(300);
  await a.getByPlaceholder("Search number or title").fill("5257"); await wait(700);
  const found = (await a.locator("main tbody tr[data-form]").allInnerTexts()).map((t) => t.split("\n")[0]);
  step("C11.11: search '5257' finds IMM 5257 and its schedule", found.length === 2 && found.every((t) => /IMM 5257/.test(t)), found);
  await a.getByPlaceholder("Search number or title").fill("zz-no-such-form"); await wait(700);
  step("C11.11: a search with no match says so with Clear filters", /No form matches/.test(await text(a)) && await a.getByRole("button", { name: "Clear filters" }).count() === 1);
  await a.getByRole("button", { name: "Clear filters" }).click(); await wait(400);
  const vvId = sql("select id from combination where combination_key='vv.single'");
  await a.getByRole("combobox", { name: "Used by" }).selectOption(vvId).catch(() => {}); await wait(700);
  const used = (await a.locator("main tbody tr[data-form]").allInnerTexts()).map((t) => t.split("\n")[0].trim());
  const usesVv = list.rows.filter((r) => (r.used_by ?? []).some((u) => (u.id ?? u.combination_id ?? u.combinationId) === vvId)).map((r) => r.code);
  step("C11.11: the Used by filter (Visitor visa) shows the forms that combination uses", used.length > 0 && (usesVv.length === 0 || usesVv.every((c) => used.includes(c))), `${used.join(", ")}`);
  await openLib(a);
  // The drawer
  await a.locator("main tbody tr td button").filter({ hasText: /^IMM 5476$/ }).click();
  const drawer = a.getByRole("dialog", { name: /IMM 5476/ });
  await drawer.waitFor({ timeout: 8000 });
  const dtext = (await drawer.innerText()).replace(/\s+/g, " ");
  step("C11.11: the drawer shows Definition (canada.ca page), What IRCC accepts with IRCC's words, Where it is used and History", /Definition/.test(dtext) && /What IRCC accepts/.test(dtext) && /Upload this form/i.test(dtext) && /Where it is used/.test(dtext) && /History/.test(dtext) && await drawer.locator('a[href*="canada.ca"]').count() >= 1, dtext.slice(0, 200));
  await axe(a, "Forms drawer at 1440 px");
  await a.keyboard.press("Escape"); await wait(300);
  step("Review M8: closing the drawer puts focus back on the form number", await a.evaluate(() => /IMM 5476/.test(document.activeElement?.textContent ?? "")), await a.evaluate(() => document.activeElement?.outerHTML?.slice(0, 80)));

  // ═════════════ 2. What IRCC accepts set by a person (C11.18): pass and fail
  const ac1 = await call("POST", `/library/forms/${enc("IMM 5409")}/accepts`, { account: "ANY", channels: ["PDF_UPLOAD"] });
  step("C11.18 fail: neither a canada.ca line nor a reason is refused (400, plain)", ac1.status === 400 && !!ac1.body?.detail, `${ac1.status} ${ac1.body?.detail}`);
  const ac2 = await call("POST", `/library/forms/${enc("Guide 5256")}/accepts`, { account: "ANY", channels: ["PDF_UPLOAD"], reason: "qa: a guide is never filed" });
  step("C11.18 fail: a guide is refused (409, never filed)", ac2.status === 409, `${ac2.status} ${ac2.body?.detail}`);
  const ac3 = await call("POST", `/library/forms/${enc("IMM 5409")}/accepts`, { account: "ANY", channels: ["PDF_UPLOAD"], reason: "qa: approver tries" }, "user-B");
  step("C11.18 fail: the approver (no author duty) cannot propose it (403)", ac3.status === 403, ac3.status);
  await openLib(a);
  await a.locator("main tbody tr td button").filter({ hasText: /^IMM 5409$/ }).click(); await a.getByRole("dialog", { name: /IMM 5409/ }).waitFor();
  // P-143 (drift fixed 1 Nov): the panel now asks which IRCC account and offers the four ways as checkboxes; the API takes
  // { account, channels: [...] } instead of one "PDF" / "ONLINE" value.
  await a.getByRole("button", { name: /what IRCC accepts/ }).click();
  await a.getByRole("combobox", { name: "For which IRCC account" }).selectOption("ANY");
  await a.getByRole("dialog", { name: /IMM 5409/ }).getByRole("checkbox", { name: /^PDF upload/ }).check();
  await a.getByRole("textbox", { name: "The canada.ca line it comes from" }).fill("Upload this form along with your online application if it applies to you (qa Sample).");
  await a.getByRole("button", { name: "Send for a second person" }).click(); await wait(1500);
  const accChange = sql("select id from library_change where action='SET_ACCEPTS' and status='WAITING' limit 1");
  const self = accChange ? await call("POST", `/library/changes/${accChange}/approve`, {}) : { status: 0 };
  step("C11.18 pass: an author sets it from the drawer with IRCC's line; it waits; the proposer cannot approve (403)", !!accChange && self.status === 403, `change ${!!accChange} self ${self.status}`);
  await a.keyboard.press("Escape").catch(() => {});
  const b = await page("user-B");
  if (accChange) { await b.goto(`${BASE}/review/change/${accChange}`); await b.locator("main h1").waitFor(); await b.getByRole("button", { name: "Approve", exact: true }).click(); await wait(1500); }
  const after = (await call("GET", "/library/forms/list")).body.rows.find((r) => r.code === "IMM 5409");
  step("C11.18 pass: after the second person approves, IMM 5409 shows PDF upload, set by a person (Sample)", after?.accepts === "PDF upload" && /PERSON/.test(after?.accepts_basis ?? ""), `${after?.accepts} ${after?.accepts_basis}`);

  // ═════════════ 3. Upload: one door, duplicates, held, Delete when unused (P-103, P-116)
  const up = async (files, actor = "user-A") => { const fd = new FormData(); for (const [name, buf] of files) fd.append("files", new Blob([buf], { type: "application/pdf" }), name); const r = await fetch(`${BASE}/api/library/forms/upload`, { method: "POST", headers: { "x-actor": actor }, body: fd }); return { status: r.status, body: await r.json().catch(() => null) }; };
  const pdf5476 = fs.readFileSync(path.join(FORMS, "imm5476e.pdf"));
  const before = Number(sql("select count(*) from form_edition"));
  const dup = await up([["imm5476e.pdf", pdf5476]]);
  await wait(4000);
  step("BR-4: the same official file uploaded again adds nothing (Already in the library)", dup.status < 300 && Number(sql("select count(*) from form_edition")) === before, `${dup.status} editions ${before} → ${sql("select count(*) from form_edition")}`);
  const empty = await up([["empty.pdf", Buffer.alloc(0)]]);
  const notPdf = await up([["notes.pdf", Buffer.from("plain text, not a PDF")]]);
  await wait(3000);
  info(`upload answers: empty ${empty.status} ${JSON.stringify(empty.body).slice(0, 160)} · not a PDF ${notPdf.status} ${JSON.stringify(notPdf.body).slice(0, 160)}`);
  step("Slice 3 fix 1: an empty file and a non-PDF add nothing to the library", Number(sql("select count(*) from form_edition")) === before);
  // A form not on canada.ca's copy (the official file with bytes appended): held until a person records its page.
  const odd = Buffer.concat([fs.readFileSync(path.join(FORMS, "imm5562e.pdf")), Buffer.from("\n% qa: changed copy\n")]);
  const heldUp = await up([["imm5562e-copy.pdf", odd]]);
  await wait(6000);
  const heldN = sql("select count(*) from intake_item where status='HELD'");
  step("P-80, BR-5: an upload that is not canada.ca's file is held for a person (not usable until approved)", heldUp.status < 300 && Number(heldN) >= 1, `${heldUp.status} held ${heldN}`);
  const u5562 = (await call("GET", `/library/forms/${enc("IMM 5562")}/uses`)).body;
  info(`IMM 5562 after the held upload: ${u5562 ? JSON.stringify(u5562.can) : "not in the library"}`);
  // Retire a form used only as a source (IMM 5257 → Visitor visa and Super visa setups): Where used first, second person, Restore.
  const p = await page("user-A");
  await openLib(p);
  // PR #69: one written action per row (the ⋯ menu is gone) and a side panel instead of a dialog.
  const act = (code) => rowOf(p, code).locator("button", { hasText: /^(Retire|Delete|Restore|Withdraw)/ }).first();
  step("C3.7 P-116: a used form (IMM 5257) offers Retire, never Delete", /^Retire/.test((await act("IMM 5257").innerText()).trim()), (await act("IMM 5257").innerText()).trim());
  await act("IMM 5257").click();
  const dlg = p.locator("aside[aria-label]"); await dlg.waitFor();
  await dlg.getByText(/Visitor visa|combination/).first().waitFor({ timeout: 8000 }).catch(() => {});
  const dl = (await dlg.innerText()).replace(/\s+/g, " ");
  step("C3.7 P-116: the retire dialog shows where the form is used before any action", /Visitors › Visitor visa|Visitor visa/.test(dl), dl.slice(0, 220));
  step("QA-64 P-116 amended: the retire dialog says when it takes effect as the decision says (a library retire takes effect at approval)", !/next release carries it/.test(dl), dl.match(/[^.]*release[^.]*\./)?.[0]);
  await axe(p, "Retire dialog at 1440 px");
  await dlg.locator("textarea").fill("Replaced by a newer edition (qa walk)"); await dlg.getByRole("button", { name: "Send for approval" }).click(); await wait(1500);
  const rc = sql("select id from library_change where kind='library_form' and action='RETIRE' and status='WAITING' limit 1");
  await openLib(p);
  step("P-116: the row says Retire waiting while it waits", !!rc && /Retire waiting/.test((await rowOf(p, "IMM 5257").innerText())), (await rowOf(p, "IMM 5257").innerText()).replace(/\s+/g, " ").slice(0, 160));
  // The second person's page with Where used (Lead's carried Should).
  await b.goto(`${BASE}/review/change/${rc}`); await b.locator("main h1").waitFor(); await wait(800);
  const bt = await text(b);
  step("Lead Should (P-116): the second person's retire page shows Where it is used", /Where it is used/.test(bt) && /Visitor visa/.test(bt), bt.match(/Where it is used.{0,200}/)?.[0]);
  await axe(b, "Second person's retire page at 1440 px");
  await shot(b, "s4-approval-where-used");
  await b.getByRole("button", { name: "Approve", exact: true }).click(); await wait(2000);
  const retiredNow = sql("select retired_at is not null from gov_form_def where form_key='IMM 5257'");
  step("QA-64 P-116 amended: a library retire takes effect at approval (IMM 5257 is retired now, before any release)", retiredNow === "t", `retired=${retiredNow}`);
  const release = async (note) => { const d = (await call("GET", "/draft", undefined, "user-B")).body; return call("POST", "/pack/release", { note, expectedChanges: d?.changes ?? 0 }, "user-B"); };
  if (retiredNow !== "t") { const rl = await release("qa: release carries the form retire"); info(`release after the approval: ${rl.status} ${rl.body?.detail ?? ""}`); }
  const retiredLater = sql("select retired_at is not null from gov_form_def where form_key='IMM 5257'");
  step("P-116: the approved retire is applied (at approval, or at the release as built)", retiredLater === "t", `retired=${retiredLater}`);
  const pick = await call("POST", `/combinations/${sql("select id from combination where label='Study permit' limit 1")}/forms`, { formKey: "IMM 5257" });
  step("P-116: a retired form is not offered: attaching it to a combination is refused", retiredLater === "t" && pick.status >= 400, `${pick.status} ${pick.body?.detail}`);
  await openLib(p);
  await p.getByRole("button", { name: /^Retired\s*\d+/ }).click().catch(() => {}); await wait(500);
  step("C11.11: the Retired status chip lists the retired form", (await p.locator("main tbody tr[data-form]").allInnerTexts()).some((t) => /IMM 5257/.test(t)));
  const rr = await call("POST", `/library/forms/${enc("IMM 5257")}/restore`, { reason: "Still filed (qa walk)" });
  const rs = sql("select id from library_change where kind='library_form' and action='RESTORE' and status='WAITING' limit 1");
  if (rs) { await call("POST", `/library/changes/${rs}/approve`, {}, "user-B"); if (sql("select retired_at is null from gov_form_def where form_key='IMM 5257'") !== "t") await release("qa: restore the form"); }
  step("P-116: Restore, approved by a second person, brings it back", rr.status < 300 && sql("select retired_at is null from gov_form_def where form_key='IMM 5257'") === "t", `${rr.status} ${rr.body?.detail ?? ""}`);
  // Delete when unused: no product route makes an unused form with no approved file (every way in approves the file), so a
  // form with no edition is seeded as the builders' own check does (Scaffolding), then walked in the page.
  sql("insert into gov_form_def select (jsonb_populate_record(null::gov_form_def, to_jsonb(d) || jsonb_build_object('id', gen_random_uuid(), 'form_key', 'IMM 0101', 'display_name', 'Sample unused form (qa)', 'form_page_url', null, 'retired_at', null, 'retired_by', null))).* from gov_form_def d where form_key='IMM 5802'");
  await openLib(p);
  step("P-116: an unused form (IMM 0101) offers Delete", /^Delete/.test((await act("IMM 0101").innerText()).trim()), (await act("IMM 0101").innerText()).trim());
  await act("IMM 0101").click();
  const dd = p.locator("aside[aria-label]"); await dd.waitFor(); await dd.getByText(/Nothing uses it/i).waitFor({ timeout: 8000 }).catch(() => {});
  step("P-116: Delete on an unused form says nothing uses it and asks why", /Nothing uses it/i.test(await dd.innerText()) && await dd.locator("textarea").count() === 1, (await dd.innerText()).replace(/\s+/g, " ").slice(0, 200));
  await dd.locator("textarea").fill("Added by mistake (qa walk)"); await dd.getByRole("button", { name: "Send for approval" }).click(); await wait(1500);
  const dch = sql("select id from library_change where kind='library_form' and action='DELETE' and status='WAITING' limit 1");
  step("P-116: the delete waits for a second person; the form stays until then", !!dch && sql("select count(*) from gov_form_def where form_key='IMM 0101'") === "1");
  if (dch) { await b.goto(`${BASE}/review/change/${dch}`); await b.locator("main h1").waitFor(); await wait(600); }
  const dtitle = dch ? await b.locator("main h1").innerText() : "";
  step("P-123: the approval page says Delete library form", /^Delete/.test(dtitle) && /library form|IMM 0101/.test(dtitle), dtitle);
  if (dch) { await b.getByRole("button", { name: "Approve", exact: true }).click(); await wait(1500); }
  step("P-116: approved, the unused form leaves the library at once", sql("select count(*) from gov_form_def where form_key='IMM 0101'") === "0", sql(`select status from library_change where id='${dch}'`));
  // Retire refused while a draft or the latest release files it.
  const r1295 = await call("POST", `/library/forms/${enc("IMM 1295")}/retire`, { reason: "qa: should be refused" });
  step("P-116: retiring a form a release still files is refused with the combination named (409, plain)", r1295.status === 409 && /With an LMIA/.test(r1295.body?.detail ?? ""), `${r1295.status} ${r1295.body?.detail}`);
  // Roles.
  const bUp = await up([["imm5476e.pdf", pdf5476]], "user-B");
  const bDel = await call("DELETE", `/library/forms/${enc("Guide 5269")}`, { reason: "qa: approver tries" }, "user-B");
  step("BR-14: the approver cannot upload or delete (403)", bUp.status === 403 && bDel.status === 403, `${bUp.status} ${bDel.status}`);
  const lib401 = await call("GET", "/library/forms/list", undefined, null), lib403 = await call("GET", "/library/forms/list", undefined, "user-O");
  step("QA-53 STANDARDS §6: the library list refuses nobody (401) and case people (403)", lib401.status === 401 && lib403.status === 403, `${lib401.status} ${lib403.status}`);

  // ═════════════ 4. The form finder: Rules and Replay only (P-103, P-110); a live plan is read, never launched
  const vv = vvId, sv = sql("select c.id from combination c where c.label='Super visa' limit 1");
  const plan = (cid, body) => call("POST", `/combinations/${cid}/forms/find/plan`, body);
  const off = await plan(vv, { mode: "rules", pageUrl: "https://example.com/guide.html" });
  const http = await plan(vv, { mode: "rules", pageUrl: "http://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/apply-visitor-visa.html" });
  step("BR-2: a page off canada.ca and an http address are refused before anything runs (400, plain)", off.status === 400 && http.status === 400 && /canada\.ca/.test(off.body?.detail ?? "") && /https/.test(http.body?.detail ?? ""), `${off.status} ${http.status}`);
  const live = await plan(vv, { mode: "live" });
  step("BR-11: a live plan states its worst case and what is left of the cap before anything starts (read only, not launched)", live.status < 300 && live.body?.totals?.worst_usd > 0 && typeof live.body?.ledger?.remaining_usd === "number", `worst US$${live.body?.totals?.worst_usd} · left US$${live.body?.ledger?.remaining_usd}`);
  const runIt = async (cid, mode) => {
    const pl = await plan(cid, { mode });
    const key = `qa-${mode}-${cid.slice(0, 8)}-${Date.now()}`;
    const l = await call("POST", `/combinations/${cid}/forms/find`, { mode, planSha256: pl.body.plan_sha256, idempotencyKey: key });
    let v; for (let i = 0; i < 60; i++) { v = await call("GET", `/form-finder/runs/${l.body?.id}`); if (!["QUEUED", "RUNNING"].includes(v.body?.status)) break; await wait(800); }
    return { pl, l, v, key };
  };
  const linesOf = (cid) => sql(`select count(*) from combination_form where combination_id='${cid}' and status <> 'RETIRED'`);
  const rulesBefore = linesOf(vv);
  const rules = await runIt(vv, "rules");
  step("BR-7: Rules only costs US$0, lists the printed form numbers and attaches nothing", rules.pl.body.totals.worst_usd === 0 && rules.v.body?.status === "COMPLETED" && linesOf(vv) === rulesBefore && rules.v.body.usd?.spent === 0, `${rules.v.body?.status} · ${rules.v.body?.message}`);
  const stale = await call("POST", `/combinations/${vv}/forms/find`, { mode: "rules", planSha256: "0".repeat(64), idempotencyKey: `qa-stale-${Date.now()}` });
  step("Contract: a launch with a stale plan fingerprint is refused (409, look at the plan again)", stale.status === 409, `${stale.status} ${stale.body?.detail}`);
  const otherKey = await call("POST", `/combinations/${sv}/forms/find`, { mode: "rules", planSha256: (await plan(sv, { mode: "rules" })).body.plan_sha256, idempotencyKey: rules.key });
  step("Minor fix: a launch key from another combination is refused (409)", otherKey.status === 409, otherKey.status);
  const bLaunch = await call("POST", `/combinations/${vv}/forms/find`, { mode: "rules", planSha256: rules.pl.body.plan_sha256, idempotencyKey: `qa-b-${Date.now()}` }, "user-B");
  step("BR-14: the approver cannot start the finder (403)", bLaunch.status === 403, bLaunch.status);
  const rep = await runIt(vv, "replay");
  const res = rep.v.body?.result ?? {};
  const quotesOk = (res.attach ?? []).every((x) => (x.quote ?? "").length >= 15);
  step("BR-6, P-121: Replay (US$0) attaches the forms both saved rounds agree on, each with IRCC's quoted line, and lists what to decide", rep.v.body?.usd?.spent === 0 && (res.attach ?? []).length >= 5 && quotesOk && (res.pages ?? []).every((pg) => /^https:\/\/(www|ircc)\.canada\.ca\//.test(pg.url)), `${rep.v.body?.status} · ${rep.v.body?.message} · pages ${(res.pages ?? []).map((x) => new URL(x.url).host).join(",")}`);
  const down = (res.attach ?? []).filter((x) => x.source === "downloaded").map((x) => x.code);
  const dlRows = down.length ? sql(`select string_agg(d.form_key||':'||coalesce(e.origin,'-'), ', ') from gov_form_def d join form_edition e on e.gov_form_def_id=d.id where d.form_key in (${down.map((c) => `'${c}'`).join(",")})`) : "";
  step("BR-2: forms not in the library were downloaded from canada.ca (recorded copies) and marked as downloaded", !down.length || /DOWNLOADED/.test(dlRows), `${down.join(", ")} → ${dlRows}`);
  const s5257 = [...(res.attach ?? []), ...(res.decide ?? []).map((d) => d.draft ?? d.check ?? d)].find((x) => x?.code === "IMM 5257") ?? null; info(`replay result arrays: ${Object.keys(res).join(",")}; attach ${(res.attach ?? []).map((x) => x.code).join(" ")}`);
  const lib5257 = (await call("GET", "/library/forms/list")).body.rows.find((r) => r.code === "IMM 5257");
  step("Lead check: the saved answer's 'Download and fill out the form on a computer' does not set IMM 5257 to PDF upload", !!s5257 && /computer/.test(s5257.filed_note ?? "") && !lib5257?.accepts, `${s5257?.filed_note} → ${lib5257?.accepts ?? "Not set yet"}`);
  const svRep = await runIt(sv, "replay");
  step("Drift #4: Replay never borrows Visitor visa's saved answers for Super visa (it waits for a person)", svRep.v.body?.status === "NEEDS_PERSON" && linesOf(sv) === sql(`select count(*) from combination_form where combination_id='${sv}' and status <> 'RETIRED'`), `${svRep.v.body?.status}: ${svRep.v.body?.steps?.[0]?.message}`);
  const svMsg = svRep.v.body?.steps?.[0]?.message ?? "";
  step("QA-62 plain words: a replay with no saved answer does not say 'AI could not pick the page' (no AI ran) and has no '..'", !/AI could not pick/.test(svMsg) && !/\.\./.test(svMsg), svMsg);
  const stopDone = await call("POST", `/form-finder/runs/${rep.l.body.id}/stop`);
  step("P-110: Stop on a finished run is refused in plain words (409)", stopDone.status === 409 && /already ended/i.test(stopDone.body?.detail ?? ""), `${stopDone.status} ${stopDone.body?.detail}`);
  // The run card (W1-07): steps, cost, the next step.
  await p.goto(`${BASE}/ai/${rep.l.body.id}`); await p.locator("[data-run-status]").first().waitFor({ timeout: 30000 });
  const card = await text(p, "[data-run-status]");
  step("P-110 run card: the replay run shows its 6 steps, US$0 and 'saved AI answers, no new call'", (card.match(/US\$0/g) ?? []).length >= 1 && /saved AI answers/.test(card) && await p.locator("[data-run-status] li").count() >= 6, card.slice(0, 220));
  await axe(p, "Run card (replay) at 1440 px");
  await shot(p, "s4-run-card-replay");
  await p.goto(`${BASE}/ai/${svRep.l.body.id}`); await p.locator("[data-run-status]").first().waitFor();
  // QA-63 fix (forms f2dfa1e9): the waiting card's next step leads to the Sources page; any link off this card counts.
  const links = await p.locator("[data-run-status] a").evaluateAll((as) => as.map((a) => `${a.textContent.trim()} → ${a.getAttribute("href")}`));
  const onward = links.filter((l) => !l.endsWith(` → /ai/${svRep.l.body.id}`) && /→ \//.test(l));
  step("QA-63 P-110: a run waiting for a person gives a next step that leads somewhere (not the same card)", onward.length > 0, links);
  await p.goto(`${BASE}/ai`); await p.locator("main table").waitFor({ timeout: 30000 });
  const aiList = await text(p, "main table");
  step("QA-62 plain words: AI work names a finder run by its place, without the combination's database id or internal codes (NEEDS_PERSON, RULES)", !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/.test(aiList) && !/NEEDS_PERSON|\bRULES\b/.test(aiList), aiList.match(/[0-9a-f]{8}-[0-9a-f-]{27}\|[^ ]+|NEEDS_PERSON|RULES/g)?.slice(0, 3));
  await shot(p, "s4-ai-work-list");

  // ═════════════ 5. 1024 px and the read-only person
  const s = await page("user-A", 1024); await openLib(s);
  const lastCell = await s.locator("main tbody tr[data-form]").first().locator("td").last().boundingBox();
  step("Review M5: at 1024 px Status and ⋯ stay on screen, no sideways scroll", !!lastCell && lastCell.x + lastCell.width <= 1024 && await sideways(s) <= 0, `${lastCell && Math.round(lastCell.x + lastCell.width)} px · ${await sideways(s)} px`);
  await axe(s, "Forms library at 1024 px");
  await shot(s, "s4-library-1024");
  await openLib(b);
  const upBtn = b.getByRole("button", { name: /Upload PDF/ });
  step("BR-14: the approver has no working Upload PDF on the page (hidden or disabled)", await upBtn.count() === 0 || await upBtn.isDisabled(), `${await upBtn.count()} buttons`);
  await axe(b, "Forms library read-only (approver)");

  step("no page errors during the walk", !errors.length, errors.slice(0, 2).join(" | "));
  await browser.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
