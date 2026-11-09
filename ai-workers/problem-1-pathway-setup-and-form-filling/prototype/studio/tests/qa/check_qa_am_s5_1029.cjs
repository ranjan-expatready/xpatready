// /qa after-merge on PR #71 (S5 Combination workspace, main e2cb27a4), independent of the runtime lane's own suites.
// Part 1 (API): QA-53 on the new workspace routes (nobody, unknown name, case people, studio people); the Forms tab's
// minimum age and signer with their field errors and Undo; Filed as limited to what the edition accepts; Remove, the
// "Removed in this draft" list, Add back, Undo and two removes at once; "Who can be in this application": typed label
// kept, stale version, bad counts, Undo, and Undo refused after a release. Part 2 (browser, 1440 px): the Forms tab's
// finder strip, row menu, Remove asked first, one Undo bar, Add back; Filed as options greyed; the people section's
// Rules / Saved / live (greyed) choices. No model call (US$0). Screenshots: product/qa/reports/2026-10-29-after-merge-s5/.
//   zsh studio/tools/isolated.sh qa_s5c 4474 start && node studio/tests/qa/check_qa_am_s5_1029.cjs 4474 xr_studio_qa_s5c
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const [PORT, DB] = [process.argv[2] ?? "4474", process.argv[3] ?? "xr_studio_qa_s5c"];
const BASE = `http://localhost:${PORT}`;
const SHOTS = path.resolve(__dirname, "..", "..", "..", "..", "product", "qa", "reports", "2026-10-29-after-merge-s5"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, fail = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}`.slice(0, 320) : ""}`); };
const call = async (method, p, body, actor = "user-A") => {
  const h = { "content-type": "application/json" }; if (actor) h["x-actor"] = actor;
  const r = await fetch(`${BASE}/api${p}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const words = (r) => r.body?.detail ?? r.body?.message ?? "";
const enc = encodeURIComponent;

(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const ld = await call("POST", "/demo/load", {});
  if (ld.status >= 300) { console.error("STOP  the sample did not load", ld.status, words(ld)); process.exit(2); }
  const served = (await call("GET", "/session")).body?.workspace?.id;
  if (!served || sql(`select count(*) from workspace where id='${served}'`) !== "1") { console.error(`STOP  ${DB} is not the database of :${PORT}`); process.exit(2); }
  const wp = sql("select id from combination where combination_key='wp.family'"), sv = sql("select id from combination where combination_key='sv.super_visa'");
  const forms = async (c) => (await call("GET", `/combinations/${c}/workspace?tab=forms`)).body;
  const lineOf = async (c, code) => (await forms(c)).lines.find((x) => x.code === code);
  const people = async (c) => (await call("GET", `/combinations/${c}/workspace?tab=questionnaires`)).body.people;
  const rowOf = (c, code) => sql(`select coalesce(min_age::text,'-') || '|' || coalesce(signed_by,'-') || '|' || status from combination_form where combination_id='${c}' and lineage_key='${code}' order by version desc limit 1`);

  // ------------------------------------------------------------ QA-53 on the new routes
  const reads = [["GET", `/combinations/${wp}/workspace?tab=forms`], ["GET", `/combinations/${wp}/workspace?tab=questionnaires`], ["GET", `/combinations/${wp}/workspace?tab=preview`], ["GET", "/library/roles"], ["POST", `/combinations/${sv}/people/propose/plan`, { mode: "rules" }]];
  for (const [m, u, b] of reads) {
    const got = {}; for (const a of [null, "user-Z", "user-O", "user-P", "user-A", "user-B", "user-C"]) got[a ?? "nobody"] = (await call(m, u, b, a)).status;
    step(`C11.10 QA-53: ${m} ${u.replace(/[0-9a-f-]{36}/, ":id")} refuses nobody and unknown (401), case people (403), answers studio people`, got.nobody === 401 && got["user-Z"] === 401 && got["user-O"] === 403 && got["user-P"] === 403 && got["user-A"] < 300 && got["user-B"] < 300 && got["user-C"] < 300, got);
  }
  const L0 = await lineOf(wp, "IMM 1295"), P0 = await people(wp);
  const writes = [["PATCH", `/combinations/${wp}/people`, { participants: P0.lines.map(({ role, min, max, applies }) => ({ role, min, max, applies })), version: P0.version }], ["POST", `/combinations/${wp}/people/undo`, { version: P0.version }], ["POST", `/combinations/${wp}/forms/undo`, {}], ["PATCH", `/combinations/${wp}/forms/${enc("IMM 1295")}`, { minAge: 18, baseRevision: L0.revision }], ["DELETE", `/combinations/${wp}/forms/${enc("IMM 5475")}`, { version: (await lineOf(wp, "IMM 5475"))?.version }], ["POST", `/combinations/${sv}/people/propose`, { mode: "rules", planSha256: "0".repeat(64) }]];
  for (const [m, u, b] of writes) {
    const got = {}; for (const a of [null, "user-Z", "user-O", "user-P", "user-B"]) got[a ?? "nobody"] = (await call(m, u, b, a)).status;
    step(`C11.10 QA-53: ${m} ${u.replace(/[0-9a-f-]{36}/, ":id")} refuses nobody/unknown (401) and every non-author (403)`, got.nobody === 401 && got["user-Z"] === 401 && ["user-O", "user-P", "user-B"].every((a) => got[a] === 403), got);
  }
  step("C11.10 QA-53: no refused write changed IMM 1295 or IMM 5475", rowOf(wp, "IMM 1295") === "-|-|" + rowOf(wp, "IMM 1295").split("|")[2] && !!(await lineOf(wp, "IMM 5475")), rowOf(wp, "IMM 1295"));

  // ------------------------------------------------------------ Forms: minimum age and signer, Undo
  const F = "IMM 1295", before = rowOf(wp, F);
  for (const [v, why] of [[0, "0"], [100, "100"], [17.5, "17.5"], ["18", "text '18'"], [-3, "-3"]]) {
    const r = await call("PATCH", `/combinations/${wp}/forms/${enc(F)}`, { minAge: v, baseRevision: (await lineOf(wp, F)).revision });
    step(`C11.6: minimum age ${why} is refused 400 in words on the field`, r.status === 400 && /Minimum age/.test(JSON.stringify(r.body)) && rowOf(wp, F) === before, `${r.status} ${words(r)}`);
  }
  let r = await call("PATCH", `/combinations/${wp}/forms/${enc(F)}`, { signedBy: "the_boss", baseRevision: (await lineOf(wp, F)).revision });
  step("C11.6: a signer not in the list is refused 400 'Choose who signs it from the list'", r.status === 400 && /Choose who signs/.test(JSON.stringify(r.body)), `${r.status} ${words(r)}`);
  r = await call("PATCH", `/combinations/${wp}/forms/${enc(F)}`, { minAge: 18, signedBy: "person", baseRevision: (await lineOf(wp, F)).revision });
  let L = await lineOf(wp, F);
  step("C11.6: minimum age 18 and signer saved, shown on the line", r.status === 200 && L.minAge === 18 && L.signedBy === "person" && L.signedByLabel !== "Not set", { status: r.status, minAge: L.minAge, signed: L.signedByLabel });
  const lc = (await forms(wp)).lastChange;
  step("C11.6: the Forms tab offers one Undo naming the change", !!lc && lc.action === "edit" && lc.codes.includes(F), lc);
  r = await call("PATCH", `/combinations/${wp}/forms/${enc(F)}`, { minAge: 21, baseRevision: L.revision.replace(/.$/, (x) => (x === "0" ? "1" : "0")) });
  step("C11.6: a save on a stale revision is refused 409, nothing changes", r.status === 409 && /^18\|person/.test(rowOf(wp, F)), `${r.status} ${words(r)} · ${rowOf(wp, F)}`);
  r = await call("POST", `/combinations/${wp}/forms/undo`, {});
  step("C11.6: Undo restores no minimum age and no signer", r.status === 201 && rowOf(wp, F).startsWith("-|-|"), `${r.status} ${rowOf(wp, F)}`);

  // ------------------------------------------------------------ Filed as: only what the edition accepts
  L = await lineOf(wp, F);
  // P-143 (drift fixed 1 Nov): four ways, Online · PDF upload · Paper · Not needed; SIGNED_PDF_UPLOAD is now PDF upload plus a signature.
  const notOk = ["ONLINE", "PDF_UPLOAD", "PAPER", "NOT_NEEDED"].find((c) => !L.accepted.includes(c)), ok = L.accepted.find((c) => c !== L.channel) ?? L.accepted[0];
  step("C1.6: the line says which ways IRCC accepts and why", L.accepted.length > 0 && !!L.acceptedBasis, { accepted: L.accepted, basis: L.acceptedBasis });
  if (notOk) {
    r = await call("PATCH", `/combinations/${wp}/forms/${enc(F)}/channel`, { channel: notOk });
    step(`C1.6 L4: Filed as ${notOk} (not accepted for this edition) is refused in words`, r.status >= 400 && r.status < 500 && /accept/i.test(words(r)), `${r.status} ${words(r)}`);
  }
  r = await call("PATCH", `/combinations/${wp}/forms/${enc(F)}/channel`, { channel: ok });
  step(`C1.6: Filed as ${ok} (accepted) saves`, r.status < 300, `${r.status} ${words(r)}`);

  // ------------------------------------------------------------ Remove, Removed in this draft, Add back, Undo
  const G = "IMM 5475";
  let g = await lineOf(wp, G);
  const two = await Promise.all([call("DELETE", `/combinations/${wp}/forms/${enc(G)}`, { version: g.version }), call("DELETE", `/combinations/${wp}/forms/${enc(G)}`, { version: g.version })]);
  const st = two.map((x) => x.status).sort();
  step("C11.6: two removes at once: one goes through, the other is refused (409/404), never 5xx", st[0] < 300 && st[1] >= 400 && st[1] < 500, st);
  let fv = await forms(wp);
  step("C11.6: the removed form leaves the list and shows under 'Removed in this draft'", !fv.lines.some((x) => x.code === G) && fv.removed?.some((x) => x.code === G), fv.removed);
  r = await call("POST", `/combinations/${wp}/forms/undo`, {});
  fv = await forms(wp);
  step("C11.6: Undo puts the removed form back and empties the removed list", r.status === 201 && fv.lines.some((x) => x.code === G) && !fv.removed?.some((x) => x.code === G), `${r.status} ${fv.removed?.length}`);
  await call("DELETE", `/combinations/${wp}/forms/${enc(G)}`, { version: (await lineOf(wp, G)).version });
  r = await call("POST", `/combinations/${wp}/forms`, { formKey: G });
  fv = await forms(wp);
  step("C11.6: Add back puts the same line back", r.status < 300 && fv.lines.some((x) => x.code === G) && !fv.removed?.some((x) => x.code === G), `${r.status} ${words(r)}`);

  // ------------------------------------------------------------ Who can be in this application
  let pe = await people(wp);
  const base = pe.lines.map(({ role, label, min, max, applies }) => ({ role, label, min, max, applies }));
  const sp = base.find((p) => p.role === "spouse_or_partner");
  r = await call("PATCH", `/combinations/${wp}/people`, { participants: base.map((p) => (p === sp ? { ...p, label: "Common-law partner" } : p)), version: pe.version });
  pe = await people(wp);
  step("C11.12: a typed label is kept ('Common-law partner')", r.status === 200 && pe.lines.find((p) => p.role === "spouse_or_partner")?.label === "Common-law partner" && pe.canUndo, pe.lines.map((p) => p.label));
  r = await call("PATCH", `/combinations/${wp}/people`, { participants: base, version: pe.version - 1 });
  step("C11.12: a save on an old version is refused 409 naming who saved and when", r.status === 409 && /changed who can be in this application/.test(words(r)), `${r.status} ${words(r)}`);
  r = await call("PATCH", `/combinations/${wp}/people`, { participants: base.map((p) => (p === sp ? { ...p, min: 2, max: 1 } : p)), version: pe.version });
  step("C11.12: fewest more than most is refused 400 in words", r.status === 400 && !!words(r), `${r.status} ${words(r)}`);
  r = await call("PATCH", `/combinations/${wp}/people`, { participants: base.filter((p) => p.role !== "principal"), version: pe.version });
  step("C11.12: a list without the principal applicant is refused 400", r.status === 400, `${r.status} ${words(r)}`);
  r = await call("POST", `/combinations/${wp}/people/undo`, { version: pe.version });
  pe = await people(wp);
  step("C11.12: Undo restores the label before the save", r.status < 300 && pe.lines.find((p) => p.role === "spouse_or_partner")?.label === sp.label, `${r.status} ${pe.lines.map((p) => p.label)}`);
  r = await call("PATCH", `/combinations/${wp}/people`, { participants: base.map((p) => (p === sp ? { ...p, label: "Partner (qa)" } : p)), version: pe.version });
  pe = await people(wp);
  r = await call("POST", `/combinations/${wp}/submit`, { note: "qa s5" });
  const sub = (await call("GET", `/combinations/${wp}/review`, undefined, "user-C")).body?.submission;
  const sme = (sub?.changeSummary ?? []).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  if (sme.length) await call("POST", `/combinations/${wp}/signoff`, { items: sme, action: "signed" }, "user-C");
  const ap = await call("POST", `/combinations/${wp}/approve`, {}, "user-B");
  step("setup: the label change is released by a second person", ap.status === 201, `${ap.status} ${words(ap)}`);
  pe = await people(wp);
  r = await call("POST", `/combinations/${wp}/people/undo`, { version: pe.version });
  step("C11.12: after a release Undo is not offered and is refused 409 'Released since'", pe.canUndo === false && r.status === 409 && /Released since/.test(words(r)), `${pe.canUndo} ${r.status} ${words(r)}`);
  step("C11.12: the released label is kept in the release", /Partner \(qa\)/.test(sql(`select snapshot::text from config_release where combination_id='${wp}' order by version desc limit 1`)));

  // ------------------------------------------------------------ QA-40 (case side): a release filing IMM 5707 Online
  const release = async (c, note) => {
    const s = await call("POST", `/combinations/${c}/submit`, { note });
    const su = (await call("GET", `/combinations/${c}/review`, undefined, "user-C")).body?.submission;
    const it = (su?.changeSummary ?? []).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
    if (it.length) await call("POST", `/combinations/${c}/signoff`, { items: it, action: "signed" }, "user-C");
    const a = await call("POST", `/combinations/${c}/approve`, {}, "user-B");
    return `${s.status}/${a.status} ${words(s) || words(a)}`;
  };
  const ch = await call("PATCH", `/combinations/${wp}/forms/${enc("IMM 5707")}/channel`, { channel: "ONLINE" });
  const rel = await release(wp, "qa: IMM 5707 filed Online");
  const newest = Number(sql(`select max(version) from config_release where combination_id='${wp}'`));
  step("setup: IMM 5707 filed Online is released (release 3 or later)", ch.status < 300 && newest >= 3, `${ch.status} ${words(ch)} · ${rel} · newest ${newest}`);
  // QA-69 retest (29 Oct, 52117004): after the release the Forms tab offers no Undo and the API refuses it as released.
  const lc69 = (await forms(wp))?.lastChange ?? null;
  const uf = await call("POST", `/combinations/${wp}/forms/undo`, {});
  step("QA-69: after a release the Forms tab offers no Undo and Undo is 409 'Released since'", lc69 === null && uf.status === 409 && /Released since|released meanwhile/.test(`${uf.body?.title} ${words(uf)}`), `${JSON.stringify(lc69)} ${uf.status} ${uf.body?.title} ${words(uf)}`);
  const oc = await call("POST", "/runtime/cases", { combinationId: wp, reference: `QA-S5-${Date.now().toString(36).slice(-4)}`, clientActor: "user-P", principal: { displayName: "Sample Applicant S" }, idempotencyKey: crypto.randomUUID() }, "user-O");
  const cf = oc.body?.id ? await call("GET", `/runtime/cases/${oc.body.id}/forms`, undefined, "user-O") : { status: 0, body: null };
  const cfText = JSON.stringify(cf.body ?? "");
  step("QA-38 C6.1: the case opens on the newest release", oc.status === 201 && Number(sql(`select r.version from pack_work_pin k join config_release r on r.id=k.config_release_id where k.case_id='${oc.body?.id}' order by k.revision desc limit 1`).split("\n")[0] || 0) === newest, `${oc.status} ${words(oc)}`);
  step("QA-40 C7.6: the case's forms still name IMM 5707 and say it is filed Online (later wave)", (cf.body?.online ?? []).some((x) => x.form === "IMM 5707"), cfText.match(/.{0,80}IMM 5707.{0,160}/)?.[0] ?? `IMM 5707 not listed (${cf.status})`);

  // ------------------------------------------------------------ Browser
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* */ } });
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(400); };
  await p.goto(`${BASE}/c/${wp}/forms`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await settle();
  const tp = p.getByRole("tabpanel");
  step("C11.6 browser: Forms tab shows the finder strip and the form table", /form find|Find the forms|finder|AI find/i.test(await tp.innerText()) && await p.locator("table").count() > 0, (await tp.innerText()).slice(0, 120));
  await p.getByRole("button", { name: "Actions for IMM 5475" }).click();
  const items = await p.getByRole("menuitem").allInnerTexts();
  step("C11.6 browser: the row menu offers Redo with AI, Replace edition, Remove", items.length === 3 && /Redo with AI/.test(items[0]) && /Replace edition/.test(items[1]) && /Remove/.test(items[2]), items);
  await p.getByRole("menuitem", { name: /Remove from this combination/ }).click();
  const dlg = p.getByRole("dialog").or(p.getByRole("alertdialog")).first();
  await dlg.waitFor({ timeout: 5000 }).catch(() => {});
  step("C11.6 browser: Remove asks first, naming the form (P-116)", /IMM 5475/.test(await dlg.innerText().catch(() => "")), await dlg.innerText().catch(() => "no dialog"));
  await dlg.getByRole("button", { name: /^Remove/ }).click(); await settle(); await p.getByRole("button", { name: "Add back IMM 5475" }).waitFor({ timeout: 15000 }).catch(() => {});
  await p.screenshot({ path: path.join(SHOTS, "01-removed-and-undo.png") });
  const undoBars = await p.locator("[data-undo-bar]").count();
  step("C11.6 browser: one Undo bar names the removal; the removed list offers Add back", undoBars === 1 && /Removed/.test(await p.locator("[data-undo-bar]").innerText()) && await p.getByRole("button", { name: "Add back IMM 5475" }).count() === 1, { undoBars });
  await p.getByRole("button", { name: "Add back IMM 5475" }).click(); await settle(); await p.getByRole("button", { name: "Actions for IMM 5475" }).waitFor({ timeout: 15000 }).catch(() => {});
  step("C11.6 browser: Add back returns the row and clears the removed list", await p.getByRole("button", { name: "Actions for IMM 5475" }).count() === 1 && await p.getByRole("button", { name: "Add back IMM 5475" }).count() === 0);
  // Filed as greyed options in the row editor.
  await p.locator('[data-line="IMM 1295"]').getByRole("button", { name: /Change/ }).first().click();
  const panel = p.locator("aside, [role=dialog]").filter({ hasText: "Filed as by default" }).first();
  await panel.waitFor({ timeout: 5000 }).catch(() => {});
  const opts = await panel.getByLabel("Filed as by default").locator("option").evaluateAll((o) => o.map((x) => `${x.textContent}|${x.disabled}`)).catch(() => []);
  step("C1.6 browser: Filed as lists the four ways (P-143); any it greys says IRCC does not accept it", opts.length === 4 && opts.filter((o) => o.endsWith("|true")).every((o) => /does not accept/.test(o)), opts);
  const age = panel.getByLabel(/From age/);
  await age.fill("0"); await panel.getByRole("button", { name: "Save to draft" }).click(); await settle();
  step("C11.6 browser: age 0 shows its message on the field, not only a toast", /Minimum age/.test(await panel.innerText().catch(() => "")), (await panel.innerText().catch(() => "")).match(/.{0,40}Minimum age.{0,60}/)?.[0]);
  await p.screenshot({ path: path.join(SHOTS, "02-age-error.png") });
  await p.keyboard.press("Escape");
  // People: Rules / Saved / live greyed.
  // Drift fixed 1 Nov: Who can be in this application moved to Before forms on the Forms tab (P-161 (2), slice C1).
  await p.goto(`${BASE}/c/${sv}/forms`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await settle();
  // 29 Oct (W1-15 slice 2): Who can be is folded to one line; its table opens with "Show and edit".
  const showEdit = p.getByRole("button", { name: /^Show and edit/ });
  if (await showEdit.count()) { await showEdit.first().click(); await settle(); }
  const fill = p.getByRole("button", { name: /Fill from the guide/ });
  step("C11.12 browser: the people section offers Fill from the guide", await fill.count() === 1);
  await fill.click(); await settle();
  const modes = await p.getByRole("radio").evaluateAll((r) => r.map((x) => `${x.closest("label")?.textContent?.trim() ?? x.getAttribute("aria-label") ?? x.value}|${x.disabled}`)).catch(() => []);
  step("C11.12 browser: Rules only and saved AI answers are offered; AI now is greyed", modes.some((m) => /Rules only.*\|false/.test(m)) && modes.some((m) => /saved AI.*\|false/i.test(m)) && modes.some((m) => /AI now.*\|true/.test(m)), modes);
  await p.screenshot({ path: path.join(SHOTS, "03-people-fill.png") });
  // QA-38 in the officer's Open a case dialog: the list names the release the case will use.
  await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-O"); } catch { /* */ } });
  await p.goto(`${BASE}/cases`); await settle();
  await p.getByRole("button", { name: /Open a case/ }).first().click();
  const od = p.getByRole("dialog", { name: "Open a case" }); await od.waitFor({ timeout: 10000 }).catch(() => {});
  await od.locator("select option", { hasText: /release/ }).first().waitFor({ timeout: 15000 }).catch(() => {});
  const optsC = await od.locator("select option").allInnerTexts().catch(() => []);
  const lm = optsC.find((o) => o.startsWith(sql(`select label from combination where id='${wp}'`)));
  step("QA-38 C6.1 browser: Open a case names the newest release for the combination", !!lm && new RegExp(`release ${newest}\\b`).test(lm), { lm, newest });
  await p.screenshot({ path: path.join(SHOTS, "04-qa38-open-a-case.png") });
  step("no page error in the walk", errs.length === 0, errs[0]);
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("STOP ", e.message); console.log(`\n${pass} passed, ${fail} failed`); process.exit(2); });
