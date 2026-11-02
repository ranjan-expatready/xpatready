// C2.6 (QA-157) break round on PR 574 (screens/C2.6-checklist-queue/break-report.md): the review queue's lander for a
// checklist's document lines, a passing and a failing case per finding, through the API and the database on an isolated
// copy with the six loaded (Visitor visa, IMM 5484's saved reading replayed at US$0). No browser, no model call.
//   M1  Undo never takes a new document type away from a line accepted in another decision
//   M2  an edit naming another document type the library lacks is refused, never landed on the proposed one
//   M3  an accept and a reject of one line at the same moment: one wins, the other is refused as already decided
//   M4  a condition reading a retired field is refused in words, as the requirement writer refuses it
//   m1  a role named twice is one line; m2  photos are read by a person
//   zsh studio/tools/isolated.sh forms_c26b 4451 start && tsx studio/tests/check_forms_c26_queue_breaks.ts 4451 xr_studio_forms_c26b
import { execFileSync } from "node:child_process";

const PORT = Number(process.argv[2] ?? 4451), DB = process.argv[3] ?? "xr_studio_forms_c26b";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 240)}` : ""}`); };
const sql = (q: string) => execFileSync("psql", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", DB, "-Atc", q], { encoding: "utf8" }).trim();
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j, words: String(j?.message ?? j?.detail ?? "") };
};

