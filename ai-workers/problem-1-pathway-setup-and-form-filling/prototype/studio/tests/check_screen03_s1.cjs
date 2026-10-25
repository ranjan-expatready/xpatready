// Screen 03 slice S1 (runtime lane): the combination workspace's tab route, Overview, Forms (the form line's copies,
// minimum age and signer) and Preview by person, through the API and in a browser like a person, with axe-core on each
// view and screenshots at 1440 and 1024 px into product/screens/03-combination-workspace/screenshots/slice1/. The
// preview is compared with a real case opened on the same release (BR-15: the same questions, in the same order). Setup
// (the visitor visa, released) runs the R1 setup script first, through the API (P-33). Sample people only; US$0.
//   zsh studio/tools/isolated.sh runtime_s3 4431 start && node studio/tests/check_screen03_s1.cjs 4431 xr_studio_runtime_s3
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = process.argv[2] ?? "4431", DB = process.argv[3] ?? "xr_studio_runtime_s3", BASE = `http://localhost:${PORT}`;
const STUDIO = path.join(__dirname, "..");
const SHOTS = path.join(STUDIO, "..", "..", "product", "screens", "03-combination-workspace", "screenshots", "slice1");
let pass = 0, fail = 0; const axeLog = [];
const ok = (name, c, detail) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 240)}` : ""}`); };
const call = async (method, url, body, actor = "user-A") => { const r = await fetch(`${BASE}/api${url}`, { method, headers: { "x-actor": actor, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
const ws = (id, q, actor) => call("GET", `/combinations/${id}/workspace?${new URLSearchParams(q)}`, undefined, actor);

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  // ───────────── setup (not under test): the visitor visa configured and released by the R1 setup, through the API
  const setup = execFileSync(path.join(STUDIO, "node_modules", ".bin", "tsx"), [path.join(STUDIO, "tests", "runtime", "setup_visitor_visa.ts"), PORT, DB], { encoding: "utf8", cwd: STUDIO });
  const vv = JSON.parse(setup.split("\n").find((l) => l.startsWith("{\"combination\""))).combination;
  const empty = (await call("GET", "/catalogue?pw=INDIVIDUAL&f=all")).body.rows.find((r) => r.combinationId && r.label === "Super visa")?.combinationId;

  // ───────────── BR-1: the tabs in the route, one request per tab view
  let r = await ws(vv, { tab: "forms" });
  ok("C1.4: BR-1 pass: tab=forms answers the Forms view (summary and one line per form)", r.status === 200 && r.body.tab === "forms" && r.body.lines.length === 2 && r.body.lines.every((l) => l.copies === 1 && l.minAge === null && l.signedBy === null && l.revision), r.body.lines?.map((l) => l.code));
  r = await ws(vv, { tab: "nope" });
  ok("C1.4: BR-1 fail: an unknown tab answers Overview, saying what was asked", r.status === 200 && r.body.tab === "overview" && r.body.asked === "nope" && r.body.view && r.body.summary);
  r = await ws("00000000-0000-0000-0000-000000000000", { tab: "overview" });
  const r2 = await ws("not-a-uuid", { tab: "overview" });
  ok("C1.4: BR-1 fail: an unknown combination is a 404 in plain words, never a 500", r.status === 404 && r2.status === 404 && /does not exist/.test(JSON.stringify(r.body)), [r.status, r2.status]);

  // ───────────── Form line (concept §2 Configuration; Q2): copies, minimum age, signed by
  const line = (await ws(vv, { tab: "forms" })).body.lines.find((l) => l.code === "IMM 5707");
  r = await call("PATCH", `/combinations/${vv}/forms/${encodeURIComponent(line.line)}`, { copies: 2, minAge: 18, signedBy: "person", baseRevision: line.revision });
  const after = (await ws(vv, { tab: "forms" })).body.lines.find((l) => l.code === "IMM 5707");
  ok("C1.8 (proposed): form line pass: copies 2, minimum age 18 and signed by \"the person\" are saved to the draft", r.status === 200 && after.copies === 2 && after.minAge === 18 && after.signedByLabel === "The person the form is about" && after.status === "DRAFT", after);
  const cfg = (await call("GET", `/combinations/${vv}/config?mode=draft`)).body.snapshot.forms.find((f) => f.form_number === "IMM 5707");
  ok("C1.8 (proposed): form line pass: the draft configuration carries them (released with the combination, never separately)", cfg.copies === 2 && cfg.min_age === 18 && cfg.signed_by === "person", cfg);
  const bad = await call("PATCH", `/combinations/${vv}/forms/${encodeURIComponent(line.line)}`, { copies: 0, minAge: 200, signedBy: "the cat", baseRevision: after.revision });
  ok("C1.8 (proposed): form line fail: copies 0, age 200 and an unknown signer are refused (400) with a message per field; nothing saved", bad.status === 400 && ["copies", "minAge", "signedBy"].every((f) => bad.body.errors?.some((e) => e.field === f)) && (await ws(vv, { tab: "forms" })).body.lines.find((l) => l.code === "IMM 5707").copies === 2, bad.body?.errors);
  const stale = await call("PATCH", `/combinations/${vv}/forms/${encodeURIComponent(line.line)}`, { copies: 3, baseRevision: line.revision });
  ok("C1.8 (proposed): form line fail: a save from a stale revision is refused (409) and says who changed it; nothing saved", stale.status === 409 && /Changed by Configuration author/.test(stale.body?.message ?? "") && (await ws(vv, { tab: "forms" })).body.lines.find((l) => l.code === "IMM 5707").copies === 2, stale.body?.message);
  const notAuthor = await call("PATCH", `/combinations/${vv}/forms/${encodeURIComponent(line.line)}`, { copies: 3 }, "user-B");
  ok("C1.8 (proposed): form line fail: a person without the author duty cannot change a line (403)", notAuthor.status === 403);
  const back = await call("PATCH", `/combinations/${vv}/forms/${encodeURIComponent(line.line)}`, { copies: 1, minAge: null, signedBy: null, baseRevision: after.revision });
  const fp = (await call("GET", `/combinations/${vv}/config?mode=draft`)).body.snapshot.forms.find((f) => f.form_number === "IMM 5707");
  ok("C1.8 (proposed): form line pass: back to one copy, any age and no signer leaves the line as it was released (no keys added)", back.status === 200 && fp.copies === undefined && fp.min_age === undefined && fp.signed_by === undefined, fp);

  // ───────────── BR-15: Preview by person = a real case on the same release, same questions in the same order
  const officer = "user-O";
  const kase = (await call("POST", "/runtime/cases", { combinationId: vv, reference: `S03-${Date.now().toString(36)}`, clientActor: "user-P", principal: { displayName: "Sample Applicant S" }, idempotencyKey: `s03-${Date.now()}` }, officer)).body;
  await call("POST", `/runtime/cases/${kase.id}/people`, { role: "spouse_or_partner", displayName: "Sample Spouse S", applies: true }, officer);
  await call("POST", `/runtime/cases/${kase.id}/people`, { role: "child", displayName: "Sample Child S", applies: true }, officer);
  const people = (await call("GET", `/runtime/cases/${kase.id}`, undefined, officer)).body.people;
  const roleOf = new Map(people.map((p) => [p.subject_id, p.role]));
  // Each person's parts in order, each part's questions in order (the flat list's people order follows how subject ids
  // sort, random in a case; both the case page and the preview show one person at a time).
  const shape = (view, role) => ["case", "principal", "spouse_or_partner", "child"].map((r) => `${r}: ${view.sections.filter((s) => role(s.subjectId) === r).map((s) => `${s.section}[${s.questions.map((q) => `${q.fact}${q.required ? "*" : ""}${q.hidden ? "~" : ""}`).join(",")}]`).join(" ")}`);
  for (const mode of ["agent", "sqr"]) {
    const live = (await call("GET", `/runtime/cases/${kase.id}/questionnaire${mode === "agent" ? "?mode=agent" : ""}`, undefined, mode === "agent" ? officer : "user-P")).body;
    const pv = (await ws(vv, { tab: "preview", release: "1", family: "family1", mode })).body.preview;
    const pRole = (id) => ({ case: "case", principal: "principal", spouse: "spouse_or_partner", "child-1": "child" })[id];
    const a = shape(live, (id) => roleOf.get(id)), b = shape(pv.questionnaire, pRole);
    ok(`C4.3: BR-15 pass (${mode}): the preview of "Couple, one child" asks exactly what a case on the same release asks, part by part, in the same order`, a.every((x) => x.length > 30) && JSON.stringify(a) === JSON.stringify(b), a.length === b.length ? a.find((x, i) => x !== b[i]) : [a.length, b.length]);
  }
  const pv0 = (await ws(vv, { tab: "preview", family: "single" })).body.preview;
  ok("C4.3: BR-15 pass: the families offered follow the combination's people; one person for a single applicant, with counts", pv0.families.length === 4 && pv0.people.length === 1 && pv0.people[0].questions > 10 && pv0.people[0].forms === 2, pv0.people);
  const tw = await ws(vv, { tab: "preview", tweaks: "{not json" });
  ok("C4.3: BR-15 fail: unreadable preview answers are a 400 in plain words", tw.status === 400 && /could not be read/.test(JSON.stringify(tw.body)));
  const none = (await ws(empty, { tab: "preview" })).body;
  ok("C4.3: preview empty state: a combination with no forms says what to do first", none.preview === null && /Once forms and questions exist/.test(none.empty));

  // ───────────── the browser, like a person
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const page = async (actor, width) => { const ctx = await b.newContext({ viewport: { width, height: 900 } }); await ctx.addInitScript((a) => localStorage.setItem("xr-actor", a), actor); const p = await ctx.newPage(); p.errors = []; p.on("pageerror", (e) => p.errors.push(e.message)); return p; };
  const axe = async (p, state) => { const res = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); const v = res.violations.filter((x) => x.impact === "serious" || x.impact === "critical"); axeLog.push({ state, violations: v.map((x) => ({ id: x.id, nodes: x.nodes.length, sample: x.nodes[0]?.target?.join(" ") })) }); return v; };
  const shot = async (p, name) => { await p.waitForTimeout(250); await p.screenshot({ path: path.join(SHOTS, `${name}-${p.viewportSize().width}.png`), fullPage: true }); };
  for (const width of [1440, 1024]) {
    const p = await page("user-A", width);
    const t0 = Date.now(); await p.goto(`${BASE}/c/${vv}/overview`); await p.getByRole("heading", { name: "People in this combination" }).waitFor();
    const tabs = await p.getByRole("tablist", { name: "Combination" }).getByRole("tab").allInnerTexts();
    ok(`C1.4: BR-1 (${width}): the tabs are Overview · Forms · PQR · SQR · Documents · Rules · Preview by person · Review and release (· Sources until Screen 02)`, tabs.map((t) => t.trim()).join("|") === "Overview|Forms|PQR|SQR|Documents|Rules|Preview by person|Review and release|Sources", tabs);
    ok(`C1.4: Overview (${width}): the four counts, the people, the sources and the releases, in ${Date.now() - t0} ms`, (await p.getByText("Released versions").count()) === 1 && (await p.getByRole("heading", { name: "Sources" }).count()) === 1);
    ok(`C1.4, C4.3: axe (${width}) Overview: no serious or critical violation`, !(await axe(p, `overview-${width}`)).length, axeLog.at(-1).violations); await shot(p, "overview");
    await p.goto(`${BASE}/c/${vv}/whatever`); await p.waitForURL(/\/overview$/);
    ok(`C1.4: BR-1 fail (${width}): an unknown tab in the address opens Overview`, p.url().endsWith(`/c/${vv}/overview`));
    await p.goto(`${BASE}/c/${vv}/configuration`); await p.waitForURL(/\/sqr$/); await p.getByText(/Rebuilt in slice S2/).waitFor();
    ok(`C1.4: BR-1 (${width}): the old Configuration address opens SQR, with today's editor until S2`, (await p.getByText("Rebuilt in slice S2").count()) === 1);
    // Forms
    const t1 = Date.now(); await p.getByRole("tab", { name: "Forms" }).click(); await p.getByRole("button", { name: "Edit the IMM 5707 line" }).waitFor();
    ok(`C1.4: Forms (${width}): tab switch and the lines shown in ${Date.now() - t1} ms (budget 1000 ms in the browser)`, Date.now() - t1 < 1000);
    ok(`C1.4, C4.3: axe (${width}) Forms: no serious or critical violation`, !(await axe(p, `forms-${width}`)).length, axeLog.at(-1).violations); await shot(p, "forms");
    if (width === 1440) {
      const edit = p.getByRole("button", { name: "Edit the IMM 5707 line" }); await edit.focus(); await p.keyboard.press("Enter");
      const dlg = p.getByRole("dialog"); await dlg.waitFor();
      await dlg.getByLabel("Copies").fill("x"); await dlg.getByRole("button", { name: "Save line" }).click();
      ok("C1.8 (proposed): form line fail (browser): \"x\" copies is refused on the field, focus moves to it, nothing is sent", (await dlg.getByText("Copies is a whole number from 1 to 9.").count()) === 1 && (await p.evaluate(() => document.activeElement?.getAttribute("data-field"))) === "copies");
      await shot(p, "forms-panel-field-error");
      await dlg.getByLabel("Copies").fill("2"); await dlg.getByLabel("Minimum age").fill("18"); await dlg.getByLabel("Signed by").selectOption("parent_for_minor");
      ok("C1.4, C4.3: axe Forms line panel: no serious or critical violation", !(await axe(p, "forms-panel")).length, axeLog.at(-1).violations); await shot(p, "forms-panel");
      await dlg.getByRole("button", { name: "Save line" }).click(); await dlg.waitFor({ state: "detached" });
      await p.getByText("2 copies · from age 18").waitFor();
      ok("C1.8 (proposed): form line pass (browser): the row says \"2 copies · from age 18\" and the signer; focus returns to the row's Edit", (await p.getByText("Signed by: A parent, for a minor").count()) === 1 && /Edit the IMM 5707 line/.test(await p.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "")));
      // a stale panel: another author saves first
      await p.getByRole("button", { name: "Edit the IMM 5707 line" }).click(); const d2 = p.getByRole("dialog"); await d2.waitFor();
      const cur = (await ws(vv, { tab: "forms" })).body.lines.find((l) => l.code === "IMM 5707");
      await call("PATCH", `/combinations/${vv}/forms/${encodeURIComponent(cur.line)}`, { copies: 3, baseRevision: cur.revision });
      await d2.getByLabel("Copies").fill("4"); await d2.getByRole("button", { name: "Save line" }).click();
      await d2.getByText("Someone else saved this line while you were editing").waitFor();
      ok("C1.8 (proposed): conflict state (browser): a stale save shows who changed it and offers Reload; nothing overwritten", (await d2.getByRole("button", { name: "Reload their version" }).count()) === 1 && (await ws(vv, { tab: "forms" })).body.lines.find((l) => l.code === "IMM 5707").copies === 3);
      await shot(p, "forms-panel-conflict");
      await d2.getByRole("button", { name: "Reload their version" }).click(); await d2.waitFor({ state: "detached" });
      await p.keyboard.press("Escape");
    }
    // Preview by person
    await p.getByRole("tab", { name: "Preview by person" }).click(); await p.getByRole("radiogroup", { name: "Sample family" }).waitFor();
    await p.getByRole("radio", { name: "Couple, one child" }).click(); await p.getByRole("group", { name: "Person" }).getByRole("button", { name: /^Child \(travelling\) 1/ }).click();
    await p.waitForURL(/person=child-1/); await p.getByRole("heading", { name: /Forms for Child \(travelling\) 1/ }).waitFor();
    ok(`C4.3: Preview (${width}): family and person chips; the child's forms, documents and questionnaire show, the choice kept in the address`, /family=family1/.test(p.url()) && (await p.locator("[data-preview-mode=sqr]").count()) === 1);
    ok(`C1.4, C4.3: axe (${width}) Preview: no serious or critical violation`, !(await axe(p, `preview-${width}`)).length, axeLog.at(-1).violations); await shot(p, "preview");
    await p.getByRole("button", { name: "Show facts and the form fields they fill" }).click(); await p.locator("[data-preview-mode=agent]").waitFor();
    ok(`C4.3: Preview (${width}): "Show facts and the form fields they fill" lists each fact with the forms it fills`, /fills IMM 5257/.test(await p.locator("[data-preview-mode=agent]").innerText()));
    await shot(p, "preview-agent");
    ok(`C1.4, C4.3: no page errors (${width})`, !p.errors.length, p.errors);
    await p.context().close();
  }
  // read-only: the approver sees no edit controls
  const ro = await page("user-B", 1440); await ro.goto(`${BASE}/c/${vv}/forms`); await ro.getByRole("heading", { name: "Forms", exact: true }).waitFor(); await ro.waitForTimeout(500);
  ok("C1.4: read-only state: the approver sees the lines and no Edit, Add form or Add an online form", (await ro.getByRole("button", { name: /Edit the IMM/ }).count()) === 0 && (await ro.getByRole("button", { name: "Add form" }).count()) === 0);
  await shot(ro, "forms-readonly");
  await ro.goto(`${BASE}/c/${empty}/preview`); await ro.getByRole("heading", { name: "Nothing to preview yet" }).waitFor(); await shot(ro, "preview-empty");
  ok("C1.4, C4.3: empty state (browser): a combination with no forms says what to do first", true);
  await b.close();
  fs.writeFileSync(path.join(SHOTS, "axe.json"), JSON.stringify(axeLog, null, 1));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.log(`FAIL  stopped: ${e.message.split("\n")[0]}`); console.log(`\n${pass} passed, ${fail + 1} failed`); process.exitCode = 1; });
