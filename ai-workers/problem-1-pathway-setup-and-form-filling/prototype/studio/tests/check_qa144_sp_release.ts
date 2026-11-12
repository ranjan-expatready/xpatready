// QA-144 slice 3 (brief on #798, "Briefs for QA-144 slices 2 and 3"): Demo › Load the configured checkpoint on a blank
// copy releases the Study permit (outside Canada, sp.outside) at US$0, through the screens' services only (no SQL write,
// no live AI): its forms' sections by the C3.4 rules pass, approved by a second person; IMM 5707's line added from the
// Form library; each form line set by Guide 5269's and IMM 5483's words (Sample, Unconfirmed: expert); IMM 5646's fact
// added for its rule (C3.6) and approved by a second person; every form field no saved answer proposed filled by hand.
// The Visitor visa keeps its one named block (no regression). On main the same load releases no study permit, so this
// check fails there.
//   zsh studio/tools/isolated.sh rt_sp 4430 start && tsx studio/tests/check_qa144_sp_release.ts 4430 xr_studio_rt_sp
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { LEDGER_DIR } from "../../p2/policy.ts";

const PORT = Number(process.argv[2] ?? 4430), DB = process.argv[3] ?? "xr_studio_rt_sp";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const n = (q: string) => Number(sql(q));
// node:http, not fetch: the load can take more than fetch's 300 s header wait on a busy machine.
const call = (method: string, path: string, body?: unknown, actor = "user-A") => new Promise<{ status: number; body: any }>((done, fail) => {
  const data = body === undefined ? undefined : JSON.stringify(body);
  const rq = request({ host: "localhost", port: PORT, path: `/api${path}`, method, headers: { "x-actor": actor, "content-type": "application/json", ...(data ? { "content-length": Buffer.byteLength(data) } : {}) } }, (r) => {
    let t = ""; r.setEncoding("utf8"); r.on("data", (c) => (t += c)); r.on("end", () => { let b: any = null; try { b = JSON.parse(t); } catch { /* not JSON */ } done({ status: r.statusCode ?? 0, body: b }); });
  });
  rq.on("error", fail); if (data) rq.write(data); rq.end();
});
const ledger = () => { const f = join(LEDGER_DIR, "spend.jsonl"); return existsSync(f) ? readFileSync(f, "utf8").length : 0; };
type Row = { row: string; status: string; shows: string; why: string | null };
type Form = { form: string; person: string; applies: boolean | string; why?: string };
type Question = { fact: string; about: string; why?: string };

