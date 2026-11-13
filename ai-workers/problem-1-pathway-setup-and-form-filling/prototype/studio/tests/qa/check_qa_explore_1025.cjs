// qa lane, /qa explore on main 8360565 (25 Oct): what a case officer and an author would try that no suite walks — a real
// Online release (capture, second person, screen map, release 2) and a case opened on it; the officer's Confirm section
// and None apply by click, with the client changing an answer in between; the library pages no browser test visits.
// Findings QA-38 to QA-42 fail here today and pass when fixed; the rest guard what works. Setup the walk does not test
// goes through the API (P-33). Every person and value is Sample. No model call (US$0).
// Repaired 1 Nov: the capture setup and the parked online routes are gone (P-102); the release files IMM 5257 Online directly.
//   zsh studio/tools/isolated.sh qa_x1 4476 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4476 xr_studio_qa_x1
//   node studio/tests/qa/check_qa_explore_1025.cjs 4476 xr_studio_qa_x1
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const PORT = process.argv[2] ?? "4476", DB = process.argv[3] ?? "xr_studio_qa_x1", BASE = `http://localhost:${PORT}`;
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/local/bin/psql"].find((p) => fs.existsSync(p));
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const FIX = path.join(__dirname, "..", "fixtures", "portal");
const OFFICER = "user-O", CLIENT = "user-P";
let pass = 0, fail = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 280)}` : ""}`); };
const call = async (method, url, body, actor = "user-A") => { const r = await fetch(`${BASE}/api${url}`, { method, headers: { "x-actor": actor, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
const upload = async (url, names) => { const fd = new FormData(); for (const n of names) fd.append("files", new Blob([fs.readFileSync(path.join(FIX, n))]), n); const r = await fetch(`${BASE}/api${url}`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd }); return { status: r.status, body: await r.json() }; };
const wait = async (fn, ms = 180000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 500)); } return false; };
const run = Date.now().toString(36).slice(-5);

