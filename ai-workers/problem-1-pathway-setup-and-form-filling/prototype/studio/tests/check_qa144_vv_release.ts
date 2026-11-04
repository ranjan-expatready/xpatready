// QA-144 slice 1 (tech lead on #798): Demo › Load the configured checkpoint on a blank copy releases the Visitor visa at
// US$0, through the screens' services only (no SQL write, no live AI): the C3.4 rules pass drafts its sections, a second
// person approves them, the shared placement step asks each needed fact in the section of its form box, every form field
// no saved answer proposed is filled by hand (never "not a fact"), and its form lines follow IRCC's words (Sample,
// Unconfirmed: expert). On main the same load releases nothing, so this check fails there.
//   zsh studio/tools/isolated.sh b8_qa144 4470 start && tsx studio/tests/check_qa144_vv_release.ts 4470 xr_studio_b8_qa144
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { LEDGER_DIR } from "../../p2/policy.ts";

const PORT = Number(process.argv[2] ?? 4470), DB = process.argv[3] ?? "xr_studio_b8_qa144";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const n = (q: string) => Number(sql(q));
// node:http, not fetch: the load can take more than fetch's 300 s header wait on a busy Mac (4 Nov, load 22–27).
const call = (method: string, path: string, body?: unknown) => new Promise<{ status: number; body: any }>((done, fail) => {
  const data = body === undefined ? undefined : JSON.stringify(body);
  const rq = request({ host: "localhost", port: PORT, path: `/api${path}`, method, headers: { "x-actor": "user-A", "content-type": "application/json", ...(data ? { "content-length": Buffer.byteLength(data) } : {}) } }, (r) => {
    let t = ""; r.setEncoding("utf8"); r.on("data", (c) => (t += c)); r.on("end", () => { let b: any = null; try { b = JSON.parse(t); } catch { /* not JSON */ } done({ status: r.statusCode ?? 0, body: b }); });
  });
  rq.on("error", fail); if (data) rq.write(data); rq.end();
});
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
  ok("QA-144 rules pass: every Visitor visa form it files had its sections drafted by rules (no AI, US$0; not IMM 5645, which the paper channel takes off)", n(`select count(*) from drafting_job where combination_id = '${vv}' and kind = 'masters_edition' and mode = 'LOCAL' and cost_usd = 0`) === n(`select count(*) from source_attachment where combination_id = '${vv}' and kind = 'Form' and coalesce(edition, '') not like 'IMM 5645 (%'`)
    && n(`select count(*) from drafting_job where kind = 'masters_edition' and mode <> 'LOCAL'`) === 0);
  ok("QA-144 BR-7 pass: every section in the library was approved by the Approver", n(`select count(*) from library_change where kind = 'section' and status = 'APPROVED' and decided_by = 'user-B'`) > 10
    && n(`select count(*) from library_change where kind = 'section' and status not in ('APPROVED', 'RELEASED')`) === 0); // RELEASED: a combination released with it (slice 3)
  ok("QA-144 BR-7 fail: the author approved no library item", n(`select count(*) from library_change where decided_by = 'user-A'`) === 0);

  // The shared placement step: each placement is the author's, asked of the client, in a section the combination uses.
  const placed = n(`select count(*) from section_question where origin = 'HUMAN' and updated_by = 'user-A' and collected_from = 'client_questionnaire'`);
  ok("QA-144 placement pass: the facts the forms need are asked in the sections of their form boxes, by the author", placed > 100 && n(`select count(*) from section_question where section_key not in (select section_key from logical_section)`) === 0, { placed });
  // Review M2: a section is chosen only when every applying person answers all of it anyway (C4.1 orders the chosen
  // ones); every other placement goes out because a form or a rule reads its fact, and only to whom it applies. A child
  // aged 1 is asked nothing only because a section is chosen, and no representative's licence facts.
  ok("QA-144 placement M2: some sections are chosen on the Visitor visa (at least three, for C4.1's order), not every one holding a placed fact", n(`select count(*) from sqr_section_selection where combination_id = '${vv}'`) >= 3
    && n(`select count(*) from sqr_section_selection where combination_id = '${vv}'`) < n(`select count(distinct section_key) from section_question where updated_by = 'user-A'`), sql(`select string_agg(section_key, ',') from sqr_section_selection where combination_id = '${vv}'`));
  const pv = (await call("GET", `/combinations/${vv}/preview?people=${encodeURIComponent(JSON.stringify({ child: 1 }))}&answers=${encodeURIComponent(JSON.stringify({ "child-1|person.date_of_birth": "2025-03-01" }))}`)).body;
  const toddler = ((pv?.questions ?? []) as { fact: string; about: string; why?: string; required?: boolean }[]).filter((q) => q.about === "child-1");
  ok("QA-144 placement M2 pass: a child aged 1 is asked no question only because a section is selected", toddler.length > 0 && !toddler.some((q) => /a section this row selects/.test(q.why ?? "")), toddler.filter((q) => /selects/.test(q.why ?? "")).map((q) => q.fact).slice(0, 5));
  // Review R2-M1: a section is chosen only from forms that surely apply, so nobody is asked a conditional form's facts
  // through it: a never-married principal on their own with no representative, and the toddler once marital status is
  // answered, have no question whose only reason is a chosen section.
  const never = sql(`select v.value_key from answer_list_value v join answer_list l on l.id = v.answer_list_id join canonical_field f on f.answer_list_key = l.answer_list_key where f.canonical_field_key = 'person.marital_status' and v.value_key in ('single', 'never_married') limit 1`) || "single";
  const only = (await call("GET", `/combinations/${vv}/preview?answers=${encodeURIComponent(JSON.stringify({ "principal|person.marital_status": never }))}`)).body;
  const bySection = (pv: { questions?: { fact: string; about: string; why?: string }[] } | null, who: string) => (pv?.questions ?? []).filter((q) => q.about === who && /a section this row selects/.test(q.why ?? "")).map((q) => q.fact);
  ok(`QA-144 placement R2-M1 pass: a never-married principal on their own (marital status "${never}") is asked nothing only because a section is chosen`, (only?.questions ?? []).some((q: { about: string }) => q.about === "principal") && bySection(only, "principal").length === 0, bySection(only, "principal").slice(0, 6));
  const pv2 = (await call("GET", `/combinations/${vv}/preview?people=${encodeURIComponent(JSON.stringify({ child: 1 }))}&answers=${encodeURIComponent(JSON.stringify({ "child-1|person.date_of_birth": "2025-03-01", "child-1|person.marital_status": never, "principal|person.marital_status": never }))}`)).body;
  ok("QA-144 placement R2-M1 pass: the toddler with marital status answered is asked nothing only because a section is chosen", bySection(pv2, "child-1").length === 0, bySection(pv2, "child-1").slice(0, 6));
  ok("QA-144 placement M2 fail: a child aged 1 is never asked a representative's facts", !toddler.some((q) => q.fact.startsWith("representative.") && q.required), toddler.filter((q) => q.fact.startsWith("representative.")).map((q) => q.fact).slice(0, 5));
  // Review M3: one choice per fact from all its boxes: one list keeps one way of repeating; a list of people is per person;
  // the applicant's own name sits in their personal details, not in the spouse's part of "Marital status".
  const rep = (like: string) => sql(`select string_agg(distinct repeats, ',') from section_question where canonical_field_key like '${like}' and updated_by = 'user-A'`);
  ok("QA-144 placement M3: the previous-residence list is placed and repeats one way (every fact of it per row)", rep("person.previous_residence_%") === "per_row", rep("person.previous_residence_%"));
  ok("QA-144 placement M3: IMM 5707's children are people, so their facts are placed and asked per person, not per row", rep("relationship.child_relationship_type") === "per_person", rep("relationship.child_relationship_type"));
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
  // Slice 3 sets up the Study permit (outside Canada) from its forms too (check_qa144_sp_release.ts); no other combination yet.
  ok("QA-144 scope: only the slices' combinations are set up from their forms (no other combination has a rules pass)", n(`select count(*) from drafting_job j join combination c on c.id = j.combination_id where j.kind = 'masters_edition' and c.combination_key not in ('vv.single', 'sp.outside')`) === 0);
  console.log(`${pass}/${pass + fail} passed`);
  process.exitCode = fail ? 1 : 0;
})();
