// QA-196 (C3.4; P-149 (1) one door, P-120): the checks the C3.4 masters step drafts are accepted, edited, rejected and
// undone on To review like every other kind. Before: Accept answered 409 "A form check proposal is accepted with its own
// step, not yet on this queue" (LANDERS had no form_check or cross_check). After, at US$0 with no model call, on Demo ›
// Reset to the six with Saved runs recorded from the committed jobs' stub passes (as check_forms_c34_ai.ts):
//   guide 5256's check over one answer lands as a DRAFT check of Visitor visa (its group, warning as every check does
//   (P-136) though the AI read block, its sentence and quote, made by AI) and is listed on Library › Checks after a reload; its check over two answers lands as a
//   cross-answer check that only warns; an edit lands the edited sentence; a reject writes nothing; Undo takes a landed
//   check back; a reviewer without the author duty is refused;
//   IMM 5257's form check reads the form's own fields: refused in plain words while they are not mapped to shared fields
//   (nothing written), then, once the edition's field map maps them, it lands on every combination whose draft files
//   IMM 5257, reading the shared fields, under one key.
//   zsh studio/tools/isolated.sh forms_qa196 4612 start && tsx studio/tests/check_qa196_check_landers.ts 4612 xr_studio_forms_qa196
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4612), DB = process.argv[3] ?? "xr_studio_forms_qa196";
process.env.DATABASE_URL = `postgresql://xr_studio@127.0.0.1:54329/${DB}`;
const STUDIO = join(import.meta.dirname, ".."), PROTOTYPE = join(STUDIO, ".."), ROOT = join(PROTOTYPE, "..", "..", "..");
const P2 = join(PROTOTYPE, "p2"), RUNS = join(P2, "runs");
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; } // eslint-disable-line @typescript-eslint/no-explicit-any
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("psql", [process.env.DATABASE_URL!, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const said = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? ""); // eslint-disable-line @typescript-eslint/no-explicit-any
// Simulated recorded runs, stamped 1 Jan 2000 and tagged (gitignored), removed after; the stub passes are restored.
let seq = 0;
const stamp = () => `-live-20000101t${String(++seq).padStart(9, "0")}z-pacheck${process.pid}y`;
const written: string[] = [], kept = new Map<string, Buffer | null>();
const keep = (f: string) => { if (!kept.has(f)) kept.set(f, existsSync(f) ? readFileSync(f) : null); };
const cleanUp = () => { for (const f of written) rmSync(f, { force: true }); for (const [f, b] of kept) { if (b === null) rmSync(f, { force: true }); else writeFileSync(f, b); } };
for (const [sig, code] of [["SIGINT", 130], ["SIGTERM", 143]] as const) process.on(sig, () => { cleanUp(); process.exit(code); });

import { CHOICE, DETAILS, FORM_ANSWER, guideCheck } from "./fixtures/c34-answers.ts";
// A second check of the same guide sentence over two answers: a cross-answer check (only warns, even when the AI says block).
const crossCheck = { ...guideCheck, sentence: "The passport number and the passport's expiry date are both given", reads: ["Passport number", "Passport expiry date"],
  tree_json: JSON.stringify({ op: "and", args: [{ op: "exists", field: "passport_number" }, { op: "exists", field: "passport_expiry_date" }] }),
  examples: [{ facts_json: JSON.stringify({ passport_number: "AB123456", passport_expiry_date: "2030-01-01" }), expected: true }, { facts_json: JSON.stringify({ passport_number: "AB123456" }), expected: false }] };
const GUIDE_ANSWER = { checks: [guideCheck, crossCheck], unresolved: [] };

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses.`); process.exit(2); }
  if ((await call("POST", "/demo/reset-to-six", { confirm: "RESET" })).status >= 300) { console.error("STOP  Reset to the six did not finish"); process.exit(2); }
  const att = (file: string) => sql(`select a.id from source_attachment a join combination c on c.id=a.combination_id where c.combination_key='vv.single' and a.file_name='${file}'`);
  const form = att("imm5257e.pdf"), guide = att("guide-5256.html"), vv = sql(`select id from combination where combination_key='vv.single'`);
  const spent = () => Number(sql("select coalesce(sum(cost_usd),0) from drafting_job") || 0);
  const spent0 = spent();

  // Saved runs of the four committed C3.4 jobs (the real launcher's stub pass, as a paid run leaves it).
  const tool = await import("../tools/track-a-jobs.ts");
  const [fd, fk, gd, gk] = (await tool.deriveJobs()).filter((d) => d.row === "C3.4").map((d) => d.job.job_id);
  const scratch = join(STUDIO, "var", `qa196-ledger-${process.pid}`); mkdirSync(scratch, { recursive: true });
  keep(join(P2, "screening", "canary-digest.json"));
  const record = (jobId: string, answer: unknown) => {
    keep(join(RUNS, "stub-pass", `${jobId}.json`));
    const s = spawnSync(process.execPath, [join(P2, "launch.ts"), "--job", jobId, "--stub"], { cwd: ROOT, encoding: "utf8", timeout: 120_000, env: { ...process.env, P2_LEDGER_DIR: scratch } });
    const out = JSON.parse(s.stdout.trim().split("\n").pop() ?? "{}");
    if (out.run_file) written.push(out.run_file);
    const rec = JSON.parse(readFileSync(out.run_file, "utf8"));
    rec.caller = "live"; rec.raw_output = JSON.stringify(answer);
    rec.drafting_run.output_sha256 = rec.launch_evidence.output_sha256 = createHash("sha256").update(rec.raw_output).digest("hex");
    const f = join(RUNS, `${jobId}${stamp()}${Math.random().toString(36).slice(2, 8)}.json`);
    writeFileSync(f, JSON.stringify(rec, null, 1) + "\n"); written.push(f);
  };
  record(fd, FORM_ANSWER); record(fk, FORM_ANSWER); record(gd, GUIDE_ANSWER); record(gk, GUIDE_ANSWER);
  rmSync(scratch, { recursive: true, force: true });
  const fx = await call("POST", `/attachments/${form}/draft-masters`, { mode: "replay" });
  const gx = await call("POST", `/attachments/${guide}/draft-masters`, { mode: "replay" });
  const band = async (group: string) => { const b = (await call("GET", `/review/proposals?group=${encodeURIComponent(group)}`)).body?.group?.bands ?? {}; return [...(b.ready ?? []), ...(b.check ?? []), ...(b.decide ?? [])] as any[]; }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const guideItems = (await band(`combination:${vv}`)).filter((i) => /5256/.test(i.source?.file ?? ""));
  const one = guideItems.find((i) => i.kind === "form_check"), two = guideItems.find((i) => i.kind === "cross_check");
  const formCheck = (await band("edition:IMM 5257 (09-2023)")).find((i) => i.kind === "form_check");
  ok("setup: Saved drafts IMM 5257's form check and guide 5256's check and cross-answer check into To review, US$0", fx.status === 201 && gx.status === 201 && !!one && !!two && !!formCheck, { form: fx.status, guide: gx.status, kinds: guideItems.map((i) => i.kind), formCheck: !!formCheck });

  const checksOn = (combo: string) => sql(`select coalesce(string_agg(check_key || '|' || check_group || '|' || severity || '|' || status || '|' || origin || '|' || coalesce(message,''), ';' order by check_key), '') from check_def where combination_id='${combo}'`);
  const decide = (ids: string[], action: string, extra: object = {}, actor = "user-A") => call("POST", "/review/proposals/decide", { ids, action, ...extra }, actor);
  const listed = async (key: string) => ((await call("GET", "/library/checks")).body ?? []).find((c: any) => c.key === key); // eslint-disable-line @typescript-eslint/no-explicit-any

  // ── a guide check over one answer: lands on Visitor visa
  let r = await decide([one?.id], "accept", {}, "user-C");
  ok("QA-196 fail: a reviewer without the author duty cannot land a check on a combination's draft (403)", r.status === 403 && checksOn(vv) === "", r.status);
  r = await decide([one?.id], "accept");
  const k1 = r.body?.items?.[0]?.landedAs as string | undefined;
  ok("QA-196 pass: accepting guide 5256's check is no longer refused (was 409 \"accepted with its own step\")", r.status === 201 && !!k1, { status: r.status, said: said(r) });
  const row1 = k1 ? sql(`select check_group || '|' || severity || '|' || status || '|' || origin || '|' || message || '|' || applies_to || '|' || illustrative || '|' || (source_quote is not null) from check_def where combination_id='${vv}' and check_key='${k1}'`) : "";
  ok("QA-196 pass: it lands as a DRAFT check of Visitor visa: an official rule that warns (P-136, though the AI read block), its sentence, the answer it reads, the guide's quote, made by AI", row1 === `official_rule|warn|DRAFT|AI_PROPOSAL|${guideCheck.sentence}|passport_number|false|true`, row1);
  const l1 = k1 ? await listed(k1) : null;
  ok("QA-196 pass: after a reload, Library › Checks lists it, used in Visitor visa, made by AI, warning", !!l1 && l1.used_in?.length === 1 && l1.used_in[0].id === vv && l1.serious === false && /AI/i.test(String(l1.origin)), l1 && { used_in: l1.used_in, serious: l1.serious, origin: l1.origin });
  r = await call("POST", `/review/proposals/undo/${r.body?.batchId}`, {});
  ok("QA-196 pass: Undo takes the landed check back and the proposal waits again", r.status === 201 && checksOn(vv) === "" && sql(`select status from proposal_item where id='${one?.id}'`) === "waiting", { status: r.status, said: said(r), left: checksOn(vv) });

  // ── an edit lands the edited sentence
  const edited = { ...(one?.readings?.draft?.payload ?? {}), sentence: "The passport number is given exactly as printed on the passport" };
  r = await decide([one?.id], "edit", { payload: edited });
  const k2 = r.body?.items?.[0]?.landedAs as string | undefined;
  ok("QA-196 pass: an edit lands the edited sentence as the check's words", r.status === 201 && !!k2 && sql(`select message from check_def where check_key='${k2}'`) === edited.sentence, { status: r.status, said: said(r) });

  // ── a check over two answers: a cross-answer check that only warns
  r = await decide([two?.id], "accept");
  const k3 = r.body?.items?.[0]?.landedAs as string | undefined;
  const row3 = k3 ? sql(`select check_group || '|' || severity from check_def where check_key='${k3}'`) : "";
  ok("QA-196 pass: guide 5256's check over two answers lands as a cross-answer check (Answers compared) that only warns", r.status === 201 && row3 === "cross_record|warn", { status: r.status, row3, said: said(r) });
  r = await call("POST", `/review/proposals/undo/${r.body?.batchId}`, {});
  r = await decide([two?.id], "reject", { reason: "Not what the guide asks" });
  ok("QA-196 pass: a reject writes no check and records the reason", r.status === 201 && !sql(`select count(*) from check_def where check_key='${k3}'`).match(/[1-9]/) && sql(`select status || '|' || decision_reason from proposal_item where id='${two?.id}'`) === "rejected|Not what the guide asks", sql(`select status from proposal_item where id='${two?.id}'`));

  // ── IMM 5257's form check: it reads the form's own fields, so it needs them mapped to shared fields
  const before = Number(sql("select count(*) from check_def"));
  r = await decide([formCheck?.id], "accept");
  ok("QA-196 fail: IMM 5257's form check is refused in plain words while the form fields it reads are not mapped to shared fields, and nothing is written", r.status === 409 && /not mapped to a shared field yet/.test(said(r)) && /field page first/.test(said(r)) && /Have you ever committed, been arrested/.test(said(r)) && !/form1\[0\]|BackgroundInfo3/.test(said(r)) && Number(sql("select count(*) from check_def")) === before && sql(`select status from proposal_item where id='${formCheck?.id}'`) === "waiting", said(r));
  // The edition's field map maps the two form fields (as an applied field-map draft leaves them).
  const ed = sql(`select id from form_edition where edition_label='IMM 5257 (09-2023)'`), ws = sql("select id from workspace limit 1");
  const OFFENCE = "person.criminal_offence_declared", OFFENCE_DETAILS = "person.criminal_offence_details";
  for (const [p, key] of [[CHOICE, OFFENCE], [DETAILS, OFFENCE_DETAILS]]) sql(`insert into form_field_map (id, workspace_id, form_edition_id, data_path, outcome, canonical_field_key, version, status, origin, updated_by) values (gen_random_uuid(), '${ws}', '${ed}', '${p}', 'mapped', '${key}', 1, 'DRAFT', 'HUMAN', 'user-A')`);
  r = await decide([formCheck?.id], "accept");
  const k4 = r.body?.items?.[0]?.landedAs as string | undefined;
  const filing = sql(`select coalesce(string_agg(distinct cf.combination_id::text, ',' order by cf.combination_id::text), '') from combination_form cf join gov_form_def g on g.id=cf.gov_form_def_id where g.form_key='IMM 5257' and cf.status <> 'RETIRED'`).split(",").filter(Boolean);
  const landedOn = k4 ? sql(`select coalesce(string_agg(combination_id::text, ',' order by combination_id::text), '') from check_def where check_key='${k4}'`).split(",").filter(Boolean) : [];
  ok("QA-196 pass: once mapped, IMM 5257's form check lands on every combination whose draft files IMM 5257, under one key", r.status === 201 && filing.length > 0 && JSON.stringify(landedOn) === JSON.stringify(filing), { status: r.status, said: said(r), filing: filing.length, landedOn: landedOn.length });
  const tree = k4 ? sql(`select predicate_json::text from check_def where check_key='${k4}' limit 1`) : "";
  ok("QA-196 pass: the landed form check reads the shared fields, never the form's own field names", tree.includes(OFFENCE) && tree.includes(OFFENCE_DETAILS) && !tree.includes("form1[0]"), tree.slice(0, 200));
  const l4 = k4 ? await listed(k4) : null;
  ok("QA-196 pass: after a reload, Library › Checks lists IMM 5257's check once, used in each of those combinations", !!l4 && l4.used_in?.length === filing.length, l4 && l4.used_in?.map((u: any) => u.label)); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("QA-196 pass: the whole check spent US$0", spent() === spent0, spent());
})().catch((e) => { console.error("FAIL  unexpected", e); fail++; }).finally(() => {
  cleanUp();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
});