(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  ok("QA-144 slice 3: the copy starts blank", n(`select count(*) from combination`) === 0 && n(`select count(*) from logical_section`) === 0);
  const before = ledger();
  const l = await call("POST", "/demo/load", { sample: "configured" });
  if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.body); process.exit(2); }
  const rows = l.body.checkpoint as Row[], r = (id: string) => rows.find((x) => x.row === id)!;
  const sp = sql(`select id from combination where combination_key = 'sp.outside'`), vv = sql(`select id from combination where combination_key = 'vv.single'`);
  console.log(`      loaded in ${l.body.seconds.toFixed(1)} s; released ${JSON.stringify(l.body.released)}`);

  // The Done-when: the study permit is released by the checkpoint at US$0 with no block.
  ok("QA-144 slice 3 pass: the configured checkpoint releases the Study permit (outside Canada): release 1, submitted by the author, approved by the Approver",
    (l.body.released as string[]).some((x) => /Study permit › Outside Canada/.test(x)) && sql(`select version || '|' || approver_id || '|' || submitter_id from config_release where combination_id = '${sp}' order by version desc limit 1`) === "1|user-B|user-A",
    { released: l.body.released, row10: r("10").why?.slice(0, 300) });
  ok("QA-144 slice 3 fail: the study permit is not in row 10's refusals", !/Study permit › Outside Canada: /.test(r("10").why ?? "") && /Study permit › Outside Canada/.test(r("10").shows), r("10").why?.slice(0, 300));
  ok("QA-144 slice 3 fail-guard: no live AI call and nothing spent (US$0)", n(`select count(*) from drafting_job where mode = 'LIVE'`) === 0 && ledger() === before && l.body.cost_usd === 0);
  // No regression: the Visitor visa keeps exactly its one named block (IRM 0002's saved map), or is released once it lands.
  const irm0002Map = n(`select count(*) from form_field_map m join form_edition e on e.id = m.form_edition_id where e.edition_label like 'IRM 0002 (%' and m.outcome = 'mapped'`) > 0;
  ok("QA-144 slice 3 no regression: the Visitor visa keeps its one named block (IRM 0002's missing field map), or is released once that map lands",
    irm0002Map ? n(`select count(*) from config_release where combination_id = '${vv}'`) >= 1 : /Visitor visa: Fix 1 problem before submitting: IRM 0002: No form fields mapped yet/.test(r("10").why ?? ""), r("10").why?.slice(0, 300));

  // Row 7: sections from the study permit's own forms (rules, no AI), approved by a second person.
  // QA-206 (tech lead on #883): partial exactly while sections the forms print no heading over wait on To review for a name.
  const heldNow = n(`select count(*) from proposal_item where kind = 'section' and status = 'waiting' and work->>'unnamed' = 'true' and coalesce(form_edition, '') not like 'IMM 5645 (%'`); // IMM 5645's are row 9's (B97)
  ok("QA-144 slice 3 row 7: done (partial exactly while sections wait for a name, QA-206), and names the study permit among the combinations set up from their forms", r("7").status === (heldNow ? "partial" : "done") && (!heldNow || /held on To review for a person to name/.test(r("7").why ?? "")) && /sections drafted from .*Study permit › Outside Canada.*approved by the Approver/.test(r("7").shows), r("7"));
  // An edition the Visitor visa's forms already drafted (IMM 5707, IMM 5409, IMM 5476, IMM 5475) is not drafted again: its
  // sections are in the library; IMM 1294 and IMM 5646 are drafted on the study permit itself.
  ok("QA-144 slice 3 rules pass: every study permit form edition had its sections drafted by rules (no AI, US$0), IMM 1294 and IMM 5646 on the study permit", n(`select count(*) from source_attachment a where a.combination_id = '${sp}' and a.kind = 'Form' and not exists (select 1 from drafting_job j join source_attachment b on b.id = j.attachment_id where j.kind = 'masters_edition' and j.mode = 'LOCAL' and j.cost_usd = 0 and b.edition = a.edition)`) === 0
    && n(`select count(*) from drafting_job j join source_attachment a on a.id = j.attachment_id where j.combination_id = '${sp}' and j.kind = 'masters_edition' and j.mode = 'LOCAL' and a.edition in ('IMM 1294 (06-2026)', 'IMM 5646 (01-2023)')`) === 2
    && n(`select count(*) from drafting_job where kind = 'masters_edition' and mode <> 'LOCAL'`) === 0);
  ok("QA-144 slice 3 BR-7: every library item is approved by the Approver, none by the author", n(`select count(*) from library_change where status <> 'APPROVED' and status <> 'RELEASED'`) === 0 && n(`select count(*) from library_change where decided_by = 'user-A'`) === 0);

  // IMM 5707's line, added from the Form library as the Forms tab does (the form finder has no saved answer for it).
  ok("QA-144 slice 3: IMM 5707 is added to the study permit from the Form library, by the author", n(`select count(*) from combination_form f join gov_form_def g on g.id = f.gov_form_def_id where f.combination_id = '${sp}' and g.form_key = 'IMM 5707' and f.source_quote = 'IMM 5707: added from the library' and f.updated_by = 'user-A'`) >= 1
    && n(`select count(*) from audit_event where combination_id = '${sp}' and action = 'reused' and entity_key = 'IMM 5707'`) === 1);

  // The form lines from IRCC's words (Guide 5269, IMM 5483), as rules a case reads.
  const line = (form: string) => sql(`select f.attach_mode || '|' || coalesce(f.min_age::text, '') || '|' || coalesce(f.predicate_json::text, '') from combination_form f join gov_form_def g on g.id = f.gov_form_def_id where f.combination_id = '${sp}' and g.form_key = '${form}' and f.status <> 'RETIRED' order by f.version desc limit 1`);
  // BK-16 PR 2 (P-490, QA-416): IMM 1294 is now each family member's own application when it is theirs: the student always
  // (the line's who, principal_and_children_when) and a child only when they will study 6 months or more (its rule, read
  // for a dependant). A spouse files IMM 1295; a child who does not study, IMM 5257 (check_bk16_family_forms_api.ts).
  ok("QA-144 slice 3 rule IMM 1294 (BK-16): the student, and each child who will study 6 months or more", /^ANSWER_CONDITIONAL\|\|.*"field": "person\.studies_six_months_or_more".*"value": true.*"subjectKind": "DEPENDENT"/.test(line("IMM 1294"))
    && sql(`select f.who from combination_form f join gov_form_def g on g.id = f.gov_form_def_id where f.combination_id = '${sp}' and g.form_key = 'IMM 1294' and f.status <> 'RETIRED' order by f.version desc limit 1`) === "principal_and_children_when", line("IMM 1294"));
  ok("QA-144 slice 3 rule IMM 5707 (IMM 5483 p. 1): each person 18 or older", line("IMM 5707").startsWith("COMBINATION_MANDATORY|18|"), line("IMM 5707"));
  ok("QA-144 slice 3 rule IMM 5646 (Guide 5269, Custodians): only for a minor studying without a parent or guardian", /^ANSWER_CONDITIONAL\|\|.*"field": "person\.minor_studying_without_parent".*"value": true/.test(line("IMM 5646")), line("IMM 5646"));
  ok("QA-144 slice 3 rule IMM 5409 (Guide 5269, Step 2): only for a student in a common-law union", /^ANSWER_CONDITIONAL\|\|.*"field": "person\.marital_status".*"value": "common_law"/.test(line("IMM 5409")), line("IMM 5409"));
  ok("QA-144 slice 3 rule IMM 5476 and IMM 5475 (IMM 5483 p. 1): only when the case says so (QA-227: its Yes/No question answered Yes)", /"field": ?"case\.uses_representative", ?"value": ?true/.test(line("IMM 5476")) && /"field": ?"case\.authorizes_release_to_designated_individual", ?"value": ?true/.test(line("IMM 5475")));
  ok("QA-144 slice 3 fail-guard: no study permit form is left with its condition in words only, and the checklist IMM 5483 is not filed", n(`select count(*) from combination_form f where f.combination_id = '${sp}' and f.attach_mode = 'ANSWER_CONDITIONAL' and f.predicate_json is null and f.status <> 'RETIRED'`) === 0
    && n(`select count(*) from combination_form f join gov_form_def g on g.id = f.gov_form_def_id where f.combination_id = '${sp}' and g.form_key = 'IMM 5483'`) === 0);
  // IMM 5646's fact (C3.6): in the library, approved by the Approver, asked of each person beside their date of birth.
  const m = "person.minor_studying_without_parent";
  ok("QA-144 slice 3 IMM 5646's fact: in the library, approved by the Approver (not the author)", n(`select count(*) from library_change where key = '${m}' and decided_by = 'user-B'`) === 1);
  ok("QA-144 slice 3 IMM 5646's fact: asked of each person, by the client, in the section that asks their date of birth", n(`select count(*) from section_question where canonical_field_key = '${m}' and repeats = 'per_person' and collected_from = 'client_questionnaire'`) > 0
    && sql(`select section_key from section_question where canonical_field_key = '${m}' order by version desc limit 1`) === sql(`select section_key from section_question where canonical_field_key = 'person.date_of_birth' order by version desc limit 1`));

  // The rules as a case reads them (Preview): an adult student, and a student aged 15 coming without a parent.
  const preview = async (answers: Record<string, unknown>) => (await call("GET", `/combinations/${sp}/preview?answers=${encodeURIComponent(JSON.stringify(answers))}`)).body as { forms?: Form[]; questions?: Question[] } | null;
  const adult = await preview({ "principal|person.date_of_birth": "1998-01-01", "principal|person.marital_status": "single", [`principal|${m}`]: false });
  const minor = await preview({ "principal|person.date_of_birth": "2011-05-01", "principal|person.marital_status": "single", [`principal|${m}`]: true });
  const applies = (pv: typeof adult, form: string) => (pv?.forms ?? []).find((f) => f.form === form && f.person === "principal")?.applies === true;
  ok("QA-144 slice 3 preview pass: a single adult student files IMM 1294 and IMM 5707, not IMM 5646, IMM 5409, IMM 5476 or IMM 5475", applies(adult, "IMM 1294") && applies(adult, "IMM 5707") && !["IMM 5646", "IMM 5409", "IMM 5476", "IMM 5475"].some((f) => applies(adult, f)), (adult?.forms ?? []).map((f) => `${f.form}:${f.applies}`));
  ok("QA-144 slice 3 preview pass: a student aged 15 coming without a parent files IMM 5646 (and, under 18, not IMM 5707)", applies(minor, "IMM 5646") && !applies(minor, "IMM 5707"), (minor?.forms ?? []).map((f) => `${f.form}:${f.applies}`));
  ok("QA-144 slice 3 placement: the single adult student is asked nothing only because a section is chosen", (adult?.questions ?? []).some((q) => q.about === "principal") && !(adult?.questions ?? []).some((q) => q.about === "principal" && /a section this row selects/.test(q.why ?? "")),
    (adult?.questions ?? []).filter((q) => /a section this row selects/.test(q.why ?? "")).map((q) => q.fact).slice(0, 6));
  ok("QA-144 slice 3 placement: some sections are chosen on the study permit, not every one holding a placed fact", n(`select count(*) from sqr_section_selection where combination_id = '${sp}'`) >= 1
    && n(`select count(*) from sqr_section_selection where combination_id = '${sp}'`) < n(`select count(distinct section_key) from section_question where updated_by = 'user-A'`), sql(`select string_agg(section_key, ',') from sqr_section_selection where combination_id = '${sp}'`));

  // K1 (ruling 2): no study permit form field without a decision; the leftovers are filled by hand, with the rule's words.
  const spEditions = `select e.id from form_edition e join gov_form_def g on g.id = e.gov_form_def_id join combination_form f on f.gov_form_def_id = g.id where f.combination_id = '${sp}' and e.channel <> 'ONLINE'`;
  ok("QA-144 slice 3 K1 pass: the study permit's form fields all have a decision (IMM 1294's 15 and IMM 5646's 30 leftovers filled by hand)", n(`select count(*) from form_field_map where form_edition_id in (${spEditions}) and outcome = 'unresolved' and status <> 'RETIRED'`) === 0
    && n(`select count(*) from form_field_map m join form_edition e on e.id = m.form_edition_id where e.edition_label in ('IMM 1294 (06-2026)', 'IMM 5646 (01-2023)') and m.outcome = 'by_hand' and m.reason like 'Not proposed by the saved AI answer%'`) >= 45);

  // One marital status list for the shared fact, and IMM 1294's "Separated" given the code IMM 5257 already gives it.
  ok("QA-144 slice 3: person.marital_status keeps the Visitor visa's list (a second combination's list waits on To review)", sql(`select answer_list_key from canonical_field where canonical_field_key = 'person.marital_status' order by version desc limit 1`) === "marital_status");
  const codeOf = (edition: string) => sql(`select m.option_map->'map'->>'legally_separated' from form_field_map m join form_edition e on e.id = m.form_edition_id where e.edition_label = '${edition}' and m.data_path = 'form1[0].Page1[0].MaritalStatus[0].SectionA[0].MaritalStatus[0]' and m.status <> 'RETIRED' order by m.version desc limit 1`);
  ok("QA-144 slice 3: IMM 1294's \"Separated\" takes code 05, the code IMM 5257 gives \"Legally Separated\" on the same IRCC list", codeOf("IMM 1294 (06-2026)") === "05" && codeOf("IMM 5257 (09-2023)") === "05", [codeOf("IMM 1294 (06-2026)"), codeOf("IMM 5257 (09-2023)")]);
  // B78 (review M3; engine/programs.ts personQuestions): the study permit's Student is asked the facts its forms read, so a
  // case opens on the release, though its one chosen section holds only questions asked once for the application.
  const opened = await call("POST", "/runtime/cases", { combinationId: sp, reference: `B78-sp-${Date.now()}`, clientActor: "user-P", principal: { displayName: "Sample Client (Sample)" } }, "user-O");
  ok("B78 pass (review M3): a case opens on the study permit's release: no false \"No questions yet for Student\"", opened.status < 300 && !!opened.body?.id, opened.body?.missing ?? opened.status);
  const pvSp = (await call("GET", `/combinations/${sp}/preview`)).body;
  // QA-144 review M2, kept with no placement guard: nobody is asked a person's question only because a section is chosen.
  ok("B78 fail-guard (QA-144 review M2): the Student is asked no question no form of theirs reads", !((pvSp?.questions ?? []) as { about: string; why?: string }[]).some((q) => q.about === "principal" && /a section this row selects/.test(q.why ?? "")), ((pvSp?.questions ?? []) as { about: string; fact: string; why?: string }[]).filter((q) => /a section this row selects/.test(q.why ?? "")).slice(0, 4).map((q) => q.fact));
  ok("B78 pass (review M3): the Student really is asked: Preview lists the principal's questions", ((pvSp?.questions ?? []) as { about: string }[]).filter((q) => q.about === "principal").length > 50);
  console.log(`${pass}/${pass + fail} passed`);
  process.exitCode = fail ? 1 : 0;
})();