(async () => {
  const vv = sql("select id from combination where combination_key='vv.single'");
  // ───────────────────────── setup: IMM 5257 filed Online, released as a new version (not under test)
  if (Number(sql(`select count(*) from config_release where combination_id='${vv}'`)) < 2) {
    // Drift fixed 1 Nov: portal capture, screen maps and the IRCC Portal choice were parked with the browser extension
    // (P-102, W1-02); Online stays a choice with a later-wave note. The second release now just files IMM 5257 Online.
    await call("PATCH", `/combinations/${vv}/forms/IMM 5257/channel`, { channel: "ONLINE" });
    await call("POST", `/combinations/${vv}/submit`, { note: "qa explore: IMM 5257 filed Online" });
    const sub = (await call("GET", `/combinations/${vv}/review`, undefined, "user-C")).body.submission;
    await call("POST", `/combinations/${vv}/signoff`, { items: (sub?.changeSummary ?? []).map((x) => `${x.kind}|${x.key}`), action: "signed" }, "user-C");
    await call("POST", `/combinations/${vv}/approve`, undefined, "user-B");
  }
  const latest = Number(sql(`select max(version) from config_release where combination_id='${vv}'`));
  step("setup: Visitor visa has a second release that files IMM 5257 Online (later wave, P-102)", latest >= 2, { latest });

  // ───────────────────────── API routes no test reached (graph G3): valid reads answer, bad ids are 404 in plain words, writes refuse
  // the wrong person, nothing answers 5xx.
  const Z = "00000000-0000-0000-0000-000000000000";
  const att = sql(`select id from source_attachment limit 1`), lineage = sql(`select lineage_key from document_requirement limit 1`);
  const probes = [
    ["GET /library/forms/:code/editions", await call("GET", `/library/forms/IMM%205257/editions`), 200],
    ["GET /library/forms/:code/editions (unknown)", await call("GET", `/library/forms/NOPE/editions`), 404], ["GET /library/answer-lists", await call("GET", `/library/answer-lists`), 200],
    ["GET /library/merges", await call("GET", `/library/merges`), 200], ["GET /combinations/:id/preview", await call("GET", `/combinations/${vv}/preview`), 200], ["GET /combinations/:id/preview (bad id)", await call("GET", `/combinations/not-a-uuid/preview`), 404],
    ["PATCH /combinations/:id/requirements/:lineage (empty)", await call("PATCH", `/combinations/${vv}/requirements/${lineage}`, {}), 400],
    ["PATCH /combinations/:id/requirements/:lineage (client)", await call("PATCH", `/combinations/${vv}/requirements/${lineage}`, {}, CLIENT), 403],
    ["POST /combinations/:id/rules (empty)", await call("POST", `/combinations/${vv}/rules`, {}), 400], ["PATCH /combinations/:id/rules/:key (empty)", await call("PATCH", `/combinations/${vv}/rules/nope`, {}), 400],
    ["GET /library/fields/:key", await call("GET", `/library/fields/person.uci`), 200], ["GET /library/fields/:key (unknown)", await call("GET", `/library/fields/nope`), 404],
    ["GET /library/sections", await call("GET", `/library/sections`), 200], ["POST /library/sections (by hand: no free add, C3.6; drift fixed 1 Nov)", await call("POST", `/library/sections`, {}), 410],
    ["GET /combinations/:id/attachments", await call("GET", `/combinations/${vv}/attachments`), 200], ["GET /attachments/:id/draft-options", await call("GET", `/attachments/${att}/draft-options`), 200],
    ["GET /attachments/:id/draft-options (bad id)", await call("GET", `/attachments/not-a-uuid/draft-options`), 404], ["GET /ledger", await call("GET", `/ledger`), 200],
    ["GET /official-library", await call("GET", `/official-library`), 200], ["GET /artifacts/:id/file (unknown)", await call("GET", `/artifacts/${Z}/file`), 404],
    ["GET /masters", await call("GET", `/masters`), 200], ["GET /intake/held", await call("GET", `/intake/held`), 200],
    ["GET /runtime/form-copies/:id/file (unknown)", await call("GET", `/runtime/form-copies/${Z}/file`, undefined, OFFICER), 404],
  ];
  const off = probes.filter(([, r, want]) => r.status !== want || (want >= 400 && !(r.body?.detail ?? r.body?.message)));
  step(`G3: ${probes.length} API probes of routes no test reached answer as expected, refusals in plain words, no 5xx`, !off.length, off.map(([n, r]) => `${n}: ${r.status}`));
  // QA-43's route (online forms of a combination) left the app with the extension (P-102): it must now be gone for any id.
  const r404 = await call("GET", `/combinations/${Z}/online-forms`), rGone = await call("GET", `/combinations/${vv}/online-forms`);
  step("C11.1 P-102: the parked online-forms route is gone (404) for an unknown and a real combination", r404.status === 404 && rGone.status === 404, [r404.status, rGone.status]);

  const browser = await chromium.launch({ channel: "chrome" });
  const page = async (actor, width) => {
    const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 } });
    await ctx.addInitScript((a) => { try { if (!sessionStorage.getItem("qa-init")) { localStorage.setItem("xr-actor", a); sessionStorage.setItem("qa-init", "1"); } } catch { /* private window */ } }, actor);
    return ctx.newPage();
  };
  const text = async (p, sel = "main") => (await p.locator(sel).first().innerText()).replace(/\s+/g, " ");
  const focused = (p) => p.evaluate(() => (document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent || "").trim());

  // ───────────────────────── QA-38, QA-41: the officer's Open a case dialog
  const o = await page(OFFICER, 1440);
  await o.goto(`${BASE}/cases`); await o.getByRole("button", { name: "Open a case" }).click();
  const dlg = o.getByRole("dialog"); await dlg.waitFor();
  step("QA-41 C6.1: the Open a case dialog puts focus on its first field, not on Close (Enter on Close throws the form away)", !/^Close$/.test(await focused(o)), await focused(o));
  const label = (await dlg.locator("select").first().locator("option").allInnerTexts()).find((x) => x.startsWith("Visitor visa"));
  step(`QA-38 C6.1: the combination list names the release the case will use (Visitor visa · release ${latest})`, label === `Visitor visa · release ${latest}`, label);
  await dlg.getByLabel("Your own reference (optional)").fill(`QA-EXP-${run}`); await dlg.getByLabel("Principal applicant's name").fill("Sample Applicant N");
  await dlg.getByRole("button", { name: "Open case" }).click(); await o.waitForURL(/\/cases\/[0-9a-f-]{36}$/);
  const caseId = o.url().split("/").pop();
  await o.getByRole("heading", { name: /IMM 5707 for Sample Applicant N/ }).waitFor();
  // B145 (#1252, C9.5; ruled D5): the case header names the release by its pack label ("Release <pack version>", as its
  // notice and panel do), so the expected words come from the latest release's pack version, not the combination's version.
  const pinned = (await call("GET", `/runtime/cases/${caseId}`, undefined, OFFICER)).body;
  const packLabel = `Release ${sql(`select coalesce(pv.version, cr.version) from config_release cr left join pack_version pv on pv.id = cr.pack_version_id where cr.combination_id='${vv}' and cr.version=${latest}`)}`;
  step(`C6.1: the case opens on the latest release (release ${latest} of the combination, labelled ${packLabel})`, pinned?.pin?.release_version === latest && (await text(o)).includes(packLabel), { pin: pinned?.pin?.release_version, label: pinned?.release?.label, packLabel });

  // ───────────────────────── QA-40: the forms panel of a case whose release files IMM 5257 Online
  const panel = await o.locator("section", { has: o.getByRole("heading", { name: "Forms", exact: true }) }).first().innerText().catch(async () => text(o));
  // P-145 (drift fixed 1 Nov): an Online line now offers one PDF copy marked "not for filing" instead of no copy at all.
  const onl = (await text(o)).match(/IMM 5257 · filed Online \(later wave\).{0,80}/)?.[0] ?? "";
  step("C7.1 P-145: a form filed Online is offered only as a copy not for filing (IMM 5257 · filed Online (later wave) · PDF copy, not for filing)", /not for filing|Answer sheet only/.test(onl), onl || "(no IMM 5257 Online card)");
  step("QA-40 C7.6, C7.7: the forms panel still names IMM 5257 and says it is filed Online (later wave; it is not silently missing)", /IMM 5257/.test(panel) && /Online/.test(panel), panel.replace(/\s+/g, " ").slice(0, 200));

  // ───────────────────────── C6.6 by click: Confirm section; refused when the client changed an answer meanwhile
  const sub = (await call("GET", `/runtime/cases/${caseId}`, undefined, OFFICER)).body;
  const P = (sub.people ?? []).find((x) => x.role === "principal")?.subject_id;
  const save = async (fact, value, actor) => { const v = (await call("GET", `/runtime/cases/${caseId}/questionnaire${actor === OFFICER ? "?mode=agent" : ""}`, undefined, actor)).body; const q = v.sections.flatMap((s) => s.questions).find((x) => x.subjectId === P && x.fact === fact); return call("PUT", `/runtime/cases/${caseId}/answers/${P}/${fact}`, { value, expectedId: q?.answer?.id ?? null }, actor); };
  await save("person.native_language", "ada", CLIENT);
  await o.reload(); await o.getByRole("tab", { name: /Sample Applicant N/ }).click();
  const lang = o.locator("section", { has: o.getByRole("heading", { name: "Languages", level: 2 }) }).first();
  await lang.waitFor();
  await save("person.native_language", "adama", CLIENT);
  const refused = o.waitForResponse((r) => /\/confirm$/.test(new URL(r.url()).pathname));
  await lang.getByRole("button", { name: "Confirm section" }).click();
  const r1 = await refused;
  step("C6.6 by click: Confirm section after the client changed an answer is refused (409), nothing confirmed, plain words", r1.status() === 409 && /nothing was confirmed/.test((await r1.json()).detail ?? "") && sql(`select count(*) from client_canonical_answer a join answer_subject s on s.id=a.subject_id where s.id='${P}' and a.status='VERIFIED'`) === "0");
  await o.waitForTimeout(800);
  const ok2 = o.waitForResponse((r) => /\/confirm$/.test(new URL(r.url()).pathname));
  await lang.getByRole("button", { name: "Confirm section" }).click();
  step("C6.6 by click: confirming again, once the page shows the new answer, confirms it", (await ok2).status() === 201 && /1 answer confirmed|answers confirmed/.test(await text(o, "body")));

  // ───────────────────────── C6.6 by click: the officer's None apply (double click) on a child's required group
  await o.getByRole("button", { name: "Add child" }).click(); await o.getByRole("dialog").getByLabel("Name").fill("Child Sample"); await o.getByRole("dialog").getByRole("button", { name: /^Add/ }).last().click();
  await o.getByRole("tab", { name: /Child Sample/ }).click();
  const na = o.getByRole("button", { name: /^None apply: Education history for Child Sample/ }); await na.waitFor();
  const edu = o.locator(`[id="${await na.evaluate((e) => e.closest("section").id)}"]`);
  // QA-417: wait for the answer's own pill: any "to confirm" text also matches the section pill and the "Nothing to confirm"
  // words beside the disabled button, before the page has the officer's answer.
  await na.dblclick(); await edu.getByText("Entered by staff · to confirm", { exact: true }).waitFor();
  await edu.getByRole("button", { name: "Confirm section" }).click(); await edu.getByText("Confirmed").first().waitFor();
  const child = (await call("GET", `/runtime/cases/${caseId}`, undefined, OFFICER)).body.people.find((x) => x.role === "child").subject_id;
  step("C6.6 by click: the officer's None apply (double-clicked) stores one answer; Confirm section confirms it", sql(`select count(*)||':'||sum((status='VERIFIED')::int) from client_group_answer where subject_id='${child}' and group_key='education_history' and superseded_by_id is null`) === "1:1");

  // ───────────────────────── QA-39: library pages (Screen 04 not yet rebuilt) and QA-42: the combination page note
  const a = await page("user-A", 1440);
  await a.goto(`${BASE}/library/fields`); await a.getByRole("heading", { level: 1 }).waitFor();
  const h1 = await a.getByRole("heading", { level: 1 }).innerText();
  step("QA-39 C3.10: the field library says shared field, not 'Canonical fields' (P-63)", !/canonical/i.test(h1), h1);
  await a.goto(`${BASE}/library/fields/person.uci`); await a.getByText("Where it is asked").waitFor();
  const fieldText = await text(a);
  step("QA-39 C3.10: a field page names people by role, not by login id (no 'user-A')", !/\buser-[A-Z]\b/.test(fieldText), fieldText.match(/.{30}\buser-[A-Z]\b.{5}/)?.[0]);
  const s = await page("user-A", 390); await s.goto(`${BASE}/library/fields/person.uci`); await s.getByText("Where it is asked").waitFor();
  const sw = await s.evaluate(() => document.documentElement.scrollWidth);
  step("QA-137 (was QA-39) C3.10: a field page fits a 390 px phone (no sideways scroll)", sw <= 391, `${sw} px`);
  // Pages no browser test visited (graph G4): each opens with its heading and no page error, as author and approver.
  const job = sql(`select id from drafting_job where combination_id='${vv}' limit 1`), batch = sql("select id from ai_batch limit 1");
  const errors = []; a.on("pageerror", (e) => errors.push(String(e)));
  const opens = async (where, h) => step(`G4: ${where} opens with its heading, no page error`, await a.getByRole("heading", { name: h, level: 1 }).waitFor({ timeout: 15000 }).then(() => true, () => false) && !errors.length, errors[0]);
  await a.goto(`${BASE}/library/sections`); await opens("/library/sections", "Sections");
  await a.goto(`${BASE}/library/documents`); await opens("/library/documents", "Document types");
  await a.goto(`${BASE}/library/checks`); await opens("/library/checks", "Checks");
  await a.goto(`${BASE}/c/${vv}/jobs/${job}`); await opens("/c/:id/jobs/:jobId", /AI-proposed field map/);
  await a.goto(`${BASE}/ai/${batch}`); await opens("/ai/:batchId", /Draft field maps/);
  await a.goto(`${BASE}/c/${vv}`); await a.getByRole("heading", { name: "Visitor visa", level: 1 }).waitFor();
  const comb = await text(a);
  step("QA-42 C1.4: a Live combination with released forms does not say its forms are 'not set up yet' (seed note)", !/not set up yet/.test(comb), comb.match(/Sample: [^.]*not set up yet\./)?.[0]);

  await browser.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
