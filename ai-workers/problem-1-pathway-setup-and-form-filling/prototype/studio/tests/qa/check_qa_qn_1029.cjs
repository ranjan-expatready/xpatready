// qa explore, 29 Oct (main 52117004): the Questionnaires tab (W1-15 slice 2) walked as the author, what the builder's own
// suites do not try. API probes on fact sources (case facts by their own role, reason rules, stale version, wrong role,
// bulk across a case fact and a person's fact, Undo of a bulk change) then the browser at 1440 and 1024 px: strip, person
// and source chips, drawer, Case officer with and without a reason, the bulk bar, section Remove, axe on the tab and the
// drawer. Fails today on QA-92 (drawer saves a case fact under the person), QA-93 (section Remove: no question, no Undo),
// QA-94 (system names in drawer and messages), QA-95 (short reason refused as if
// none). Isolated copy only, US$0.
//   zsh studio/tools/isolated.sh qa_qn 4471 start && node studio/tests/qa/check_qa_qn_1029.cjs 4471 xr_studio_qa_qn
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4471), BASE = `http://localhost:${PORT}`, DB = process.argv[3] ?? "xr_studio_qa_qn";
const SHOTS = path.join(__dirname, "..", "..", "..", "..", "product", "qa", "reports", "2026-10-29-coverage-s4-s5"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, fail = 0;
const step = (name, c, detail) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const api = async (p, { method = "GET", actor = "user-A", data } = {}) => {
  const h = { "content-type": "application/json" }; if (actor) h["x-actor"] = actor;
  const r = await fetch(`${BASE}/api${p}`, { method, headers: h, body: data === undefined ? undefined : JSON.stringify(data) });
  const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b };
};
const KEY = /\b[a-z]+(_[a-z]+)*\.[a-z_]+\b/;          // a system name such as case.service_language
const TECH = /\b(P|D)-\d+\b|undefined|null\b|\[object|AGENT|CLIENT|DOCUMENT/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  const ld = await api("/demo/load", { method: "POST", data: {} });
  if (ld.status >= 300) { console.error("STOP  the sample did not load", ld.status); process.exit(2); }
  const served = (await api("/session")).body?.workspace?.id;
  if (!served || sql(`select count(*) from workspace where id='${served}'`) !== "1") { console.error(`STOP  ${DB} is not the database of :${PORT}`); process.exit(2); }
  const id = sql("select id from combination where combination_key='wp.family'");
  const FS = `/combinations/${id}/fact-sources`;
  let v = (await api(FS)).body;
  const caseFacts = v.facts.filter((f) => f.role === "case");
  step("setup: the Live work permit lists case facts under their own role 'case' (API)", caseFacts.length > 0, caseFacts.length);

  // ------------------------------------------------------------------ API
  let r = await api(`${FS}/principal/case.service_language`, { method: "PUT", data: { version: 0, source: "CLIENT", prequalification: true } });
  step("QA-92 API: a case fact sent under the principal is 404 (what the drawer sends today)", r.status === 404, `${r.status} ${r.body?.detail}`);
  step("QA-94 fail: that refusal names the system name 'case.service_language' to a person", !KEY.test(String(r.body?.detail ?? "")), r.body?.detail);
  r = await api(`${FS}/case/case.application_type`, { method: "PUT", actor: "user-B", data: { version: 0, source: "CLIENT" } });
  step("approver: setting where an answer comes from is refused (403)", r.status === 403, r.status);
  r = await api(`${FS}/case/case.application_type`, { method: "PUT", actor: null, data: { version: 0, source: "CLIENT" } });
  step("nobody: refused (401)", r.status === 401, r.status);
  r = await api(`${FS}/case/case.application_type`, { method: "PUT", data: { version: 0, source: "ROBOT" } });
  step("fail: an unknown source is 400 in plain words", r.status === 400 && /Document, Client or Case officer/.test(r.body?.detail ?? ""), r.body?.detail);
  r = await api(`${FS}/principal/person.other_given_names`, { method: "PUT", data: { version: 0, source: "AGENT" } });
  step("P-155(3) fail: Case officer on a person's fact with no reason is refused (422, field sourceReason)", r.status === 422 && r.body?.errors?.[0]?.field === "sourceReason", `${r.status} ${r.body?.detail}`);
  r = await api(`${FS}/principal/person.other_given_names`, { method: "PUT", data: { version: 0, source: "AGENT", sourceReason: "abc" } });
  step("QA-95 fail: a 3-character reason is told 'write why' as if none was written; expected the 5-character rule in words", r.status === 422 && /5|five|at least/i.test(r.body?.detail ?? ""), r.body?.detail);
  r = await api(`${FS}/principal/person.other_given_names`, { method: "PUT", data: { version: 0, source: "AGENT", sourceReason: "x".repeat(401) } });
  step("fail: a 401-character reason is 400 'Keep the reason under 400 characters.'", r.status === 400 && /under 400/.test(r.body?.detail ?? ""), r.body?.detail);
  r = await api(`${FS}/principal/person.other_given_names`, { method: "PUT", data: { version: 0, source: "AGENT", sourceReason: "Le cabinet note les autres noms — 受付で確認" } });
  step("pass: Case officer with a non-English reason saves; the row keeps the reason exactly", r.status === 200 && r.body?.sourceReason === "Le cabinet note les autres noms — 受付で確認", r.status);
  r = await api(`${FS}/principal/person.other_given_names`, { method: "PUT", data: { version: 0, source: "CLIENT" } });
  step("stale: a save on an old version is 409 'Changed since'", r.status === 409, r.status);
  step("QA-94 fail: the 409 names the fact by its system name", !KEY.test(String(r.body?.detail ?? "")), r.body?.detail);
  r = await api(`${FS}/principal/person.other_given_names`, { method: "DELETE", data: { version: 1 } });
  step("Undo: the author's own draft goes at once", r.status === 200, r.status);
  const two = await Promise.all([1, 2].map(() => api(`${FS}/case/case.application_type`, { method: "PUT", data: { version: 0, source: "CLIENT" } })));
  step("two at once: the same change sent twice at the same moment saves once, the other is 409", two.map((x) => x.status).sort().join() === "200,409", two.map((x) => x.status));
  v = (await api(FS)).body;
  const at = v.facts.find((f) => f.role === "case" && f.fact === "case.application_type");
  await api(`${FS}/case/case.application_type`, { method: "DELETE", data: { version: at.version } });
  r = await api(`${FS}/bulk`, { method: "POST", data: { items: [{ role: "case", fact: "case.service_language", version: 0 }, { role: "principal", fact: "person.other_family_name", version: 0 }], prequalification: true } });
  step("bulk: a case fact and a person's fact ticked together both save under one batch", r.status === 200 && r.body?.saved === 2 && !!r.body?.batchId, r.body);
  const u = await api(`${FS}/bulk/undo`, { method: "POST", data: { batchId: r.body?.batchId } });
  step("bulk Undo: one Undo takes back both", u.status === 200 && sql(`select count(*) from fact_source where combination_id='${id}' and status='DRAFT'`) === "0", u.status);
  r = await api(`${FS}/bulk`, { method: "POST", data: { items: [] } });
  step("bulk fail: nothing ticked is 400 'Tick the rows to change.'", r.status === 400 && /Tick the rows/.test(r.body?.detail ?? ""), r.body?.detail);

  // ------------------------------------------------------------------ browser
  const b = await chromium.launch({ headless: process.env.QA_HEADED !== "1" });
  for (const width of [1440, 1024]) {
    const p = await (await b.newContext({ viewport: { width, height: 900 } })).newPage();
    await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* */ } });
    await p.goto(`${BASE}/c/${id}/questionnaires`); await p.getByText("Full form facts").waitFor({ timeout: 30000 });
    const main = async () => (await p.locator("main").innerText());
    let t = await main();
    step(`${width}: the strip adds up (facts = documents + client + case officer)`, (() => { const m = t.match(/(\d+)\s*Full form facts\s*=\s*(\d+)\s*From documents\s*\+\s*(\d+)\s*Client answers\s*\+\s*(\d+)\s*Case officer enters/); return !!m && +m[1] === +m[2] + +m[3] + +m[4]; })(), t.match(/\d+\s*Full form facts[\s\S]{0,120}/)?.[0]);
    step(`${width}: no "agent" and no decision numbers on the tab (P-154)`, !/\bagent\b/i.test(t) && !/\bP-\d+/.test(t));
    await p.screenshot({ path: path.join(SHOTS, `qn-tab-${width}.png`) });
    const axe = await new AxeBuilder({ page: p }).include("main").analyze();
    step(`${width}: axe on the tab (serious or critical: none)`, axe.violations.filter((x) => ["serious", "critical"].includes(x.impact)).length === 0, axe.violations.map((x) => `${x.id}:${x.nodes.length}`));
    // Person chip changes the per-person line and the address
    await p.getByRole("button", { name: /^Spouse or partner ·/ }).click();
    await p.waitForURL(/role=spouse_or_partner/); await p.getByText(/^Spouse or partner: the forms need/).waitFor({ timeout: 15000 });
    step(`${width}: the Spouse chip shows the spouse's own line and keeps it in the address`, true);
    t = await main();
    step(`${width} (Minor, note): no section shows "0 questions" for a person`, !/· 0 questions for/.test(t), (t.match(/[^\n]*· 0 questions for[^\n]*/g) ?? []).slice(0, 3));
    await p.getByRole("button", { name: /^Principal applicant ·/ }).click(); await p.getByText(/^Principal applicant: the forms need/).waitFor({ timeout: 15000 });
    // Drawer on a case fact shown in the principal's table
    if (width === 1440) {
      await p.getByRole("button", { name: /^Details of: Official language/ }).click();
      const d = p.getByRole("dialog"); await d.waitFor();
      const dt = await d.innerText();
      step("QA-94 fail: the drawer shows no system name (case.service_language)", !/case\.service_language/.test(dt));
      const ax2 = await new AxeBuilder({ page: p }).include("[role=dialog]").analyze();
      step("1440: axe on the drawer (serious or critical: none)", ax2.violations.filter((x) => ["serious", "critical"].includes(x.impact)).length === 0, ax2.violations.map((x) => `${x.id}:${x.nodes.length}`));
      await d.getByText("Ask in pre-qualification").click();
      await d.getByRole("button", { name: "Save" }).click(); await sleep(2500);
      const still = await p.getByRole("dialog").count();
      const err = still ? await p.getByRole("dialog").innerText() : "";
      step("QA-92 fail: Save in the drawer on a case fact (Official language, pre-qualification on) saves", !still && sql(`select count(*) from fact_source where combination_id='${id}' and lineage_key='case|case.service_language'`) === "1", err.match(/No form[^\n]*/)?.[0] ?? (still ? "drawer still open" : "no row stored"));
      if (still) await p.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
      // Case officer on a person's fact: the reason is asked, the field error is linked
      await p.getByRole("button", { name: /^Details of: Given name\(s\) of any other name/ }).click().catch(async () => { await p.getByRole("button", { name: /^Personal details/ }).first().click(); await p.getByRole("button", { name: /^Details of: Given name\(s\) of any other name/ }).click(); });
      const d2 = p.getByRole("dialog"); await d2.waitFor();
      await d2.getByText("Case officer", { exact: true }).click();
      await d2.getByRole("button", { name: "Save" }).click(); await sleep(1500);
      const ta = d2.locator("textarea");
      step("P-155(3) fail: Save without a reason keeps the drawer open with the refusal in words", /write why/.test(await d2.innerText()) && (await ta.getAttribute("aria-invalid")) === "true");
      step("a11y (Minor, note): the reason box points at its error (aria-describedby)", !!(await ta.getAttribute("aria-describedby")));
      await ta.fill("The firm records other names at intake");
      const before = (await p.locator("body").innerText()).match(/Draft · (\d+) change/)?.[1] ?? "0";
      await d2.getByRole("button", { name: "Save" }).click(); await p.getByRole("dialog").waitFor({ state: "detached", timeout: 15000 });
      await sleep(2500);
      const after = (await p.locator("body").innerText()).match(/Draft · (\d+) change/)?.[1] ?? "0";
      const truth = sql(`select count(distinct lineage_key) from fact_source where combination_id='${id}' and status='DRAFT'`);
      step("pass: with a reason the row reads 'Case officer (changed here) Why: …'", /Why: The firm records other names at intake/.test(await main()));
      step("header: the's draft count moves with the save (no reload)", Number(after) > Number(before), { before, after, draftRowsInDatabase: truth });
      await p.screenshot({ path: path.join(SHOTS, "qn-case-officer-why-1440.png") });
      // Section Remove asks first or offers Undo (P-116)
      // A fresh page, so an earlier save's Undo toast cannot count as this one's.
      await p.reload(); await p.getByText("Full form facts").waitFor({ timeout: 30000 });
      // Since 5f6c8deb (QA-93 fix) Remove shows only where it changes something; other sections say why in words.
      const rmBtn = p.getByRole("button", { name: /^Remove from questionnaire: / }).first();
      const notHere = await p.locator("[data-remove-why]").count();
      step("QA-93: sections where Remove changes nothing say why in words instead", notHere > 0, notHere);
      const rmCount = await p.getByRole("button", { name: /^Remove from questionnaire: / }).count();
      const sec = rmCount ? (await rmBtn.getAttribute("aria-label") ?? "").replace("Remove from questionnaire: ", "") : "(no section offers Remove here)";
      if (rmCount) { await rmBtn.click(); await sleep(2500); }
      const asked = await p.getByRole("dialog").count() + await p.getByRole("alertdialog").count();
      const undo = await p.getByRole("button", { name: "Undo" }).count();
      const said = (await p.locator("[role=status]").allInnerTexts()).join(" | ");
      step("QA-93 fail: Remove from questionnaire on a section asks first or offers Undo (P-116)", !rmCount || asked > 0 || undo > 0, { sec, asked, undo, said });
      if (asked) await p.keyboard.press("Escape");
      if (!/Submitted documents ·/.test(await main())) { await p.getByLabel("Library section to add").selectOption({ label: "Submitted documents" }); await p.getByRole("button", { name: "Add section" }).click(); await sleep(2000); }
      step("Add a library section brings the removed section back", /Submitted documents ·/.test(await main()));
    }
    // Keyboard: the person chips and the ⋯ menu are reachable by Tab
    await p.getByRole("button", { name: /^Principal applicant ·/ }).focus(); await p.keyboard.press("Tab");
    step(`${width}: Tab moves from a person chip to the next control`, await p.evaluate(() => document.activeElement?.tagName === "BUTTON"));
    await p.close();
  }
  // Wrong person by address: a client opens the tab
  const pc = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await pc.goto(BASE); await pc.evaluate(() => { try { localStorage.setItem("xr-actor", "user-P"); } catch { /* */ } });
  await pc.goto(`${BASE}/c/${id}/questionnaires`); await sleep(3000);
  const ct = await pc.locator("body").innerText();
  step("client by address: the tab is not shown to a client, in words", !/Full form facts/.test(ct), ct.slice(0, 200));
  const rc = await api(FS, { actor: "user-P" });
  step("client by API: fact sources are refused (403)", rc.status === 403, rc.status);
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
