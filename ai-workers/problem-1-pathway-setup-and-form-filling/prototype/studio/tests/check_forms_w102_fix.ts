// W1-02 FIX (forms lane; review.md and break-report.md of 26 Oct): a passing and a failing case per finding, on an
// isolated copy. "An older database" is made by SQL in the shape the code before the park wrote (an online version, a
// portal, an Online line, a screen-map AI batch): no route can make one any more. One browser step (Preview). NO model
// call (US$0).
//   zsh studio/tools/isolated.sh forms_w102 4450 start && tsx studio/tests/check_forms_w102_fix.ts 4450 xr_studio_forms_w102
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { channelProblems } from "../engine/channels.ts";
import type { Snapshot } from "../engine/snapshot.ts";

const PORT = Number(process.argv[2] ?? 4450), DB = process.argv[3] ?? "xr_studio_forms_w102";
const OFFICIAL = join(import.meta.dirname, "..", "..", "..", "official-sources", "ircc", "forms");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const release = async (id: string, note: string) => {
  const s = await call("POST", `/combinations/${id}/submit`, { note });
  const sub = (await call("GET", `/combinations/${id}/review`, undefined, "user-C")).body.submission;
  await call("POST", `/combinations/${id}/signoff`, { items: (sub?.changeSummary ?? []).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`), action: "signed" }, "user-C");
  const a = await call("POST", `/combinations/${id}/approve`, undefined, "user-B");
  return { submit: s, approve: a };
};
/** An online version as the code before the park wrote it (older database only). */
const onlineEdition = (ws: string, defId: string, label: string) => sql(`insert into form_edition (id, workspace_id, gov_form_def_id, edition_label, channel, portal_key, captured_on, recheck_by, content_sha256, data_bound_boxes) values (gen_random_uuid(), '${ws}', '${defId}', '${label}', 'ONLINE', 'apr_portal', date '2026-10-26', date '2027-04-24', '${"a".repeat(64)}', 25) returning id`).split("\n")[0];

(async () => {
  // ──────────────────────────────────────────── engine (no server)
  const snap = (forms: unknown[]) => ({ combination: {}, forms, field_maps: [], canonical_fields: [] }) as unknown as Snapshot;
  const noPdf = channelProblems(snap([{ form_number: "IMM 0008", form_kind: "data_form", online_only: true }]));
  ok("C3.8: break M1 a form line whose form the library holds only online (no PDF edition) blocks release, saying to add its PDF", noPdf.some((p) => p.level === "error" && /has no PDF edition in the library/.test(p.message) && /Add IMM 0008's PDF from IRCC/.test(p.message)), noPdf);
  ok("C3.8: break M1 fail cases: a form with its PDF, and a checklist, have no such error", channelProblems(snap([{ form_number: "IMM 1295", form_kind: "data_form" }, { form_number: "IMM 5488", form_kind: "document_checklist", online_only: true }])).length === 0);

  await call("POST", "/demo/load");
  const ws = sql("select id from workspace limit 1");
  const wp = sql("select id from combination where combination_key='wp.family'");
  const vv = sql("select id from combination where combination_key='vv.single'");
  const status = (await call("GET", "/demo/status")).body.scope?.rows ?? {};
  ok("review m2: the Reset dialog counts \"Answer lists and merges\" and names no portal or capture", "Answer lists and merges" in status && !Object.keys(status).some((k) => /portal|capture/i.test(k)), Object.keys(status).filter((k) => /list|merge|portal|capture/i.test(k)));

  // ──────────────────────────────────────────── break M2: an older release keeps its fingerprint
  ok("C1.6: setup: With an LMIA's draft equals its release (sample)", (await call("GET", `/combinations/${wp}`)).body.draft?.matches_release === true);
  sql(`update combination set portal_key = 'APR_PORTAL' where id = '${wp}'`); // an older database: the portal chosen before the park, as w110_channels renamed it
  const r1 = await release(wp, "W1-02 fix check: a release made with a portal (older database)");
  ok("C1.6: break M2 setup: a release made with a portal and an Online-free draft goes out", r1.approve.status === 201, r1.approve.body?.message);
  let r = await call("POST", `/combinations/${wp}/submit`, { note: "nothing changed" });
  ok("C1.6: break M2 (b) an older release with a portal keeps its fingerprint: the draft matches it and submit says nothing has changed", (await call("GET", `/combinations/${wp}`)).body.draft?.matches_release === true && r.status === 400 && /Nothing has changed/.test(r.body.message), r.body.message);
  const def1295 = sql(`select id from gov_form_def where form_key='IMM 1295'`);
  const ed1295 = onlineEdition(ws, def1295, "IMM 1295 online · APR Portal · 2026-10-26 (W1-02 check)");
  await call("PATCH", `/combinations/${wp}/forms/IMM 1295/channel`, { channel: "ONLINE" });
  const r2 = await release(wp, "W1-02 fix check: IMM 1295 Online with an online version (older database)");
  const after = (await call("GET", `/combinations/${wp}`)).body.draft;
  r = await call("POST", `/combinations/${wp}/submit`, {});
  ok("C1.6: break M2 (a) an older release with an Online line and an online version keeps its fingerprint: no phantom form or field-map change", r2.approve.status === 201 && after?.matches_release === true && (after.changes ?? []).length === 0 && r.status === 400, { approve: r2.approve.status, changes: after?.changes });
  // (b) again, as a rule: a fingerprint that moved with nothing to review is never submitted (nothing to sign, nothing released).
  const lastRel = sql(`select id || '|' || sha256 from config_release where combination_id='${wp}' order by version desc limit 1`).split("|");
  sql(`update config_release set sha256 = '${"f".repeat(64)}' where id = '${lastRel[0]}'`);
  // PR #39 review: a submission already waiting (made here by SQL, as an earlier submit would leave it) is not withdrawn
  // by a submit that is then refused.
  const waiting = sql(`insert into review_submission (id, workspace_id, combination_id, draft_sha256, submitted_by, status, change_summary) values (gen_random_uuid(), '${ws}', '${wp}', '${"e".repeat(64)}', 'user-A', 'SUBMITTED', '[]') returning id`).split("\n")[0];
  const subsBefore = sql(`select count(*) from review_submission where combination_id='${wp}'`);
  r = await call("POST", `/combinations/${wp}/submit`, { note: "fingerprint moved, nothing changed" });
  ok("C5.1: break M2 (b) fail case: a draft whose fingerprint differs from its release but holds no change is refused (\"Nothing has changed\"), no submission made", r.status === 400 && /Nothing has changed/.test(r.body.message) && sql(`select count(*) from review_submission where combination_id='${wp}'`) === subsBefore, r.body.message);
  ok("C5.1: PR #39 review: the refused submit withdrew nothing: the waiting submission is still waiting", sql(`select status from review_submission where id='${waiting}'`) === "SUBMITTED", sql(`select status || ' ' || coalesce(decision_note, '') from review_submission where id='${waiting}'`));
  sql(`delete from review_submission where id='${waiting}'`);
  sql(`update config_release set sha256 = '${lastRel[1]}' where id = '${lastRel[0]}'`);

  // ──────────────────────────────────────────── review M1: Preview and the Studio fill of an Online line
  const prev = (await call("GET", `/combinations/${wp}/preview?profile=client-a-family`)).body;
  ok("C4.3: review M1 Preview says which forms are filed Online (IMM 1295 here), none other", JSON.stringify(prev.online_forms) === JSON.stringify(["IMM 1295"]), prev.online_forms);
  r = await call("POST", `/combinations/${wp}/fill`, { form: "IMM 1295", person: "principal", mode: "draft" });
  ok("C1.6: review M1 fail: filling an Online line is refused in the later-wave words, never a \"portal sheet\"", r.status === 409 && /needs the browser extension \(later wave\)/.test(r.body.message) && !/portal sheet/.test(r.body.message), r.body.message);
  r = await call("POST", `/combinations/${wp}/fill`, { form: "IMM 5707", person: "principal", mode: "draft" });
  ok("C1.6: review M1 pass: a PDF line of the same combination still fills", r.status === 201 && r.body.report?.intact === true, r.body.message ?? r.body.report?.intact);
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => localStorage.setItem("xr-actor", "user-A"));
    await p.goto(`http://localhost:${PORT}/c/${wp}/preview?view=studio`); // S5: the coverage preview sits behind Preview by person
    await p.getByRole("button", { name: "Forms and coverage" }).click();
    await p.locator("[data-online-later]").first().waitFor({ timeout: 20000 }).catch(() => {});
    const later = await p.locator("[data-online-later]").count(), fills = await p.getByRole("button", { name: "Fill PDF from confirmed facts" }).count();
    ok("C4.3: review M1 Preview shows \"Needs the browser extension (later wave)\" for IMM 1295, with no Fill button there; other forms keep theirs", later >= 1 && /Needs the browser extension \(later wave\)/.test(await p.locator("[data-online-later]").first().textContent() ?? "") && fills >= 1, { later, fills });
  } finally { await browser.close(); }
  await call("PATCH", `/combinations/${wp}/forms/IMM 1295/channel`, { channel: "PDF_UPLOAD" });

  // ──────────────────────────────────────────── break m3: parked online versions are not served
  r = await call("GET", "/library/forms/IMM%201295/editions");
  ok("C3.12: break m3 the editions list holds the PDF editions only (not the parked online version)", r.status === 200 && r.body.length >= 1 && r.body.every((e: { channel: string }) => e.channel === "PDF"), r.body.map?.((e: { label: string }) => e.label));
  const ff = await call("GET", `/editions/${ed1295}/form-fields`), om = await call("POST", `/editions/${ed1295}/option-maps/draft`);
  const pdf1295 = sql(`select id from form_edition where gov_form_def_id='${def1295}' and channel='PDF' limit 1`);
  ok("C3.8: break m3 an online version's form fields and option maps answer 404; the PDF edition's still answer", ff.status === 404 && om.status === 404 && (await call("GET", `/editions/${pdf1295}/form-fields`)).status === 200, [ff.status, om.status]);

  // ──────────────────────────────────────────── break M1: a form held only online cannot be released
  const def9 = sql(`insert into gov_form_def (id, workspace_id, form_key, display_name) values (gen_random_uuid(), '${ws}', 'IMM 9001', 'Online-only sample form (older database)') returning id`).split("\n")[0];
  onlineEdition(ws, def9, "IMM 9001 online · APR Portal · 2026-10-26");
  sql(`insert into combination_form (id, workspace_id, combination_id, gov_form_def_id, lineage_key, who, attach_mode, version, status, origin, channel, updated_by) values (gen_random_uuid(), '${ws}', '${wp}', '${def9}', 'IMM 9001', 'each_applicant', 'COMBINATION_MANDATORY', 1, 'DRAFT', 'HUMAN', 'ONLINE', 'user-A')`);
  const ch = (await call("GET", `/combinations/${wp}/channels`)).body.problems;
  r = await call("POST", `/combinations/${wp}/submit`, { note: "IMM 9001 has no PDF" });
  ok("C3.8: break M1 a line for a form the library holds only online is an error at review, and submit is refused (nothing released)", ch.some((p: { level: string; item: string }) => p.level === "error" && p.item === "IMM 9001") && r.status === 400 && /IMM 9001: IMM 9001 has no PDF edition/.test(r.body.message), r.body.message);
  ok("C3.8: break M1 pass: no other line of the combination has that error", !ch.some((p: { level: string; item: string; message: string }) => p.item !== "IMM 9001" && /no PDF edition/.test(p.message)));
  const libForms = async () => (await call("GET", "/library/forms")).body as { code: string; usedBy: number; online_only?: boolean; editions: unknown[] }[];
  const f9 = (await libForms()).find((f) => f.code === "IMM 9001");
  ok("C3.12: PR #39 review: a form held only online stays in the Forms library, marked online only, with no edition and its use (1 combination)", f9?.online_only === true && f9.editions.length === 0 && f9.usedBy === 1, f9);
  sql(`delete from combination_form where combination_id='${wp}' and lineage_key='IMM 9001'`);

  // ──────────────────────────────────────────── break m2: the first PDF of a form held only online is added, not held
  const def8 = sql(`insert into gov_form_def (id, workspace_id, form_key, display_name) values (gen_random_uuid(), '${ws}', 'IMM 0008', 'Generic application form for Canada (older database)') returning id`).split("\n")[0];
  onlineEdition(ws, def8, "IMM 0008 online · APR Portal · 2026-10-26");
  const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(readFileSync(join(OFFICIAL, "imm0008e.pdf")))]), "imm0008e.pdf");
  const up = (await (await fetch(`http://localhost:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd })).json()) as { results: { outcome: string; message: string }[] };
  ok("C2.4: break m2 the official IMM 0008 PDF is added as the form's first PDF edition, not held as a \"new edition\" of the parked online version", !/edition_held/.test(up.results[0].outcome) && sql(`select count(*) from form_edition where gov_form_def_id='${def8}' and channel='PDF'`) === "1", up.results[0]);
  const again = (await (await fetch(`http://localhost:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd })).json()) as { results: { outcome: string }[] };
  ok("C2.4: break m2 fail case: the same PDF again is \"already in the library\" (the PDF edition is the current one)", /in_library/.test(again.results[0].outcome), again.results[0].outcome);
  const f8 = (await libForms()).find((f) => f.code === "IMM 0008");
  ok("C3.12: PR #39 review fail case: once its PDF is added the form is an ordinary library form (its PDF edition listed, not online only)", !!f8 && !f8.online_only && f8.editions.length === 1, f8);

  // ──────────────────────────────────────────── break m1: a parked screen-map AI batch is never run again
  const batch = sql(`insert into ai_batch (id, workspace_id, idempotency_key, operation, scope_kind, scope_label, mode, status, plan_sha256, plan, spend_limit_usd, worst_case_usd, started_by) values (gen_random_uuid(), '${ws}', 'w102-screen-map', 'screen_map', 'online_version', 'IMM 1295 online', 'LIVE', 'FAILED', 'screen-map', '{"targets":[],"totals":{"worst_usd":0}}', 0, 0, 'user-A') returning id`).split("\n")[0];
  sql(`insert into drafting_job (id, workspace_id, combination_id, kind, mode, status, message, started_by, batch_id) values (gen_random_uuid(), '${ws}', '${wp}', 'screen_map', 'LIVE', 'FAILED', 'old failure (older database)', 'user-A', '${batch}')`);
  const b = (await call("GET", `/ai/batches/${batch}`)).body;
  r = await call("POST", `/ai/batches/${batch}/retry`, {});
  ok("C3.3: break m1 a screen-map AI batch from an older database offers no retry and a retry is refused in plain words; no new step", b.jobs?.every((j: { retryable: boolean }) => !j.retryable) && r.status === 409 && /parked with the browser extension/.test(r.body.message) && sql(`select count(*) from drafting_job where batch_id='${batch}'`) === "1", r.body.message);
  const fieldBatch = sql("select b.id from ai_batch b where b.operation <> 'screen_map' limit 1");
  ok("C3.3: break m1 pass: other AI work keeps its own retry rule (not refused as parked)", !fieldBatch || !/parked/.test((await call("POST", `/ai/batches/${fieldBatch}/retry`, {})).body?.message ?? ""));

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${String((e as Error)?.message ?? e).slice(0, 300)}`); console.error(e); process.exit(1); });
