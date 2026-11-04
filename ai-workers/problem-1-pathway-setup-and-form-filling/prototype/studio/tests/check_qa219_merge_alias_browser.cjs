// QA-219 (C3.5; P-65 a reviewed merge, P-266 an alias is direct and logged): a field's page in Shared library › Fields
// offers "Add another name" and "Merge into…", walked in a real browser at 1440 px like a person, axe (WCAG 2.2 AA) and
// 1024 px without sideways scroll on each state. Reset to the six, then the saved field maps of IMM 5257 (Visitor visa)
// and IMM 1294 (Study permit) applied through their endpoints (US$0, as tests/check_c38_background_forms_api.ts): the two
// forms give a real duplicate, "Alt phone number" (IMM 1294) and "Alternate telephone number" (IMM 5257).
//   author: a name another field answers to is refused on the control; another name applies now and is logged; a merge
//   with a reason too short is refused on the control; the merge is sent and waits; the field is unchanged; the author
//   cannot approve it. Approver: approves on To review. Then the page shows the merge and the other name, and the field
//   that went away says where it went. Replays only, no model call (US$0). Screenshots: screens/QA-219/screenshots/.
//   zsh studio/tools/isolated.sh qa219 4445 start && node studio/tests/check_qa219_merge_alias_browser.cjs 4445 xr_studio_qa219
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4445), DB = process.argv[3] ?? "xr_studio_qa219";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "QA-219", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/lib/postgresql/18/bin/psql"].find((x) => fs.existsSync(x)) ?? "psql";
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, steps = 0;
const step = (name, ok, detail) => { steps++; if (!ok) fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).replace(/\s+/g, " ").slice(0, 400)}` : ""}`); };
const stop = (why, detail) => { console.error(`STOP  ${why}`, detail ?? ""); process.exit(2); };
const GOES = "person.alt_phone_number", STAYS = "person.alternate_telephone_number", OTHER = "person.phone_number";
const field = (k) => `/library/fields/${encodeURIComponent(k)}`;

