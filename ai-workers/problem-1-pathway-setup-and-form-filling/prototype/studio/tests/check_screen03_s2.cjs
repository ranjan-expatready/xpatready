// Screen 03 slice S2 (runtime lane): the SQR tab (person roles, needed-fact coverage, sections and their questions, the
// phone view), coverage as a release block (BR-7, per role, with the fixes), "filled by" on the shared field (B2) and the
// Sponsor role (Sample), plus the five changes of the S1 early look. Through the API and in a browser like a person, axe
// on each view, screenshots at 1440 and 1024 px into product/screens/03-combination-workspace/screenshots/slice2/.
// A real gap is made the way it happens: an online version's screen field is mapped to a new shared field nobody is asked
// for (capture, second person, screen map). Setup runs the R1 setup script, through the API (P-33). Sample only; US$0.
//   zsh studio/tools/isolated.sh runtime_s32 4433 start && node studio/tests/check_screen03_s2.cjs 4433 xr_studio_runtime_s32
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = process.argv[2] ?? "4433", DB = process.argv[3] ?? "xr_studio_runtime_s32", BASE = `http://localhost:${PORT}`;
const STUDIO = path.join(__dirname, ".."), FIX = path.join(__dirname, "fixtures", "portal");
const SHOTS = path.join(STUDIO, "..", "..", "product", "screens", "03-combination-workspace", "screenshots", "slice2");
let pass = 0, fail = 0; const axeLog = [];
const ok = (name, c, detail) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 260)}` : ""}`); };
const call = async (method, url, body, actor = "user-A") => { const r = await fetch(`${BASE}/api${url}`, { method, headers: { "x-actor": actor, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
const upload = async (url, names) => { const fd = new FormData(); for (const n of names) fd.append("files", new Blob([fs.readFileSync(path.join(FIX, n))]), n); const r = await fetch(`${BASE}/api${url}`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd }); return { status: r.status, body: await r.json() }; };
const wait = async (fn, ms = 180000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 500)); } return false; };
const ws = (id, q, actor) => call("GET", `/combinations/${id}/workspace?${new URLSearchParams(q)}`, undefined, actor);
const GAP = "person.s2_birth_city_online";
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/local/bin/psql"].find((p) => fs.existsSync(p));
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim(); // setup ids only

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  // ───────────── setup (not under test): the visitor visa released by the R1 setup, through the API
  const setup = execFileSync(path.join(STUDIO, "node_modules", ".bin", "tsx"), [path.join(STUDIO, "tests", "runtime", "setup_visitor_visa.ts"), PORT, DB], { encoding: "utf8", cwd: STUDIO });
  const vv = JSON.parse(setup.split("\n").find((l) => l.startsWith("{\"combination\""))).combination;
  const rows = (await call("GET", "/catalogue?pw=INDIVIDUAL&f=all")).body.rows;
  const fsOut = rows.find((r) => r.combinationId && r.label === "Applicant outside Canada")?.combinationId;

  // ───────────── S1 early look, change 4 and Sponsor in the data: the API side
  let r = await ws(vv, { tab: "sqr" });
  ok("C4.1: SQR pass: the tab answers one role's questionnaire, every role with its count, coverage that adds up, sections and the phone view", r.status === 200 && r.body.sqr.roles.map((x) => x.role).join() === "principal,spouse_or_partner,child" && r.body.sqr.role === "principal" && r.body.sqr.coverage.client + r.body.sqr.coverage.officer + r.body.sqr.coverage.gaps.length === r.body.sqr.coverage.needed && r.body.sqr.sections.some((x) => x.questions.length) && r.body.phone.sections.length > 0, r.body.sqr?.coverage);
  const child = (await ws(vv, { tab: "sqr", role: "child" })).body.sqr, nobody = (await ws(vv, { tab: "sqr", role: "nobody" })).body.sqr;
  ok("C4.1: SQR fail: an unknown role shows the first role; a known one shows that role's person", child.role === "child" && child.person.startsWith("child-") && nobody.role === "principal");
  const fo = (await ws(fsOut, { tab: "overview" })).body.view.combination.participants;
  ok("C4.1 Sponsor: the Sample \"Applicant outside Canada\" has a Sponsor role (Sample, for the immigration expert), who files no application", fo.some((p) => p.role === "sponsor" && p.applies === false));
  const badRole = await call("PATCH", `/combinations/${fsOut}`, { participants: [...fo, { role: "cousin", label: "Cousin", min: 0, max: 1 }] });
  ok("C4.1 Sponsor fail: a role not on the list is refused in plain words", badRole.status === 400 && /Unknown participant role cousin/.test(JSON.stringify(badRole.body)), badRole.body);

  // ───────────── B2 filled by: the shared field, everywhere it is used
  const lang = "person.native_language";
  r = await call("PATCH", `/library/fields/${lang}`, { filledBy: "CASE_OFFICER" });
  let q = (await ws(vv, { tab: "sqr" })).body.sqr.sections.flatMap((x) => x.questions).find((x) => x.fact === lang);
  const phone = (await ws(vv, { tab: "sqr" })).body.phone.sections.flatMap((x) => x.questions).map((x) => x.fact);
  ok("C4.1 B2 pass: \"filled by the case officer\" is saved as a draft of the shared field, says how many combinations use it, and leaves the client's questionnaire", r.status === 200 && r.body.status === "DRAFT" && r.body.where_used.combinations >= 1 && q.filled_by === "CASE_OFFICER" && q.filled_by_set && !phone.includes(lang), { where: r.body.where_used, q });
  const decl = (await call("GET", `/combinations/${vv}/config?mode=draft`)).body.snapshot.placements.find((p) => p.section_id === "background_declarations")?.fact;
  r = await call("PATCH", `/library/fields/${decl}`, { filledBy: "CASE_OFFICER" });
  ok("C4.1 B2 fail: a background or declaration question stays with the client (422, on the field)", r.status === 422 && r.body.errors?.[0]?.field === "filledBy" && /stay with the client/.test(r.body.detail), [decl, r.status]);
  r = await call("PATCH", `/library/fields/${lang}`, { filledBy: "SOMEONE" });
  const r2 = await call("PATCH", `/library/fields/${lang}`, { filledBy: "CLIENT" }, "user-B");
  ok("C4.1 B2 fail: an unknown value is a 400 with a message; a person without the author duty is refused (403)", r.status === 400 && r.body.errors?.[0]?.message === "Choose Client or Case officer." && r2.status === 403);
  await call("PATCH", `/library/fields/${lang}`, { filledBy: null });
  q = (await ws(vv, { tab: "sqr" })).body.sqr.sections.flatMap((x) => x.questions).find((x) => x.fact === lang);
  ok("C4.1 B2 pass: back to \"as placed\" (null): the client answers it again", q.filled_by === "CLIENT" && !q.filled_by_set);

  // ───────────── BR-7: a real gap blocks release (an online screen field mapped to a field nobody is asked for)
  // An online-only Sample form (no PDF version in the library, so its screen map is the one a case reads; see build
  // discoveries: an Online line of a form that also has a PDF version still reads the PDF map).
  const cap = (await call("POST", "/captures", { portal: "ircc_portal", form: "IMM 9001", title: "Sample online-only form (S2 check)", applicationType: "Visitor visa" })).body;
  await upload(`/captures/${cap.id}/screens`, ["imm5257-online-s1-personal.html", "imm5257-online-s2-marital.html", "imm5257-online-s3-language.html"]);
  await call("POST", `/captures/${cap.id}/finish`);
  await wait(async () => ((await call("GET", `/captures/${cap.id}`)).body.review_file ?? "").endsWith(".pdf"));
  await call("POST", `/captures/${cap.id}/approve`, undefined, "user-B");
  const ed = sql(`select form_edition_id from portal_capture where id='${cap.id}'`);
  await call("PATCH", `/combinations/${vv}/portal`, { portal: "ircc_portal" });
  const added = await call("POST", `/combinations/${vv}/lines`, { kind: "FORM", formKey: "IMM 9001" });
  await call("POST", `/online-versions/${ed}/screen-map/draft`);
  await call("POST", `/online-versions/${ed}/screen-map/accept`, {}, "user-C");
  await call("POST", "/library/fields", { key: GAP, meaning: "City or town of birth, as the online form asks it", valueType: "text" });
  const leftovers = sql(`select data_path from form_field_map where form_edition_id='${ed}' and outcome='unresolved'`).split("\n").filter(Boolean);
  for (const i of [...new Set(["birthCity", ...leftovers])]) await call("PATCH", `/online-versions/${ed}/screen-map`, i === "birthCity" ? { input: i, fact: GAP } : { input: i, notAFact: true, reason: "Asked elsewhere in this case (S2 check)" }, "user-C");
  await call("POST", `/editions/${ed}/option-maps/draft`);
  await call("PATCH", `/editions/${ed}/option-maps`, { dataPath: "sex", map: { f_female: "FEMALE", m_male: "MALE", u_unknown: "UNKNOWN", x_another_gender: "ANOTHER" } });
  ok("setup: the online-only IMM 9001 is a line filed Online", added.status === 201 || added.status === 200, added.body);
  const gapView = (await ws(vv, { tab: "sqr" })).body.sqr;
  const problems = (await call("GET", `/combinations/${vv}`)).body.draft.problems.filter((p) => p.where === "SQR");
  ok("C4.1 BR-7 fail: a fact the online IMM 9001 needs that nobody is asked for is a gap per role, and a release problem naming the fact, the form and the fixes", gapView.coverage.gaps.some((g) => g.fact === GAP && g.forms.includes("IMM 9001")) && problems.length >= 1 && problems.every((p) => p.level === "error" && p.item === GAP && /nobody is asked for it\. Fix: ask it in a library section/.test(p.message)), problems.map((p) => p.message));
  const sub = await call("POST", `/combinations/${vv}/submit`, { note: "S2 check" });
  ok("C4.1 BR-7 fail: submitting is refused while the gap is open, naming it", sub.status === 400 && new RegExp(GAP.replace(/\./g, "\\.")).test(JSON.stringify(sub.body)), sub.body?.message?.slice?.(0, 160));
  // ───────────── the browser, like a person
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const page = async (actor, width) => { const ctx = await b.newContext({ viewport: { width, height: 900 } }); await ctx.addInitScript((a) => localStorage.setItem("xr-actor", a), actor); const p = await ctx.newPage(); p.errors = []; p.on("pageerror", (e) => p.errors.push(e.message)); return p; };
  const axe = async (p, state) => { const res = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); const v = res.violations.filter((x) => x.impact === "serious" || x.impact === "critical"); axeLog.push({ state, violations: v.map((x) => ({ id: x.id, nodes: x.nodes.length, sample: x.nodes[0]?.target?.join(" ") })) }); return v; };
  const shot = async (p, name) => { await p.waitForTimeout(250); await p.screenshot({ path: path.join(SHOTS, `${name}-${p.viewportSize().width}.png`), fullPage: true }); };
  for (const width of [1024, 1440]) { // 1440 last: it closes the gap
    const p = await page("user-A", width);
    await p.goto(`${BASE}/c/${vv}/sqr`); await p.getByRole("group", { name: "Person role" }).waitFor();
    ok(`C4.1 (${width}): the SQR tab shows the person roles with counts and the gap that blocks release, with its fix`, (await p.getByRole("list", { name: "Facts nobody is asked for" }).getByText(GAP).count()) === 1 && /Release is blocked until every needed fact is asked/.test(await p.locator("main").innerText()));
    ok(`C1.4, C4.1: axe (${width}) SQR with a gap: no serious or critical violation`, !(await axe(p, `sqr-gap-${width}`)).length, axeLog.at(-1).violations); await shot(p, "sqr-gap");
    const tabs = await p.getByRole("tablist", { name: "Combination" }).getByRole("tab").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().right)));
    ok(`C1.4 (${width}): S1 change 5: every tab, Sources included, is on screen (the row wraps instead of hiding tabs)`, tabs.length === 9 && tabs.every((x) => x <= width), tabs);
    await p.getByRole("tab", { name: "Review and release" }).click(); await p.getByText(new RegExp(GAP.replace(/\./g, "\\."))).first().waitFor();
    ok(`C4.1 BR-7 (${width}): Review and release lists the gap as a problem that blocks release`, /nobody is asked for it/.test(await p.locator("main").innerText())); await shot(p, "review-gap-blocks");
    if (width === 1440) {
      // place the field: the gap closes, the problem goes
      await call("POST", `/library/fields/${GAP}/placement`, { sectionKey: "personal_details", collectedFrom: "client_questionnaire", repeats: "per_person", questionText: "City or town of birth" });
      await p.goto(`${BASE}/c/${vv}/sqr`); await p.getByRole("group", { name: "Person role" }).waitFor();
      ok("C4.1 BR-7 pass: once the field is placed in a section, the gap and the release problem are gone", (await p.getByRole("list", { name: "Facts nobody is asked for" }).count()) === 0 && !(await call("GET", `/combinations/${vv}`)).body.draft.problems.some((x) => x.where === "SQR"));
      await shot(p, "sqr");
      // filled by, with the where-used confirmation
      const row = p.locator(`tr[data-fact="${lang}"]`); if (!(await row.count())) await p.getByRole("button", { name: /Languages/ }).click();
      await p.getByRole("combobox", { name: /^Who fills Native language/ }).selectOption("CASE_OFFICER");
      const dlg = p.getByRole("dialog"); await dlg.waitFor();
      ok("C4.1 B2 (browser): changing who fills a shared field first says it changes the field everywhere, and in how many combinations", /This changes the shared field everywhere/.test(await dlg.innerText()) && (await dlg.getByRole("button", { name: /^Change it in \d+ combination/ }).count()) === 1);
      ok("C4.1: axe filled-by dialog: no serious or critical violation", !(await axe(p, "sqr-filled-by-dialog")).length, axeLog.at(-1).violations); await shot(p, "sqr-filled-by-dialog");
      await dlg.getByRole("button", { name: /^Change it in/ }).click(); await dlg.waitFor({ state: "detached" });
      await p.waitForFunction((f) => document.querySelector(`tr[data-fact="${f}"]`)?.textContent?.includes("Case officer") && !document.querySelector(`tr[data-fact="${f}"]`)?.textContent?.includes("as placed"), lang, { timeout: 8000 }).catch(() => {});
      ok("C4.1 B2 pass (browser): saved; the row says the case officer fills it (no longer \"as placed\")", !/as placed/.test(await p.locator(`tr[data-fact="${lang}"]`).innerText()));
      await call("PATCH", `/library/fields/${lang}`, { filledBy: null });
      // S1 change 2: a field's error clears when it is edited
      await p.goto(`${BASE}/c/${vv}/forms`); await p.getByRole("button", { name: "Edit the IMM 5707 line" }).click();
      const d = p.getByRole("dialog"); await d.waitFor();
      await d.getByLabel("Copies").fill("x"); await d.getByRole("button", { name: "Save line" }).click(); await d.getByText("Copies is a whole number from 1 to 9.").waitFor();
      await d.getByLabel("Copies").fill("2");
      ok("C1.8: S1 change 2: the copies error goes as soon as the field is edited", (await d.getByText("Copies is a whole number from 1 to 9.").count()) === 0);
      await shot(p, "forms-panel-error-cleared");
      await d.getByLabel("Minimum age").fill("18"); await d.getByRole("button", { name: "Save line" }).click(); await d.waitFor({ state: "detached" });
      // S1 change 1: Sample ages make the minimum age visible in Preview
      await p.goto(`${BASE}/c/${vv}/preview?family=family2&person=child-1`); await p.getByRole("heading", { name: /Forms for Child \(travelling\) 1/ }).waitFor();
      const kidForms = await p.locator("section", { has: p.getByRole("heading", { name: /^Forms for/ }) }).innerText();
      await p.getByRole("group", { name: "Person" }).getByRole("button", { name: /^Applicant/ }).click(); await p.getByRole("heading", { name: /^Forms for Applicant/ }).waitFor();
      const adultForms = await p.locator("section", { has: p.getByRole("heading", { name: /^Forms for/ }) }).innerText();
      ok("C1.8: S1 change 1: in Preview the 8-year-old Sample child does not get IMM 5707 (from age 18); the adult does", !/IMM 5707/.test(kidForms) && /IMM 5707/.test(adultForms), { kidForms: kidForms.slice(0, 120) });
      const legend = await p.locator("fieldset legend", { hasText: "Answers that decide what applies" }).first().innerText().catch(() => "");
      const labels = await p.locator("fieldset", { hasText: "Answers that decide what applies" }).locator("label").allInnerTexts().catch(() => []);
      ok("C4.3: S1 change 3: the deciding answers name the person once (in the box title), not after every question", (!legend || /Applicant/.test(legend)) && labels.every((x) => !/\(Applicant\)/.test(x)), labels.slice(0, 2));
      await shot(p, "preview-sample-ages");
    }
    await p.goto(`${BASE}/c/${vv}/overview`); await p.getByText("Released versions").waitFor();
    ok(`C1.4 (${width}): S1 change 4: the Rules and checks card says what each number counts`, /\d+ rules? · \d+ checks?/.test(await p.locator("main").innerText()));
    await shot(p, "overview");
    ok(`C1.4, C4.1: no page errors (${width})`, !p.errors.length, p.errors);
    await p.context().close();
  }
  const ro = await page("user-B", 1440); await ro.goto(`${BASE}/c/${vv}/sqr`); await ro.getByRole("group", { name: "Person role" }).waitFor(); await ro.waitForTimeout(400);
  ok("C4.1: read-only: the approver sees who fills each question as words, no selects, no Add or Remove section", (await ro.getByRole("combobox", { name: /^Who fills/ }).count()) === 0 && (await ro.getByRole("button", { name: "Remove section" }).count()) === 0);
  await shot(ro, "sqr-readonly");
  await ro.goto(`${BASE}/c/${fsOut}/sqr`); await ro.getByRole("heading", { name: "No questionnaire yet" }).waitFor().catch(() => {});
  ok("C4.1: empty state: a combination with no forms says where questions come from", /No questionnaire yet/.test(await ro.locator("main").innerText()));
  await shot(ro, "sqr-empty");
  await b.close();
  fs.writeFileSync(path.join(SHOTS, "axe.json"), JSON.stringify(axeLog, null, 1));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.log(`FAIL  stopped: ${e.message.split("\n")[0]}`); console.log(`\n${pass} passed, ${fail + 1} failed`); process.exitCode = 1; });
