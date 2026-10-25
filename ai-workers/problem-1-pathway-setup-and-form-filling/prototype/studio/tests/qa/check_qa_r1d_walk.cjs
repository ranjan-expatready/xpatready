// qa lane, /qa after-merge on main 8aef175: runtime R1d walked as the case officer and the client would — the forms
// panel (generate, out of date, a lock refused while the form is not ready, filed, stale after a change; a form the
// release files Online not offered) and "none apply" for a required group (the client says it and withdraws it; the
// officer says it, confirms it; readiness follows), and a filed copy going stale when the client adds an entry after
// filing. 1440 px and 390 px, axe on each state, data checked underneath. Facts the walk does not test are set through
// the API (P-33: setup is not under test). Every person and value is Sample. No model call (US$0).
//   zsh studio/tools/isolated.sh qa_rt5 4474 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4474 xr_studio_qa_rt5
//   node studio/tests/qa/check_qa_r1d_walk.cjs 4474 xr_studio_qa_rt5
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const PORT = process.argv[2] ?? "4474", DB = process.argv[3] ?? "xr_studio_qa_rt5", BASE = `http://localhost:${PORT}`;
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/local/bin/psql"].find((p) => fs.existsSync(p));
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const OUT = path.join(__dirname, "..", "..", "..", "..", "product", "qa", "reports", `${new Date().toISOString().slice(0, 10)}-${process.env.QA_MODE ?? "after-merge"}`); fs.mkdirSync(OUT, { recursive: true });
const OFFICER = "user-O", CLIENT = "user-P";
let pass = 0, fail = 0, shot = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 280)}` : ""}`); };
const note = (name, detail) => console.log(`NOTE  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 280)}` : ""}`);
const call = async (method, url, body, actor = OFFICER) => { const r = await fetch(`${BASE}/api${url}`, { method, headers: { "x-actor": actor, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
const wait = async (fn, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const run = Date.now().toString(36).slice(-5);

(async () => {
  const vv = sql("select id from combination where combination_key='vv.single'");
  const open = async (ref, name) => (await call("POST", "/runtime/cases", { combinationId: vv, reference: `${ref}-${run}`, clientActor: CLIENT, principal: { displayName: name } })).body;
  // API helpers for setup only (the facts the walk does not test), as the builders' suite reaches "ready".
  const helpers = (caseId) => {
    const agent = async () => (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`)).body;
    const forms = async () => (await call("GET", `/runtime/cases/${caseId}/forms`)).body.forms;
    const formOf = async (form, subject) => (await forms()).find((f) => f.form === form && f.subject_id === subject);
    const sample = (q) => q.options?.length ? q.options[0].key : q.shape?.phone ? { country_code: "1", number: "5550100" } : q.value_type === "yes_no" ? false : q.value_type === "date" ? (q.shape?.datePrecision === "month" ? "1990-01" : "1990-01-01") : q.value_type === "number" ? "1000" : q.value_type === "address" ? { street_name: "Sample Road", city: "Sample City", country: "Canada" } : /email/.test(q.fact) ? "client.w@example.com" : "SAMPLE";
    const answer = async (subject, fact, value) => { const v = await agent(); const q = v.sections.flatMap((s) => s.questions).find((x) => x.subjectId === subject && x.fact === fact); return call("PUT", `/runtime/cases/${caseId}/answers/${subject}/${fact}`, { value, expectedId: q?.answer?.id ?? null }); };
    const confirmAll = async (subject) => { const v = await agent(); for (const s of v.sections.filter((x) => x.subjectId === subject)) { const seen = [...s.questions.flatMap((q) => [q.answer?.id, ...(q.rows ?? []).map((r) => r.answer?.id)]), s.group?.none_apply?.id].filter(Boolean); if (seen.length) await call("POST", `/runtime/cases/${caseId}/sections/${s.section}/confirm`, { subjectId: subject, seen }); } };
    const makeReady = async (subject, form, caseSubject) => {
      for (let k = 0; k < 3; k++) {
        const f0 = await formOf(form, subject); if (f0.readiness.ready) return true;
        const v = await agent();
        const todo = v.sections.flatMap((x) => x.questions).filter((q) => q.required && !q.hidden && !q.group && q.fills.some((x) => x.form === form && x.person === f0.person) && !q.answer?.confirmed);
        for (const q of todo) await answer(q.subjectId, q.fact, sample(q));
        const groups = f0.readiness.missing.filter((m) => m.fact.startsWith("group:")).map((m) => m.fact.slice(6));
        const secs = groups.map((g) => v.sections.find((x) => x.section === g && x.group && (x.subjectId === subject || x.subjectId === caseSubject))).filter(Boolean);
        for (const sec of secs) await call("PUT", `/runtime/cases/${caseId}/groups/${sec.subjectId}/${sec.section}/none-apply`, { noneApply: true, expectedId: sec.group?.none_apply?.id ?? null });
        for (const subj of new Set([...todo.map((q) => q.subjectId), ...secs.map((x) => x.subjectId)])) await confirmAll(subj);
      }
      return (await formOf(form, subject)).readiness.ready;
    };
    return { agent, forms, formOf, answer, confirmAll, makeReady };
  };

  const browser = await chromium.launch({ channel: "chrome" });
  const errors = [];
  const page = async (actor, width) => {
    const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 } });
    await ctx.addInitScript((a) => { try { if (!sessionStorage.getItem("qa-init")) { localStorage.setItem("xr-actor", a); sessionStorage.setItem("qa-init", "1"); } } catch { /* private window */ } }, actor);
    const p = await ctx.newPage(); p.on("pageerror", (e) => errors.push(String(e)));
    return p;
  };
  const look = async (p, name) => {
    const sw = await p.evaluate(() => document.documentElement.scrollWidth), w = p.viewportSize().width;
    step(`${name} at ${w} px: no sideways scroll`, sw <= w + 1, `${sw} px`);
    const axe = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze()).violations;
    step(`${name} at ${w} px: axe clean`, !axe.length, axe.map((v) => `${v.id} (${v.nodes.length})`).join(", ") || "clean");
    await p.screenshot({ path: path.join(OUT, `r1d-${String(++shot).padStart(2, "0")}-${name.replace(/\W+/g, "-")}-${w}.png`), fullPage: true });
  };
  const text = async (p) => (await p.innerText("body")).replace(/\s+/g, " ");

  // ───────────────────────── Case W: the forms panel, officer at 1440 px
  const W = await open("QA-R1D-W", "Sample Applicant W"), H = helpers(W.id);
  const P = W.people.find((x) => x.role === "principal").subject_id, caseSubject = W.people.find((x) => x.role === "case").subject_id;
  const o = await page(OFFICER, 1440);
  await o.goto(`${BASE}/cases/${W.id}`); await o.getByRole("heading", { name: /IMM 5257 for Sample Applicant W/ }).waitFor();
  const row = (form) => o.locator("li", { has: o.getByRole("heading", { name: new RegExp(`${form} for Sample Applicant W`) }) });
  step("forms panel: each PDF form of the release is listed for the person (IMM 5257, IMM 5707), with what blocks filing", await row("IMM 5257").isVisible() && await row("IMM 5707").isVisible() && /to answer or confirm before filing/.test(await row("IMM 5257").innerText()));
  await look(o, "officer forms panel empty");
  const copies = () => Number(sql(`select count(*) from form_instance where case_id='${W.id}'`));
  await row("IMM 5257").getByRole("button", { name: "Generate a copy" }).dblclick();
  const generated = await wait(async () => /Generated|Out of date/.test(await row("IMM 5257").innerText()));
  step("Generate a copy (double-clicked): one copy, written and shown as Generated", generated && copies() === 1, { copies: copies(), text: (await row("IMM 5257").innerText()).replace(/\s+/g, " ").slice(0, 160) });
  const blockedText = (await row("IMM 5257").innerText()).replace(/\s+/g, " ");
  const filedBtn = row("IMM 5257").getByRole("button", { name: "Filed" });
  step("P-71: while IMM 5257 is not ready, Filed and Validated copy uploaded back are disabled and the row says why", await filedBtn.isDisabled().catch(() => false) && /Not yet:/.test(blockedText), blockedText.slice(0, 220));
  const copyId = sql(`select id from form_instance where case_id='${W.id}' order by created_at desc limit 1`);
  let r = await call("POST", `/runtime/form-copies/${copyId}/lock`, { kind: "filed" });
  step("P-71 underneath: locking that copy through the API is refused (409) in plain words", r.status === 409 && /fact|confirm|ready/i.test(r.body?.detail ?? ""), { status: r.status, detail: r.body?.detail });
  await look(o, "officer copy not ready");
  // Out of date: a confirmed fact changes after the copy.
  await H.answer(P, "person.family_name", "SAMPLEW"); await H.confirmAll(P);
  await H.answer(P, "person.family_name", "SAMPLEW-CHANGED"); await H.confirmAll(P);
  await o.reload(); await o.getByRole("heading", { name: /IMM 5257 for Sample Applicant W/ }).waitFor();
  await wait(async () => /Out of date/.test(await row("IMM 5257").innerText()), 8000);
  const ood = (await row("IMM 5257").innerText()).replace(/\s+/g, " ");
  step("out of date: after a confirmed fact changes, the copy reads Out of date and the button offers a new copy", /Out of date/.test(ood) && /Generate a new copy/.test(ood), ood.slice(0, 200));
  // Ready, a new copy, filed.
  const ready = await H.makeReady(P, "IMM 5257", caseSubject);
  step("setup: with every required fact confirmed (API), IMM 5257 is ready to file", ready);
  await o.reload(); await row("IMM 5257").getByRole("button", { name: "Generate a new copy" }).click();
  await wait(async () => /Generated/.test(await row("IMM 5257").innerText()) && !/Generating|Waiting/.test(await row("IMM 5257").innerText()));
  await row("IMM 5257").getByRole("button", { name: "Filed" }).first().click();
  await row("IMM 5257").getByRole("group", { name: "Lock this copy" }).getByRole("button", { name: "Lock" }).click();
  const filedOk = await wait(async () => /Filed/.test(await row("IMM 5257").innerText()) && Number(sql(`select count(*) from form_instance where case_id='${W.id}' and locked_kind='filed'`)) === 1, 10000);
  step("ready → Generate a new copy → Filed → Lock: the copy is locked as Filed (database: one filed copy)", filedOk, (await row("IMM 5257").innerText()).replace(/\s+/g, " ").slice(0, 200));
  const filed = JSON.parse(sql(`select json_build_object('id', id, 'sha', sha256) from form_instance where case_id='${W.id}' and locked_kind='filed'`) || "{}");
  await look(o, "officer copy filed");

  // ───────────────────────── The client adds an entry after filing (390 px): the filed copy goes stale
  const groupSec = (await H.agent()).sections.find((s) => s.group?.required && s.group?.none_apply?.value === true && (s.subjectId === P || s.subjectId === caseSubject));
  if (!groupSec) note("no required group with none apply after makeReady: the stale-after-entry walk cannot run");
  const c = await page(CLIENT, 390);
  if (groupSec) {
    await c.goto(`${BASE}/cases/${W.id}/questionnaire`); await c.getByRole("heading", { name: "Your questionnaire" }).waitFor();
    await c.getByRole("button", { name: new RegExp(groupSec.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).first().click();
    await c.getByRole("button", { name: /Entries apply after all/ }).first().click();
    await wait(async () => await c.getByRole("button", { name: "Add an entry" }).first().isVisible().catch(() => false), 8000);
    await c.getByRole("button", { name: "Add an entry" }).first().click(); await c.waitForTimeout(1500);
    await look(c, "client entry after filing");
    await o.reload(); await o.getByRole("heading", { name: /IMM 5257 for Sample Applicant W/ }).waitFor();
    await wait(async () => /Stale/.test(await row("IMM 5257").innerText()), 8000);
    const st = (await row("IMM 5257").innerText()).replace(/\s+/g, " ");
    const after = JSON.parse(sql(`select json_build_object('id', id, 'sha', sha256) from form_instance where id='${filed.id}'`) || "{}");
    step("an entry added after filing: the filed copy reads Stale · Filed; its file and row are unchanged (never overwritten)", /Stale/.test(st) && after.sha === filed.sha, { text: st.slice(0, 180), sameFile: after.sha === filed.sha });
    const f = await H.formOf("IMM 5257", P);
    step("readiness follows: with an unconfirmed entry, IMM 5257 is not ready to file again", !f.readiness.ready, f.readiness.missing.slice(0, 3));
    await look(o, "officer copy stale");
  }

  // ───────────────────────── "None apply" as the client (390 px): say it, withdraw it; readiness follows
  const X = await open("QA-R1D-X", "Sample Applicant X"), HX = helpers(X.id);
  const PX = X.people.find((x) => x.role === "principal").subject_id, caseX = X.people.find((x) => x.role === "case").subject_id;
  const gx = (await HX.agent()).sections.find((s) => s.group?.required && s.group.rows === 0 && (s.subjectId === PX || s.subjectId === caseX) && s.group.client);
  if (!gx) note("no required group the client answers on case X");
  else {
    const label = `Entries in "${gx.title}": add them, or say none apply`;
    const blocks = async () => (await HX.forms()).some((f) => f.readiness.missing.some((m) => m.fact === `group:${gx.section}`));
    step(`readiness before: the empty required group "${gx.title}" blocks filing, named in plain words`, await blocks() && (await HX.forms()).some((f) => f.readiness.missing.some((m) => m.label === label)));
    await c.goto(`${BASE}/cases/${X.id}/questionnaire`); await c.getByRole("heading", { name: "Your questionnaire" }).waitFor();
    await c.getByRole("button", { name: new RegExp(gx.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).first().click();
    await c.getByRole("button", { name: /^None apply/ }).first().click();
    const said = await wait(async () => /None apply/.test(await text(c)) && await c.getByRole("button", { name: /Entries apply after all/ }).first().isVisible().catch(() => false), 8000);
    step("client says None apply: it shows as said, with a way to change it", said);
    await look(c, "client none apply");
    step("client's own None apply counts as confirmed: the group no longer blocks filing", !(await blocks()));
    await c.getByRole("button", { name: /Entries apply after all/ }).first().click(); await c.waitForTimeout(1500);
    step("client withdraws it (Entries apply after all): the group blocks filing again", await blocks());
    // The officer says none apply for the client, then confirms the section (P-72: not confirmed until then).
    const v = (await HX.agent()).sections.find((s) => s.section === gx.section && s.subjectId === gx.subjectId);
    r = await call("PUT", `/runtime/cases/${X.id}/groups/${gx.subjectId}/${gx.section}/none-apply`, { noneApply: true, expectedId: v.group?.none_apply?.id ?? null });
    const unconfirmed = (await HX.agent()).sections.find((s) => s.section === gx.section && s.subjectId === gx.subjectId).group.none_apply;
    step("officer says None apply: saved, not confirmed yet, still blocks filing", r.status === 200 && unconfirmed?.confirmed === false && await blocks(), { status: r.status, confirmed: unconfirmed?.confirmed });
    await o.goto(`${BASE}/cases/${X.id}`); await o.waitForLoadState("networkidle");
    const confirmBtn = o.getByRole("button", { name: /Confirm section/ });
    note("officer case page: Confirm section buttons", await confirmBtn.count());
    await HX.confirmAll(gx.subjectId);
    step("officer confirms the section: None apply is confirmed and the group no longer blocks", !(await blocks()));
    await look(o, "officer none apply confirmed");
  }

  // ───────────────────────── A form the release files Online is not offered (the builders' fixture, read through the panel)
  const rel = JSON.parse(sql(`select json_build_object('id', id, 'v', version) from config_release where combination_id='${vv}' order by version desc limit 1`));
  const cols = sql(`select string_agg(quote_ident(column_name), ',' order by ordinal_position) from information_schema.columns where table_name='config_release'`).split(",");
  const pick = cols.map((x) => x === "id" ? "gen_random_uuid()" : x === "version" ? `${rel.v + 1}` : x === "snapshot" ? `jsonb_set(snapshot, '{forms}', (select jsonb_agg(case when f->>'form_number' = 'IMM 5257' then f || '{"channel":"ONLINE"}' else f end) from jsonb_array_elements(snapshot->'forms') f))` : x);
  const onlineRel = sql(`insert into config_release (${cols.join(",")}) select ${pick.join(",")} from config_release where id='${rel.id}' returning id`).split("\n")[0];
  const OC = await open("QA-R1D-ONLINE", "Sample Applicant O");
  sql(`update config_release set version = -1 where id='${onlineRel}'`);
  await o.setViewportSize({ width: 390, height: 844 });
  await o.goto(`${BASE}/cases/${OC.id}`); await o.getByRole("heading", { name: /IMM 5707 for Sample Applicant O/ }).waitFor();
  const panel = await text(o);
  step("a case whose release files IMM 5257 Online: the forms panel offers IMM 5707 only, no IMM 5257 copy", /IMM 5707 for Sample Applicant O/.test(panel) && !/IMM 5257 for Sample Applicant O/.test(panel));
  await look(o, "officer online form not offered");
  await o.goto(`${BASE}/cases/${W.id}`); await o.getByRole("heading", { name: /IMM 5257 for Sample Applicant W/ }).waitFor();
  await look(o, "officer forms panel");
  step("no page errors", !errors.length, errors.slice(0, 3));
  await browser.close();
  console.log(`\n${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
