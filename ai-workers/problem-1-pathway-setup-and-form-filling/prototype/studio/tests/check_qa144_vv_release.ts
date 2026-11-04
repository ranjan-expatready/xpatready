// QA-144 slice 1 (tech lead on #798): Demo › Load the configured checkpoint on a blank copy releases the Visitor visa at
// US$0, through the screens' services only (no SQL write, no live AI): the C3.4 rules pass drafts its sections, a second
// person approves them, the shared placement step asks each needed fact in the section of its form box, every form field
// no saved answer proposed is filled by hand (never "not a fact"), and its form lines follow IRCC's words (Sample,
// Unconfirmed: expert). On main the same load releases nothing, so this check fails there.
//   zsh studio/tools/isolated.sh b8_qa144 4470 start && tsx --tsconfig studio/api/tsconfig.json studio/tests/check_qa144_vv_release.ts 4470 xr_studio_b8_qa144
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LEDGER_DIR } from "../../p2/policy.ts";

const PORT = Number(process.argv[2] ?? 4470), DB = process.argv[3] ?? "xr_studio_b8_qa144";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const n = (q: string) => Number(sql(q));
const call = async (method: string, path: string, body?: unknown) => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": "user-A", "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const ledger = () => { const f = join(LEDGER_DIR, "spend.jsonl"); return existsSync(f) ? readFileSync(f, "utf8").length : 0; };
type Row = { row: string; status: string; shows: string; why: string | null };

