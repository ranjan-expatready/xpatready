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
import { FORM_SETUP } from "../api/src/form-setup.ts";
/** QA-144 slice 4 (P-319): the combinations set up from their forms are the form setup table's, never a list here. */
const FROM_FORMS = Object.keys(FORM_SETUP).map((k) => `'${k}'`).join(", ");

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

  // The Done-when (tech lead on #798): the Visitor visa is released by the checkpoint, with no release block left.
  const o = (await call("GET", `/combinations/${vv}`)).body;
  const errors = (o?.draft?.problems ?? []).filter((p: { level: string }) => p.level === "error");
  // QA-206 (tech lead on #883): the sections the forms print no heading over stay waiting on To review, so the facts only
  // their boxes read are asked of nobody until a person names them: the honest block, each named.
  // Row 7 is written before row 9: the family form release 2 files drafts its sections after it, and row 9 says what those leave (B97).
  const held = sql(`select payload->>'label' from proposal_item where kind = 'section' and status = 'waiting' and work->>'unnamed' = 'true' and coalesce(form_edition, '') not like 'IMM 5645 (%' order by payload->>'label'`).split("\n").filter(Boolean);
  const heldOnRowNine = n(`select count(*) from proposal_item where kind = 'section' and status = 'waiting' and work->>'unnamed' = 'true' and form_edition like 'IMM 5645 (%'`);
  // A form field no accepted section names is placed in the nearest one on its own form (form-part-placements.ts), so the
  // only facts left asked of nobody are those read on a form with no accepted section at all, every one of its sections
  // waiting for a name (IMM 5257 SCH1 prints no heading; review r8 M8: never a form with one held part among named ones).
  const heldFacts = new Set(sql(`select distinct m.canonical_field_key from form_field_map m join form_edition e on e.id = m.form_edition_id where m.canonical_field_key is not null and e.edition_label in (select form_edition from proposal_item where kind = 'section' and status = 'waiting' and work->>'unnamed' = 'true') and not exists (select 1 from proposal_item q where q.kind = 'section' and q.form_edition = e.edition_label and q.status in ('accepted', 'edited', 'rejected'))`).split("\n").filter(Boolean));
  // IRM 0002's saved map (#840) is replayed by the checkpoint (#891), so the release is the one outcome (review m2), unless
  // a form's sections all wait for a name (QA-206; tech lead on #883: the honest signal): then the release blocks on those
  // facts only, each named, and on nothing else.
  const released = (l.body.released as string[]).some((x) => /Visitor visa/.test(x)) && sql(`select version || '|' || approver_id || '|' || submitter_id from config_release where combination_id = '${vv}' and version = 1`) === "1|user-B|user-A"; // release 2 is row 9's (B97)
  if (!heldFacts.size) ok("QA-144 pass: the configured checkpoint releases the Visitor visa (release 1, submitted by the author, approved by the Approver)", released, { released: l.body.released, row10: r("10").why?.slice(0, 300) });
  else ok("QA-144 pass (QA-206): the Visitor visa's release blocks only on the facts of a form whose sections all wait for a name (IMM 5257 SCH1), each named on the release check (row 10)", !released && errors.length > 0 && errors.every((e: { item: string }) => heldFacts.has(e.item)) && /Visitor visa: Fix \d+ problems? before submitting/.test(r("10").why ?? ""), { released: l.body.released, notHeld: errors.filter((e: { item: string }) => !heldFacts.has(e.item)).map((e: { item: string; message: string }) => `${e.item}: ${e.message.slice(0, 120)}`).slice(0, 4) });
  ok("QA-144 pass: IRM 0002 is attached and mapped from its saved answer (US$0)", n(`select count(*) from form_field_map m join form_edition e on e.id = m.form_edition_id where e.edition_label like 'IRM 0002 (%' and m.outcome = 'mapped'`) > 0 && r("3").status === "done", r("3"));
  ok("QA-144 fail: nothing else blocks the Visitor visa's release (no form field without a decision, no fact asked of nobody but those of a form whose sections all wait for a name, no rule in words only)", errors.every((e: { item: string }) => heldFacts.has(e.item)) && !(o?.draft?.problems ?? []).some((p: { item: string; message: string }) => /nobody is asked for it/.test(p.message) && !heldFacts.has(p.item)), errors.filter((e: { item: string }) => !heldFacts.has(e.item)).slice(0, 4).map((e: { item: string; message: string }) => `${e.item}: ${e.message.slice(0, 120)}`));
  ok("QA-144 fail-guard: no live AI call and nothing spent (US$0)", n(`select count(*) from drafting_job where mode = 'LIVE'`) === 0 && ledger() === before);

  // Row 7: sections from the forms' own parts (rules, no AI), approved by a second person.
  // QA-206 (tech lead on #883): a held section is named only by print, or stays waiting and is named on the row.
  ok("QA-144 row 7: said in plain words (sections, questions, form fields, form lines); partial exactly while sections wait for a name, each named on the row", r("7").status === (held.length ? "partial" : "done") && /sections drafted from .*Visitor visa.*approved by the Approver/.test(r("7").shows) && held.every((h) => (r("7").why ?? "").includes(h)), { row: r("7"), held });
  ok("QA-144 row 9 (B97): the family form's sections left waiting for a name are said on row 9, not lost after row 7 was written", !heldOnRowNine || /IMM 5645's sections left for a person: waiting for a name/.test(r("9").shows), { heldOnRowNine, shows: r("9").shows });
  ok("QA-144 row 7 (QA-206): no section was named by a made-up name: every section in the library carries a printed heading or a person's name, none a placeholder", n(`select count(*) from logical_section where title ilike 'unnamed section%'`) === 0 && n(`select count(*) from proposal_item where kind = 'section' and status = 'waiting' and work ? 'heading'`) === 0);
  // B78 (C10.1 row 7; P-343 (10)): every section no heading was read over has a person's name, through the naming edit.
  // Not IMM 5645's: release 2 drafts its sections after row 7 is written, and row 9 says what those leave (B97).
  const namedWhere = `kind = 'section' and work->>'unnamed' = 'true' and work->>'heading' is null and coalesce(form_edition, '') not like 'IMM 5645 (%'`;
  const namedByPerson = n(`select count(*) from proposal_item where ${namedWhere} and status = 'edited'`);
  ok("B78 pass: row 7 is done: no section waits for a name, and it says how many a person named", held.length === 0 && r("7").status === "done" && !r("7").why && /(\d+) sections with no heading read over their form fields named by a person from the form's own words \(Sample; 6 in a person's wording, Unconfirmed: expert\)/.exec(r("7").shows)?.[1] === String(namedByPerson), { row: r("7"), namedByPerson });
  // BK-16 PR 2 (P-496, review M2): 59 -> 64 and 4 -> 6 in a person's wording: IMM 1295 (09-2023), the Study permit spouse's
  // work permit application, adds five unheaded sections, two of them its work sections in a Sample name of their own (so
  // they never join With an LMIA's "Details of intended work in Canada"). Its one headed work part renamed the same way is
  // said apart on row 7 and checked below.
  ok("B78 pass: all 64 (B78's 29, B79b's 30 for Family sponsorship's IMM 5532 and IMM 5604, BK-16's 5 for IMM 1295) were named by the author through the naming edit, each landed on a section of the library under that name, none plain-accepted or rejected", namedByPerson === 64 && n(`select count(*) from proposal_item where ${namedWhere} and status <> 'edited'`) === 0
    && n(`select count(*) from proposal_item p join logical_section s on s.section_key = p.decided_key where ${namedWhere.replace(/\b(kind|work)\b/g, "p.$1")} and p.status = 'edited' and p.decided_by = 'user-A' and lower(s.title) = lower(p.payload->>'label')`) === 64, { namedByPerson });
  ok("BK-16 (P-496): IMM 1295's work part under the printed \"Details of intended work in Canada\" is renamed by the author, so With an LMIA's section of that name keeps only its own questions, and row 7 says it apart",
    /; 1 section under a printed heading renamed by a person, so it does not join another combination's section of that name \(Sample, Unconfirmed: expert\)/.test(r("7").shows)
    && n(`select count(*) from proposal_item where kind = 'section' and form_edition = 'IMM 1295 (09-2023)' and status = 'edited' and payload->>'label' = 'Intended work in Canada (work permit applied for from outside Canada)'`) === 3
    && n(`select count(*) from proposal_item where kind = 'section' and form_edition = 'IMM 1295 (09-2023)' and decided_key = 'details_of_intended_work_in_canada'`) === 0, r("7").shows);
  ok("B78 AGENTS rule 4: every section a person named carries its source on the decision (the form and page, marked Sample, or Sample, Unconfirmed: expert)", n(`select count(*) from proposal_item where ${namedWhere} and status = 'edited' and coalesce(decision_reason, '') !~ 'page [0-9]+\\) \\(Sample(, Unconfirmed: expert)?\\)'`) === 0);
  // Review M1: naming decides where the questions are asked: a fact whose first form field is in a named part sits in that
  // section, not the nearest other one (before this fix "Coming into Canada" and "Indicate whether you are" held none). A fact is
  // asked once, in the section of the first form that reads it, so a named section may hold none (the line below lists them).
  const askedIn = (fact: string) => sql(`select string_agg(s.title, '|') from section_question q join logical_section s on s.section_key = q.section_key where q.canonical_field_key = '${fact}'`);
  const WANT = { "person.original_entry_date": "Coming into Canada", "person.is_principal_applicant": "Indicate whether you are" /* QA-400: the person's fact the author decided; placed there, worked out, never asked */, "relationship.other_documentary_evidence": "Other documentary evidence", "case.representative_form_action": "Appointing or cancelling a representative" };
  const emptyNamed = sql(`select string_agg(distinct s.title, ', ') from proposal_item p join logical_section s on s.section_key = p.decided_key where ${namedWhere.replace(/\b(kind|work)\b/g, "p.$1")} and p.status = 'edited' and not exists (select 1 from section_question q where q.section_key = s.section_key)`);
  console.log(`      B78: named sections with no question (their form fields are filled by hand or read elsewhere): ${emptyNamed || "none"}`);
  ok("B78 fail-guard (review M1): a fact first read in a named part is asked in that section, not the nearest other one", Object.entries(WANT).every(([f, t]) => askedIn(f) === t), Object.fromEntries(Object.keys(WANT).map((f) => [f, askedIn(f)])));
  ok("QA-144 rules pass: every Visitor visa form had its sections drafted by rules (no AI, US$0; IMM 5645 too once release 2 files it, B97)", n(`select count(*) from drafting_job where combination_id = '${vv}' and kind = 'masters_edition' and mode = 'LOCAL' and cost_usd = 0`) === n(`select count(*) from source_attachment where combination_id = '${vv}' and kind = 'Form'`)
    && n(`select count(*) from drafting_job where kind = 'masters_edition' and mode <> 'LOCAL'`) === 0);
  // Slice 2 (#878): With an LMIA is released by the same load, so items its release uses read RELEASED too.
  // Approved by the Approver; a section the Visitor visa's release carries is RELEASED with it, one it does not use stays
  // APPROVED (review m3: once released, the release's own sections must be RELEASED).
  const approved = "status in ('APPROVED', 'RELEASED')";
  const inRelease = sql(`select string_agg(distinct s->>'id', ',') from config_release r, jsonb_array_elements(r.snapshot->'sections') s where r.combination_id = '${vv}'`).split(",").filter(Boolean);
  ok("QA-144 BR-7 pass: every section in the library was approved by the Approver, and those the Visitor visa's release carries are released with it", n(`select count(*) from library_change where kind = 'section' and ${approved} and decided_by = 'user-B'`) > 10
    && n(`select count(*) from library_change where kind = 'section' and not (${approved})`) === 0
    && inRelease.length > 0 && n(`select count(*) from library_change where kind = 'section' and key in (${inRelease.map((k) => `'${k}'`).join(",") || "''"}) and status <> 'RELEASED'`) === 0, { inRelease: inRelease.length });
  ok("QA-144 BR-7 fail: the author approved no library item", n(`select count(*) from library_change where decided_by = 'user-A'`) === 0);

  // The shared placement step: each placement is the author's, asked of the client, in a section the combination uses.
  const placed = n(`select count(*) from section_question where origin = 'HUMAN' and updated_by = 'user-A' and collected_from = 'client_questionnaire'`);
  ok("QA-144 placement pass: the facts the forms need are asked in the sections of their form boxes, by the author", placed > 100 && n(`select count(*) from section_question where section_key not in (select section_key from logical_section)`) === 0, { placed });
  // Review M2: a section is chosen only when every applying person answers all of it anyway (C4.1 orders the chosen
  // ones); every other placement goes out because a form or a rule reads its fact, and only to whom it applies. A child
  // aged 1 is asked nothing only because a section is chosen, and no representative's licence facts.
  // QA-144 slice 4 (qa's ruling on #1050, P-314): at least two, enough for C4.1's order since its pack reads the current
  // last section. Express Entry's IMM 0008 puts its address parts in the shared "Contact information" section, so the
  // Visitor visa unchooses it (review M2: no visitor is asked them); three were only for a fixed position.
  ok("QA-144 placement M2: some sections are chosen on the Visitor visa (at least two, for C4.1's order), not every one holding a placed fact", n(`select count(*) from sqr_section_selection where combination_id = '${vv}'`) >= 2
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
  ok("QA-144 rule IMM 5409 (Guide 5256, Question 10): only for an applicant in a common-law union", /^ANSWER_CONDITIONAL\|PUBLISHED\|\|.*"field": "person\.marital_status".*"value": "common_law"/.test(line("IMM 5409")), line("IMM 5409"));
  ok("QA-144 rule IMM 5476 and IMM 5475 (IMM 5484 p. 1): only when the case says so (QA-227: its Yes/No question answered Yes)", /"field": ?"case\.uses_representative", ?"value": ?true/.test(line("IMM 5476")) && /"field": ?"case\.authorizes_release_to_designated_individual", ?"value": ?true/.test(line("IMM 5475")));
  // The family information form by how the combination files (tech lead, 4 Nov; IRCC-P2-04a): the sample files IMM 5257
  // as a PDF upload, so IMM 5707 (IMM 5484, the paper checklist); filed online it would be IMM 5645 (canada.ca APPLY).
  const filed = sql(`select f.channel from combination_form f join gov_form_def g on g.id = f.gov_form_def_id where f.combination_id = '${vv}' and g.form_key = 'IMM 5257' order by f.version desc limit 1`);
  const [pick, other] = filed === "ONLINE" ? ["IMM 5645", "IMM 5707"] : ["IMM 5707", "IMM 5645"];
  ok(`QA-144 rule, family information form by channel (IMM 5257 filed ${filed}): ${pick} required of each person 18 or older, ${other} taken off this draft`, /^COMBINATION_MANDATORY\|PUBLISHED\|18\|/.test(line(pick)) && line(other).split("|")[1] === "RETIRED", [line(pick), line(other)]);
  // IRM 0002 (Guide 5256, Question 3): only for a person whose gender identifier differs from their documents; the fact
  // is added for its rule (C3.6), approved by the Approver and asked of each person.
  const g = "person.gender_identifier_differs_from_documents";
  ok("QA-144 rule IRM 0002 (Guide 5256, Question 3): only when the person's gender identifier differs from their documents", new RegExp(`^ANSWER_CONDITIONAL\\|PUBLISHED\\|\\|.*"field": "${g.replace(/\./g, "\\.")}"`).test(line("IRM 0002")), line("IRM 0002"));
  ok("QA-144 IRM 0002's fact: in the library, approved by the Approver (not the author), asked of each person", n(`select count(*) from library_change where key = '${g}' and status = 'RELEASED' and decided_by = 'user-B'`) === 1
    && n(`select count(*) from section_question where canonical_field_key = '${g}' and repeats = 'per_person' and collected_from = 'client_questionnaire'`) > 0);
  ok("QA-144 rule fail-guard: no Visitor visa form is left with its condition in words only", !/condition is in words only/.test(JSON.stringify(o?.draft?.problems ?? [])));
  ok("QA-144 IMM 5409's rule reads a list value: person.marital_status has the form's own marital status list, with common_law", sql(`select l.answer_list_key from canonical_field f join answer_list l on l.answer_list_key = f.answer_list_key where f.canonical_field_key = 'person.marital_status' order by f.version desc limit 1`) !== ""
    && n(`select count(*) from answer_list_value v join answer_list l on l.id = v.answer_list_id join canonical_field f on f.answer_list_key = l.answer_list_key where f.canonical_field_key = 'person.marital_status' and v.value_key = 'common_law'`) > 0);

  // The rest of the M2 gate keeps its words: the other combinations are still refused with their own reasons.
  // Slices 2 and 3 add With an LMIA (check_qa144_lmia_release.ts) and the Study permit (check_qa144_sp_release.ts); R2-m1
  // keeps the Visitor visa's chosen sections ones its people all answer (the toddler and never-married checks above run
  // after their placements).
  ok("QA-144 scope: only the combinations the form setup table holds are set up from their forms (no other combination has a rules pass)", n(`select count(*) from drafting_job j join combination c on c.id = j.combination_id where j.kind = 'masters_edition' and c.combination_key not in (${FROM_FORMS})`) === 0);
  console.log(`${pass}/${pass + fail} passed`);
  process.exitCode = fail ? 1 : 0;
})();
