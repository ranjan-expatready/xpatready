// qa lane, outside review DV-doc-1 on main db5e0208 (29 Oct): re-status from a run the capabilities that merged suites
// name but CAPABILITIES still said Not built. C2.3 (a held PDF: the uploader records the IRCC page, a different person
// approves or rejects it, its checksum joins the approved list), C5.3 (one To review list: Needs you · Waiting for others
// · Running · All, the maker never approves their own item) and C1.8 (minimum age and signer on a line; Preview by person
// applies the minimum age). Resets the copy and loads the sample itself. Every name and person is Sample. No model call
// (US$0); the held file is the official IMM 5562 with bytes appended, so it is not canada.ca's copy.
//   zsh studio/tools/isolated.sh qa_dv2 4476 start
//   node studio/tests/qa/check_qa_dv_1029.cjs 4476 xr_studio_qa_dv2        (QA_HEADED=1 shows the browser)
const fs = require("node:fs"); const path = require("node:path"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const [PORT, DB] = [process.argv[2] ?? "4476", process.argv[3] ?? "xr_studio_qa_dv2"];
const BASE = `http://localhost:${PORT}`;
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/local/bin/psql"].find((p) => fs.existsSync(p));
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const FORMS = path.join(__dirname, "..", "..", "..", "..", "official-sources", "ircc", "forms");
const SHOTS = path.join(__dirname, "..", "..", "..", "..", "product", "qa", "reports", "2026-10-29-dv-doc-1");
fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).replace(/\s+/g, " ").slice(0, 320)}` : ""}`); };
const info = (t) => console.log(`INFO  ${t}`);
const call = async (method, url, body, actor = "user-A") => { const h = { ...(body ? { "content-type": "application/json" } : {}) }; if (actor) h["x-actor"] = actor; const r = await fetch(`${BASE}/api${url}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
const words = (r) => `${r.status} ${r.body?.detail ?? r.body?.message ?? ""}`;
const enc = encodeURIComponent;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const load = await call("POST", "/demo/load");
  step("setup: Reset, then Load sample", load.status < 300, load.status);

  // ------------------------------------------------------------ C2.3 a held PDF and its second person
  const up = async (name, buf, actor = "user-A") => { const fd = new FormData(); fd.append("files", new Blob([buf], { type: "application/pdf" }), name); const r = await fetch(`${BASE}/api/library/forms/upload`, { method: "POST", headers: { "x-actor": actor }, body: fd }); return { status: r.status, body: await r.json().catch(() => null) }; };
  const odd = Buffer.concat([fs.readFileSync(path.join(FORMS, "imm5562e.pdf")), Buffer.from("\n% qa dv: changed copy\n")]);
  const u = await up("imm5562e-copy.pdf", odd);
  let held = null;
  for (let i = 0; i < 20 && !held; i++) { await wait(1000); held = sql("select id from intake_item where status='HELD' order by created_at desc limit 1") || null; }
  step("C2.3: an upload that is not canada.ca's file is held for a person", u.status < 300 && !!held, `${u.status} ${held}`);
  const usable = () => sql(`select count(*) from approved_source where intake_item_id='${held}'`);
  let r = await call("POST", `/intake/held/${held}/approve`, {}, "user-A");
  step("C2.3 P-80: the uploader cannot approve their own held file (403, in words)", r.status === 403 && /different person/.test(r.body?.detail ?? ""), words(r));
  r = await call("POST", `/intake/held/${held}/approve`, {}, "user-B");
  step("C2.3: the second person cannot approve before the uploader records the IRCC page (409, in words)", r.status === 409 && /IRCC page/.test(r.body?.detail ?? ""), words(r));
  r = await call("POST", `/intake/held/${held}/approve`, {}, "user-O");
  step("C2.3 QA-53: the officer cannot approve a held file", r.status === 403 || r.status === 401, words(r));
  r = await call("POST", `/intake/held/${held}/reject`, { note: "" }, "user-B");
  step("C2.3: a rejection without a reason is refused and says why", r.status === 400 && /why/.test(r.body?.detail ?? ""), words(r));
  const PAGE = "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm5562.html";
  r = await call("PATCH", `/intake/held/${held}`, { irccPage: PAGE }, "user-A");
  step("C2.3: the uploader records the IRCC page the file came from", r.status < 300, words(r));
  r = await call("POST", `/intake/held/${held}/approve`, { irccPage: PAGE.replace("imm5562", "imm5257") }, "user-B");
  step("C2.3: approving against an IRCC page that changed after it was opened is refused (409)", r.status === 409 && /changed/.test(r.body?.detail ?? ""), words(r));
  step("C2.3: until approved the file is not on the approved list", usable() === "0", usable());

  // ------------------------------------------------------------ C5.3 To review: one list, four filters, own item
  const q = async (actor, filter) => (await call("GET", `/review-queue?filter=${filter}`, undefined, actor));
  const findHeld = (b) => (b?.items ?? []).find((x) => x.kind === "held_file");
  const aNeeds = await q("user-A", "needs"), aWait = await q("user-A", "waiting"), bNeeds = await q("user-B", "needs");
  info(`queue A needs ${aNeeds.body?.items?.length} · A waiting ${aWait.body?.items?.length} · B needs ${bNeeds.body?.items?.length}`);
  step("C5.3: the second person's Needs you lists the held file with one step to take", !!findHeld(bNeeds.body) && findHeld(bNeeds.body).state === "needs", findHeld(bNeeds.body));
  step("C5.3 P-79: the uploader sees it under Waiting for others, never under Needs you", !!findHeld(aWait.body) && !findHeld(aNeeds.body), { needs: !!findHeld(aNeeds.body), waiting: !!findHeld(aWait.body) });
  const all = await q("user-A", "all"), run = await q("user-A", "running");
  step("C5.3: All and Running answer for the author; All holds at least what Needs you and Waiting hold", all.status === 200 && run.status === 200 && all.body.items.length >= aNeeds.body.items.length + aWait.body.items.length, `${all.body?.items?.length} ≥ ${aNeeds.body?.items?.length}+${aWait.body?.items?.length}`);
  r = await call("GET", "/review-queue?filter=everything");
  step("C5.3: an unknown filter is refused in words (400)", r.status === 400, words(r));
  r = await call("GET", "/review-queue?filter=needs", undefined, null);
  step("C5.3 QA-53: nobody gets 401", r.status === 401, r.status);
  r = await call("GET", "/review-queue?filter=needs", undefined, "user-P");
  step("C5.3 QA-53: a client gets 403", r.status === 403, r.status);

  r = await call("POST", `/intake/held/${held}/approve`, { irccPage: PAGE }, "user-B");
  step("C2.3: the second person approves with the page as recorded", r.status < 300, words(r));
  const row = sql(`select uploaded_by || '|' || approved_by || '|' || ircc_page || '|' || sha256 from approved_source where intake_item_id='${held}'`);
  step("C2.3: its checksum joins the approved list with the uploader, the approver and the IRCC page", /^user-A\|user-B\|https:\/\/www\.canada\.ca\/.*imm5562\.html\|[0-9a-f]{64}$/.test(row), row);
  r = await call("POST", `/intake/held/${held}/approve`, { irccPage: PAGE }, "user-C");
  step("C2.3: a second approval of the same file is refused (409)", r.status === 409, words(r));
  const bAfter = await q("user-B", "needs");
  step("C5.3: once decided, the held file leaves the second person's Needs you", !(bAfter.body?.items ?? []).some((x) => x.kind === "held_file" && x.id === findHeld(bNeeds.body)?.id), (bAfter.body?.items ?? []).filter((x) => x.kind === "held_file").length);

  // ------------------------------------------------------------ C1.8 minimum age, signer and Preview by person
  // The sample's work permit with family (Couple, two children): the principal is 38 in the Sample family, so a minimum
  // age above it removes the form from the principal's Preview, and one below it keeps it with the age in the reason.
  const C = sql("select id from combination where combination_key='wp.family'");
  const pv = async (person) => (await call("GET", `/combinations/${C}/workspace?tab=preview&family=family2&person=${person}`)).body?.preview;
  const p0 = await pv("principal");
  const F = (p0?.forms ?? []).map((f) => f.form).find((f) => f !== "IMM 1295") ?? null;
  info(`Preview: wp.family · the principal gets ${p0?.forms?.map((f) => f.form).join(", ")}`);
  step("C1.8 setup: the sample's work permit with family has a Preview where the principal gets forms", !!C && !!F, { C, F });
  if (C && F) {
    const lines = (await call("GET", `/combinations/${C}/workspace?tab=forms`)).body?.lines ?? [];
    let ln = lines.find((l) => l.code === F);
    r = await call("PATCH", `/combinations/${C}/forms/${enc(F)}`, { minAge: 60, signedBy: "person", baseRevision: ln?.revision });
    step(`C1.8: minimum age 60 and signer saved on ${F}`, r.status === 200 && r.body?.minAge === 60 && r.body?.signedBy === "person", words(r));
    const older = await pv("principal");
    step(`C1.8: Preview by person: the principal (38) no longer gets ${F} at minimum age 60`, !(older?.forms ?? []).some((f) => f.form === F), older?.forms?.map((f) => f.form));
    ln = ((await call("GET", `/combinations/${C}/workspace?tab=forms`)).body?.lines ?? []).find((l) => l.code === F);
    r = await call("PATCH", `/combinations/${C}/forms/${enc(F)}`, { minAge: 30, baseRevision: ln?.revision });
    const younger = await pv("principal");
    const why = (younger?.forms ?? []).find((f) => f.form === F)?.why ?? null;
    info(`principal's reason for ${F} at 30: ${why}`);
    step(`C1.8: at minimum age 30 the principal gets ${F} again, and the reason names the age`, r.status === 200 && !!why && /30/.test(why), why);
    const copies = lines.some((l) => "copies" in l) || /copies/i.test(sql("select column_name from information_schema.columns where table_name='combination_form' and column_name ilike '%cop%'") || "");
    step("C1.8: the number of copies per line is stored and shown", copies, "no copies field on the line or in combination_form");

    // The same in the browser: the Preview tab for the child.
    const browser = await chromium.launch({ headless: !process.env.QA_HEADED });
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    await page.addInitScript(() => localStorage.setItem("xr-actor", "user-A"));
    await page.goto(`${BASE}/review`, { waitUntil: "networkidle" }).catch(() => {});
    await wait(1500);
    const qtext = await page.locator("main").innerText().catch(() => "");
    step("C5.3 (browser): To review shows Needs you · Waiting for others · Running · All", ["Needs you", "Waiting for others", "Running", "All"].every((w) => qtext.includes(w)), qtext.slice(0, 200));
    await page.screenshot({ path: path.join(SHOTS, "01-to-review-author-1440.png") });
    await browser.close();
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log("FAIL  run stopped —", e.message); process.exit(1); });