async function main() {
  const l = await call("POST", "/demo/load", { sample: "six" });
  ok("setup: the six load", l.status < 300, l.status);
  const vv = sql("select id from combination where combination_key='vv.single'");
  const att = sql(`select id from source_attachment where combination_id='${vv}' and lower(file_name) like '%imm5484e.pdf' order by created_at limit 1`);
  const job = (await call("POST", `/attachments/${att}/draft-checklist`, { mode: "replay" })).body?.id;
  ok("setup: IMM 5484 replays on Visitor visa (US$0)", !!job && sql("select coalesce(sum(cost_usd),0) from drafting_job") === "0", job);
  const line = (t: string) => sql(`select id from proposal_item where run_id='${job}' and kind='requirement_line' and payload->>'documentType'='${t}' and status='waiting'`);
  const typeItem = (name: string) => sql(`select id from proposal_item where run_id='${job}' and kind='document_type' and payload->>'name'='${name}'`);
  const payloadOf = (id: string) => JSON.parse(sql(`select payload from proposal_item where id='${id}'`));
  const reqs = () => Number(sql(`select count(*) from document_requirement where combination_id='${vv}'`));
  const decide = (ids: string[], action: string, extra: Record<string, unknown> = {}, actor = "user-A") => call("POST", "/review/proposals/decide", { ids, action, ...extra }, actor);

  // ---------------------------------------------------------------- m2: photos are read by a person
  ok("C2.6 m2: the photos' document type is read by a person (person_only), not as a record", payloadOf(typeItem("Visa application photos"))?.readerKind === "person_only", payloadOf(typeItem("Visa application photos"))?.readerKind);

  // ---------------------------------------------------------------- M1: Undo and a type another decision's line uses
  const feeType = typeItem("Fee payment receipt"), feeLine = line("fee_payment_receipt");
  let r = await decide([feeType], "accept");
  const batchX = r.body?.batchId, feeKey = r.body?.items?.[0]?.landedAs;
  r = await decide([feeLine], "accept");
  const batchY = r.body?.batchId;
  ok("setup: the type accepted alone, then its line in a second decision (it uses that type)", !!batchX && !!batchY && sql(`select document_type_key from document_requirement where combination_id='${vv}' and lineage_key like 'fee_payment%'`) === feeKey, { feeKey, status: r.status, words: r.words });
  r = await call("POST", `/review/proposals/undo/${batchX}`, {});
  ok("C2.6 M1 fail: undoing the type's decision while a line of another decision uses it answers 409 in words; the type stays", r.status === 409 && /used by a document line on Visitor visa/.test(r.words) && sql(`select count(*) from document_type where document_type_key='${feeKey}'`) === "1", r.words);
  r = await call("POST", `/review/proposals/undo/${batchY}`, {});
  const r2 = await call("POST", `/review/proposals/undo/${batchX}`, {});
  ok("C2.6 M1 pass: undoing the line first, then the type, takes both back", r.status === 201 && r2.status === 201 && sql(`select count(*) from document_type where document_type_key='${feeKey}'`) === "0" && sql(`select count(*) from document_requirement where combination_id='${vv}' and lineage_key like 'fee_payment%'`) === "0", { line: r.status, type: r2.status, words: r2.words });

  // ---------------------------------------------------------------- M2: an edit naming a type the library lacks
  const mar = line("marriage_certificate_copy"), n0 = reqs();
  r = await decide([mar], "edit", { payload: { ...payloadOf(mar), documentType: "banana_peel_photo", always: true, condition: null } });
  ok("C2.6 M2 fail: an edit naming a document type the library lacks is refused (409, naming it); nothing is written", r.status === 409 && /banana peel photo/.test(r.words) && reqs() === n0 && sql(`select status from proposal_item where id='${mar}'`) === "waiting", r.words);
  r = await decide([mar], "edit", { payload: { ...payloadOf(mar), always: true, condition: null } });
  ok("C2.6 M2 pass: the same edit keeping its own type lands the line on that type", r.status === 201 && reqs() === n0 + 1 && /^marriage_certificate_copy/.test(String(r.body?.items?.[0]?.landedAs)), r.body?.items);

  // ---------------------------------------------------------------- M3: accept and reject at the same moment
  for (const t of ["proof_of_financial_support", "passport_information_page_copy"]) {
    const id = line(t), before = reqs();
    const [a, b] = await Promise.all([decide([id], "accept"), decide([id], "reject", { reason: "Test: rejected at the same moment" }, "user-B")]);
    const won = [a, b].filter((x) => x.status === 201).length, lost = [a, b].find((x) => x.status !== 201);
    const status = sql(`select status from proposal_item where id='${id}'`);
    ok(`C2.6 M3 fail: accept and reject of ${t.replace(/_/g, " ")} at once: one wins, the other is refused as already decided (409); the record agrees`, won === 1 && lost?.status === 409 && /already decided/.test(lost.words)
      && (status === "accepted" ? reqs() === before + 1 && a.status === 201 : status === "rejected" && reqs() === before && b.status === 201), { a: a.status, b: b.status, status, lost: lost?.words });
  }

  // ---------------------------------------------------------------- M4: a condition reading a retired field
  // Scaffolding (test input, not a real library change): the six start with an empty field library, so two yes/no fields
  // are written here, one released and one retired, as a second person's retire leaves it.
  const field = "person.c26_test_retired", other = "person.c26_test_live";
  for (const [k, st] of [[field, "RETIRED"], [other, "PUBLISHED"]]) sql(`insert into canonical_field (id, workspace_id, canonical_field_key, version, status, meaning, value_type, data_type, scope, subject_kind, origin, updated_by)
    select gen_random_uuid(), workspace_id, '${k}', 1, '${st}', 'Test fact for the C2.6 break round', 'yes_no', 'BOOLEAN', 'CLIENT_LEVEL', 'PERSON', 'HUMAN', 'user-A' from combination where id='${vv}'`);
  ok("setup: a released and a retired yes/no field to write conditions with", sql(`select string_agg(status::text, ',' order by canonical_field_key) from canonical_field where canonical_field_key in ('${field}','${other}')`) === "PUBLISHED,RETIRED");
  const us = line("us_nonimmigrant_visa_copy"), n1 = reqs();
  const cond = (k: string) => ({ sentence: "Only if the test fact is yes.", tree: { subjectKind: "EACH_APPLICANT", op: "eq", field: k, value: true }, sharedConditionKey: null, examples: [] });
  r = await decide([us], "edit", { payload: { ...payloadOf(us), always: false, condition: cond(field) } });
  ok("C2.6 M4 fail: a condition reading a retired field is refused in words (as the requirement writer refuses it); nothing is written", r.status === 400 && /retired field/.test(r.words) && reqs() === n1, r.words);
  r = await decide([us], "edit", { payload: { ...payloadOf(us), always: false, condition: cond(other) } });
  ok("C2.6 M4 pass: the same condition reading a live field lands as a conditional draft line", r.status === 201 && reqs() === n1 + 1 && sql(`select attach_mode||'|'||status from document_requirement where combination_id='${vv}' and lineage_key like 'us_nonimmigrant%'`) === "ANSWER_CONDITIONAL|DRAFT", r.words || r.body?.items);

  // ---------------------------------------------------------------- review M2 on #574: Decide lines say what the screen can do
  const purpose = line("purpose_of_travel_evidence"), minor = line("minor_custody_or_parental_authorization");
  const reasons = sql(`select string_agg(reason, ' | ') from proposal_item where run_id='${job}' and confidence='decide'`);
  ok("C2.6 review M2: a Decide line's reason never sends a person to an Edit the queue does not have; it says Accept or add it by hand", !/\bedit it\b/i.test(reasons) && /add the line by hand on the combination's Documents/.test(reasons), reasons.slice(0, 200));
  r = await decide([purpose], "accept");
  ok("C2.6 review M2 fail: a Decide line with no condition is refused, saying to add it by hand on Documents", r.status === 409 && /add the line by hand on the combination's Documents/.test(r.words) && !/\bedit\b/i.test(r.words), r.words);
  r = await decide([minor], "accept");
  const plain = sql(`select condition_plain from document_requirement where combination_id='${vv}' and lineage_key like 'minor_custody%'`);
  ok("C2.6 review M2: a Decide line accepted as it stands lands its condition in words, without the AI's commentary", r.status === 201 && plain.length >= 3 && !/draft condition|checklist|visa office|not among the inputs/i.test(plain), { status: r.status, words: r.words, plain });

  // ---------------------------------------------------------------- m1: a role named twice
  const legal = line("proof_of_legal_status_in_country_of_residence"), n2 = reqs();
  r = await decide([legal], "edit", { payload: { ...payloadOf(legal), roles: ["each_applicant", "each_applicant"], always: true, condition: null } });
  ok("C2.6 m1: a role named twice in an edit writes one line, not two", r.status === 201 && reqs() === n2 + 1, { status: r.status, words: r.words, added: reqs() - n2 });

  ok("C2.6: nothing landed PUBLISHED and nothing was spent", sql(`select count(*) from document_requirement where combination_id='${vv}' and status='PUBLISHED' and source_file='imm5484e.pdf'`) === "0" && sql("select coalesce(sum(cost_usd),0) from drafting_job") === "0");
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.log(`STOP  ${e?.stack ?? e}`); process.exit(1); });