(async () => {
  if (/xr_studio_demo/.test(DB)) stop("This check never runs on the demo database.");
  // The channel "chrome" as the suites use it (cloud-setup.sh links the image's Chromium there on Linux); else Chromium.
  const b = await chromium.launch(fs.existsSync("/opt/google/chrome/chrome") || process.platform === "darwin" ? { channel: "chrome", headless: true } : { headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: init.timeout ?? 300000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (who) => { await p.goto(`${BASE}/`); await p.evaluate((x) => { try { localStorage.setItem("xr-actor", x); } catch { /* ignore */ } }, who); };
  const open = async (pth, heading) => { await p.goto(`${BASE}${pth}`); await p.getByRole("heading", { level: 1, name: heading }).first().waitFor({ timeout: 60000 }); await p.waitForLoadState("networkidle").catch(() => {}); };
  const toast = (re) => p.getByText(re).first().waitFor({ timeout: 30000 }).then(() => true).catch(() => false);
  let n = 0;
  const state = async (name) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`), fullPage: true });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 });
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`), fullPage: true });
    step(`1024 px: ${name} has no sideways scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await p.setViewportSize({ width: 1440, height: 900 });
  };
  const aliasesOf = (k) => sql(`select array_to_string(aliases, '|') from canonical_field where canonical_field_key = '${k}' order by version desc limit 1`);

  // ── setup: the six, then two forms' saved field maps applied (stands in for the To review steps; US$0)
  await p.goto(BASE);
  if ((await api("/demo/reset-to-six", { method: "POST", data: { confirm: "RESET" } })).status >= 300) stop("Reset to the six did not load");
  for (const [combo, file] of [["vv.single", "imm5257e.pdf"], ["sp.outside", "imm1294e.pdf"]]) {
    const a = sql(`select a.id from source_attachment a join combination c on c.id = a.combination_id where c.combination_key = '${combo}' and a.file_name = '${file}'`);
    const job = a && sql(`select id from drafting_job where attachment_id = '${a}' and kind = 'field_map' order by started_at desc limit 1`);
    if (!job) stop(`no saved field-map answer for ${file} on ${combo}`);
    await api(`/jobs/${job}/recompare`, { method: "POST", data: {} });
    await api(`/jobs/${job}/accept-clean`, { method: "POST", data: {}, actor: "user-C" });
    for (const i of ((await api(`/jobs/${job}`)).body.items ?? []).filter((x) => x.decision === "PENDING"))
      await api(`/jobs/${job}/items/${i.id}`, { method: "POST", data: { decision: "ACCEPTED", note: "A different meaning from the candidates (QA-219 setup)" }, actor: "user-C" });
    // QA-210 (open): on a loaded machine the apply can pass its 5 s transaction limit and roll back (500); tried once more.
    let r = await api(`/jobs/${job}/apply`, { method: "POST", data: {} });
    if (r.status === 500) { console.log(`NOTE  ${file}: the apply rolled back (QA-210, a loaded machine); trying once more`); r = await api(`/jobs/${job}/apply`, { method: "POST", data: {} }); }
    if (r.status >= 300) stop(`${file}'s saved field map did not apply`, r.body);
  }
  const have = sql(`select count(distinct canonical_field_key) from canonical_field where canonical_field_key in ('${GOES}', '${STAYS}', '${OTHER}') and status <> 'RETIRED'`);
  if (have !== "3") stop("setup: the two forms did not give the duplicate pair and the phone number field", have);
  const merges0 = sql("select count(*) from field_merge");

  try {
    // ── author: Add another name on the field that stays
    await as("user-A");
    await open(field(STAYS), /Alternate telephone number/i);
    const section = p.locator("[data-other-names]");
    step("QA-219: the field's page has Other names and merges, with Add another name and Merge into…", await section.isVisible() && await section.getByLabel("Add another name").isVisible() && await section.getByRole("button", { name: /Merge into/ }).isVisible());
    step("QA-219: no other name yet, said in words", /None\./.test(await section.locator("[data-aliases]").innerText()));
    await state("field-page-before");

    // refusal: a name another field already answers to, on the control
    await section.getByLabel("Add another name").fill("Phone number");
    await section.getByRole("button", { name: "Add name" }).click();
    const refused = section.getByRole("alert").filter({ hasText: /already names the field/ });
    step("QA-219 refusal: a name another field answers to is refused on the control, in the field's name (no key)", await refused.waitFor({ timeout: 15000 }).then(() => true).catch(() => false) && !/person\./.test(await refused.innerText()), await section.innerText().catch(() => ""));
    step("QA-219 refusal: nothing was added", aliasesOf(STAYS) === "", aliasesOf(STAYS));
    await state("alias-refused");

    // pass: another name applies now and is logged (P-266)
    await section.getByLabel("Add another name").fill("Second phone number");
    step("QA-219: typing again clears the refusal", !(await refused.isVisible().catch(() => false)));
    await section.getByRole("button", { name: "Add name" }).click();
    const added = await toast(/"Second phone number" now finds/);
    const shownNow = await section.locator("[data-aliases]").getByText("Second phone number").waitFor({ timeout: 15000 }).then(() => true, () => false);
    step("QA-219: another name applies now (P-266: direct and logged) and shows on the page", added && shownNow && aliasesOf(STAYS) === "Second phone number", aliasesOf(STAYS));
    step("QA-219: the new name is in the activity, with who added it", sql(`select count(*) from audit_event where entity_key = '${STAYS}' and summary like '%"Second phone number"%'`) !== "0");

    // ── author: Merge into… on the duplicate
    await open(field(GOES), /Alt phone number/i);
    await p.locator("[data-other-names]").getByRole("button", { name: /Merge into/ }).click();
    const dlg = p.getByRole("dialog");
    await dlg.waitFor({ timeout: 15000 });
    const opts = await dlg.getByLabel("Field that stays").locator("option").evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
    step("QA-219: Merge into… offers only fields of the same kind of answer, never the field itself", opts.includes(STAYS) && !opts.includes(GOES) && !opts.includes("person.date_of_birth"), opts.length);
    await dlg.getByLabel("Field that stays").selectOption(STAYS);
    await dlg.getByLabel("Why the two mean the same").fill("Same");
    step("QA-219 refusal: a reason under 10 characters is refused on the control and Send stays off", await dlg.getByRole("alert").filter({ hasText: /At least 10 characters/ }).isVisible() && await dlg.getByRole("button", { name: "Send for approval" }).isDisabled());
    await dlg.getByLabel("Why the two mean the same").fill("IMM 1294 and IMM 5257 both ask for the applicant's second telephone number (Sample).");
    const canSend = await p.waitForFunction(() => { const d = document.querySelector("[role=dialog]"); const btn = d && [...d.querySelectorAll("button")].find((x) => x.textContent?.includes("Send for approval")); return btn && !btn.disabled; }, null, { timeout: 30000 }).then(() => true, () => false);
    step("QA-219: with a reason, the rules check passes, Send for approval is on, and the dialog shows what the merge touches (IMM 1294)", canSend && /IMM 1294/.test(await dlg.innerText()), (await dlg.innerText()).slice(0, 200));
    await state("merge-dialog");
    await dlg.getByRole("button", { name: "Send for approval" }).click();
    const sent = await toast(/stays as it is until a second person approves the merge/);
    const mid = sql(`select id from field_merge where merge_key = '${GOES}' and keep_key = '${STAYS}' and status = 'PROPOSED'`);
    step("QA-219: the merge is sent, waits for a second person, and changes nothing yet", sent && !!mid && sql(`select coalesce(merged_into_key, '') from canonical_field where canonical_field_key = '${GOES}' order by version desc limit 1`) === "" && sql(`select count(*) from change_set where field_merge_id = '${mid}' and status = 'waiting'`) === "1", mid);
    const wait = p.locator("[data-other-names]").getByText(/Waits for a second person/);
    step("QA-219: the page says the merge waits, links to To review, and offers no second merge", await wait.waitFor({ timeout: 15000 }).then(() => true).catch(() => false) && await p.locator("[data-other-names]").getByRole("link", { name: /Open it on To review/ }).isVisible() && !(await p.locator("[data-other-names]").getByRole("button", { name: /Merge into/ }).isVisible()));
    await state("merge-waiting");
    const self = await api(`/library/merges/${mid}/approve`, { method: "POST", data: {} });
    step("QA-219 refusal: the author who proposed it cannot approve it (403)", self.status === 403 && sql(`select status from field_merge where id = '${mid}'`) === "PROPOSED", self.status);

    // ── approver: To review › the merge › Approve
    await as("user-B");
    await p.goto(`${BASE}/review/merge/${mid}`);
    const panel = p.getByRole("dialog");
    await panel.getByText("Goes away").waitFor({ timeout: 60000 });
    const yes = panel.getByRole("button", { name: "Approve the merge" });
    step("QA-219: the approver's panel offers Approve the merge once its check has run", await p.waitForFunction(() => { const btn = [...document.querySelectorAll("[role=dialog] button")].find((x) => x.textContent?.includes("Approve the merge")); return btn && !btn.disabled; }, null, { timeout: 30000 }).then(() => true, () => false));
    await state("approver-panel");
    await yes.click();
    const confirmBtn = panel.getByRole("button", { name: /^(Confirm|Approve)$/ });
    if (await confirmBtn.isVisible().catch(() => false)) await confirmBtn.click();
    const merged = await toast(/Merged: the field that goes away now redirects/);
    step("QA-219: the approver (a second person) approves the merge on To review", merged && sql(`select status || '|' || decided_by from field_merge where id = '${mid}'`) === "APPLIED|user-B", sql(`select status || '|' || coalesce(decided_by, '') from field_merge where id = '${mid}'`));

    // ── after: the page shows the merge and the other name; the field that went away says where it went
    await as("user-A");
    await open(field(STAYS), /Alternate telephone number/i);
    const listed = await p.locator("[data-merged-in]").first().waitFor({ timeout: 30000 }).then(() => true, () => false);
    const after = await p.locator("[data-other-names]").innerText();
    step("QA-219: the field that stays lists the merge (its name, who approved) and its other name, with no raw key", listed && /Merged in: Alt phone number/i.test(after) && /approved by Approver/.test(after) && /Second phone number/.test(after) && !after.includes(GOES), after);
    step("QA-219: the merged field's key is kept as a name that redirects (P-65)", aliasesOf(STAYS).split("|").includes(GOES), aliasesOf(STAYS));
    await state("field-page-after");
    await open(field(GOES), /Alt phone number/i);
    const goneSaid = await p.locator("[data-other-names]").getByText(/was merged into/).waitFor({ timeout: 30000 }).then(() => true, () => false);
    const goneTxt = await p.locator("[data-other-names]").innerText();
    step("QA-219: the field that went away says it was merged, with a link to the field that stays, and offers no change", goneSaid && /merged into Alternate telephone number/i.test(goneTxt) && await p.locator("[data-other-names]").getByRole("link", { name: /Alternate telephone number/i }).isVisible() && !(await p.locator("[data-other-names]").getByLabel("Add another name").isVisible().catch(() => false)), goneTxt);
    await state("merged-away");
    step("QA-219: one merge was written in all", sql("select count(*) from field_merge") === String(Number(merges0) + 1));
    step("no page error", errs.length === 0, errs.join(" | "));
  } finally { await b.close(); }
  console.log(`\nC3.5 (QA-219): ${steps - fail}/${steps} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  QA-219 the check itself stopped:", e); process.exit(1); });