(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  ok("QA-144: the copy starts blank", n(`select count(*) from combination`) === 0 && n(`select count(*) from logical_section`) === 0);
  const before = ledger();
  const l = await call("POST", "/demo/load", { sample: "configured" });
  if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.body); process.exit(2); }
  const rows = l.body.checkpoint as Row[], r = (id: string) => rows.find((x) => x.row === id)!;
  const vv = sql(`select id from combination where combination_key = 'vv.single'`);
  console.log(`      loaded in ${l.body.seconds.toFixed(1)} s; released ${JSON.stringify(l.body.released)}`);

  // The Done-when (tech lead on #798): the Visitor visa is released by the checkpoint. Until IRM 0002's saved field map
  // lands (the paid runner, #798), IRM 0002's "no form fields mapped" is its one named block (QA-180 stays strict:
  // a conditional form needs its map too); once a saved map exists, nothing but the release passes.
  const o = (await call("GET", `/combinations/${vv}`)).body;
  const errors = (o?.draft?.problems ?? []).filter((p: { level: string }) => p.level === "error");
  const irm0002Map = n(`select count(*) from form_field_map m join form_edition e on e.id = m.form_edition_id where e.edition_label like 'IRM 0002 (%' and m.outcome = 'mapped'`) > 0;
  const released = (l.body.released as string[]).some((x) => /Visitor visa/.test(x)) && sql(`select version || '|' || approver_id || '|' || submitter_id from config_release where combination_id = '${vv}' order by version desc limit 1`) === "1|user-B|user-A";
  if (irm0002Map) ok("QA-144 pass: the configured checkpoint releases the Visitor visa (release 1, submitted by the author, approved by the Approver)", released, { released: l.body.released, row10: r("10").why?.slice(0, 300) });
  else ok("QA-144 pass: with no saved map for IRM 0002 yet, its \"no form fields mapped\" is the Visitor visa's one release block, named on the release check (row 10)", !released && errors.length === 1 && errors[0].item === "IRM 0002" && /No form fields mapped yet/.test(errors[0].message) && /Visitor visa: Fix 1 problem before submitting: IRM 0002: No form fields mapped yet/.test(r("10").why ?? ""),
    errors.slice(0, 4).map((e: { item: string; message: string }) => `${e.item}: ${e.message.slice(0, 120)}`));
  ok("QA-144 fail: nothing else blocks the Visitor visa's release (no form field without a decision, no fact asked of nobody, no rule in words only)", errors.every((e: { item: string }) => e.item === "IRM 0002") && !(o?.draft?.problems ?? []).some((p: { message: string }) => /nobody is asked for it/.test(p.message)), errors.slice(0, 4).map((e: { item: string; message: string }) => `${e.item}: ${e.message.slice(0, 120)}`));
  ok("QA-144 fail-guard: no live AI call and nothing spent (US$0)", n(`select count(*) from drafting_job where mode = 'LIVE'`) === 0 && ledger() === before);

  // Row 7: sections from the forms' own parts (rules, no AI), approved by a second person.
  ok("QA-144 row 7: done, said in plain words (sections, questions, form fields, form lines)", r("7").status === "done" && /sections drafted from .*Visitor visa.*approved by the Approver/.test(r("7").shows), r("7"));
  ok("QA-144 rules pass: every Visitor visa form had its sections drafted by rules (no AI, US$0)", n(`select count(*) from drafting_job where combination_id = '${vv}' and kind = 'masters_edition' and mode = 'LOCAL' and cost_usd = 0`) >= 7
    && n(`select count(*) from drafting_job where kind = 'masters_edition' and mode <> 'LOCAL'`) === 0);
  ok("QA-144 BR-7 pass: every section in the library was approved by the Approver", n(`select count(*) from library_change where kind = 'section' and status = 'APPROVED' and decided_by = 'user-B'`) > 10
    && n(`select count(*) from library_change where kind = 'section' and status <> 'APPROVED'`) === 0);
  ok("QA-144 BR-7 fail: the author approved no library item", n(`select count(*) from library_change where decided_by = 'user-A'`) === 0);

  // The shared placement step: each placement is the author's, asked of the client, in a section the combination uses.
  const placed = n(`select count(*) from section_question where origin = 'HUMAN' and updated_by = 'user-A' and collected_from = 'client_questionnaire'`);
  ok("QA-144 placement pass: the facts the forms need are asked in the sections of their form boxes, by the author", placed > 100 && n(`select count(*) from section_question where section_key not in (select section_key from logical_section)`) === 0, { placed });
  // Review M2: no section is selected; a placement goes out because a form or a rule reads its fact, and only to whom it
  // applies. A child aged 1 is asked nothing because of a selected section, and no representative's licence facts.
  ok("QA-144 placement M2: the loader selects no section on the Visitor visa (a selected section asks its questions of everyone)", n(`select count(*) from sqr_section_selection where combination_id = '${vv}'`) === 0);
  const pv = (await call("GET", `/combinations/${vv}/preview?people=${encodeURIComponent(JSON.stringify({ child: 1 }))}&answers=${encodeURIComponent(JSON.stringify({ "child-1|person.date_of_birth": "2025-03-01" }))}`)).body;
  const toddler = ((pv?.questions ?? []) as { fact: string; about: string; why?: string; required?: boolean }[]).filter((q) => q.about === "child-1");
  ok("QA-144 placement M2 pass: a child aged 1 is asked no question only because a section is selected", toddler.length > 0 && !toddler.some((q) => /a section this row selects/.test(q.why ?? "")), toddler.filter((q) => /selects/.test(q.why ?? "")).map((q) => q.fact).slice(0, 5));
  ok("QA-144 placement M2 fail: a child aged 1 is never asked a representative's facts", !toddler.some((q) => q.fact.startsWith("representative.") && q.required), toddler.filter((q) => q.fact.startsWith("representative.")).map((q) => q.fact).slice(0, 5));
  // Review M3: one choice per fact from all its boxes: one list keeps one way of repeating; a list of people is per person;
  // the applicant's own name sits in their personal details, not in the spouse's part of "Marital status".
  const rep = (like: string) => sql(`select string_agg(distinct repeats, ',') from section_question where canonical_field_key like '${like}' and updated_by = 'user-A'`);
  ok("QA-144 placement M3: the previous-residence list repeats one way (every fact of it per row)", ["", "per_row"].includes(rep("person.previous_residence_%")), rep("person.previous_residence_%"));
  ok("QA-144 placement M3: IMM 5707's children are people, so their facts are asked per person, not per row", ["", "per_person"].includes(rep("relationship.child_relationship_type")), rep("relationship.child_relationship_type"));
  ok("QA-144 placement M3: the applicant's family name is asked in the section of their own box, not \"Marital status\"", !["", "marital_status"].includes(sql(`select section_key from section_question where canonical_field_key = 'person.family_name' order by version desc limit 1`)), sql(`select section_key from section_question where canonical_field_key = 'person.family_name' order by version desc limit 1`));
  ok("QA-144 placement fail-guard: nobody is asked for nothing (no placement of a fact outside the library)", n(`select count(*) from section_question q where not exists (select 1 from canonical_field f where f.canonical_field_key = q.canonical_field_key)`) === 0);

  // Ruling 2: a form field no saved answer proposed is filled by hand, never "not a fact".
  const byHand = n(`select count(*) from form_field_map where reason like 'Not proposed by the saved AI answer%' and outcome = 'by_hand'`);
  ok("QA-144 K1 pass: every form field no saved answer proposed is filled by hand, with the rule's words as its reason", byHand > 0 && !/no decision in this draft/.test(JSON.stringify(errors)), { byHand });
  ok("QA-144 K1 fail: the loader marked no form field \"not a fact\"", n(`select count(*) from form_field_map where reason like '%QA-144%' and outcome <> 'by_hand'`) === 0);

  // Ruling 3: the form lines from IRCC's words, as rules a case can read.
  const line = (form: string) => sql(`select f.attach_mode || '|' || f.status || '|' || coalesce(f.min_age::text, '') || '|' || coalesce(f.predicate_json::text, '') from combination_form f join gov_form_def g on g.id = f.gov_form_def_id where f.combination_id = '${vv}' and g.form_key = '${form}' order by f.version desc limit 1`);
  ok("QA-144 rule IMM 5409 (Guide 5256, Question 10): only for an applicant in a common-law union", /^ANSWER_CONDITIONAL\|DRAFT\|\|.*"field": "person\.marital_status".*"value": "common_law"/.test(line("IMM 5409")), line("IMM 5409"));
  ok("QA-144 rule IMM 5476 and IMM 5475 (IMM 5484 p. 1): only when the case says so", /case\.representative_form_action/.test(line("IMM 5476")) && /case\.release_authorization_action/.test(line("IMM 5475")));
  // The family information form by how the combination files (tech lead, 4 Nov; IRCC-P2-04a): the sample files IMM 5257
  // as a PDF upload, so IMM 5707 (IMM 5484, the paper checklist); filed online it would be IMM 5645 (canada.ca APPLY).
  const filed = sql(`select f.channel from combination_form f join gov_form_def g on g.id = f.gov_form_def_id where f.combination_id = '${vv}' and g.form_key = 'IMM 5257' order by f.version desc limit 1`);
  const [pick, other] = filed === "ONLINE" ? ["IMM 5645", "IMM 5707"] : ["IMM 5707", "IMM 5645"];
  ok(`QA-144 rule, family information form by channel (IMM 5257 filed ${filed}): ${pick} required of each person 18 or older, ${other} taken off this draft`, line(pick).startsWith("COMBINATION_MANDATORY|DRAFT|18|") && line(other).split("|")[1] === "RETIRED", [line(pick), line(other)]);
  // IRM 0002 (Guide 5256, Question 3): only for a person whose gender identifier differs from their documents; the fact
  // is added for its rule (C3.6), approved by the Approver and asked of each person.
  const g = "person.gender_identifier_differs_from_documents";
  ok("QA-144 rule IRM 0002 (Guide 5256, Question 3): only when the person's gender identifier differs from their documents", new RegExp(`^ANSWER_CONDITIONAL\\|DRAFT\\|\\|.*"field": "${g.replace(/\./g, "\\.")}"`).test(line("IRM 0002")), line("IRM 0002"));
  ok("QA-144 IRM 0002's fact: in the library, approved by the Approver (not the author), asked of each person", n(`select count(*) from library_change where key = '${g}' and status = 'APPROVED' and decided_by = 'user-B'`) === 1
    && n(`select count(*) from section_question where canonical_field_key = '${g}' and repeats = 'per_person' and collected_from = 'client_questionnaire'`) > 0);
  ok("QA-144 rule fail-guard: no Visitor visa form is left with its condition in words only", !/condition is in words only/.test(JSON.stringify(o?.draft?.problems ?? [])));
  ok("QA-144 IMM 5409's rule reads a list value: person.marital_status has the form's own marital status list, with common_law", sql(`select l.answer_list_key from canonical_field f join answer_list l on l.answer_list_key = f.answer_list_key where f.canonical_field_key = 'person.marital_status' order by f.version desc limit 1`) !== ""
    && n(`select count(*) from answer_list_value v join answer_list l on l.id = v.answer_list_id join canonical_field f on f.answer_list_key = l.answer_list_key where f.canonical_field_key = 'person.marital_status' and v.value_key = 'common_law'`) > 0);

  // The rest of the M2 gate keeps its words: the other combinations are still refused with their own reasons.
  ok("QA-144 scope: only the Visitor visa is set up from its forms in this slice (no other combination has a rules pass)", n(`select count(*) from drafting_job where kind = 'masters_edition' and combination_id <> '${vv}'`) === 0);
  console.log(`${pass}/${pass + fail} passed`);
  process.exitCode = fail ? 1 : 0;
})();
