// QA-144 slice 2 (brief on #798): Demo › Load the configured checkpoint on a blank copy releases With an LMIA – inside
// Canada (wp.lmia_inside) at US$0, through the screens' services only (no SQL write, no live AI): the C3.4 rules pass
// drafts its sections, a second person approves them, its forms IRCC's words name are added from the Form library, their
// lines follow those words (Guide 5553, IMM 5556, the combination's canada.ca page; Sample, Unconfirmed: expert), the
// shared placement step asks each needed fact, and R2-m1 unchooses a chosen section a shared placement made one not
// everyone answers. On main (and on slice 1) the same load releases no With an LMIA, so this check fails there.
//   zsh studio/tools/isolated.sh b8_lmia 4471 start && tsx studio/tests/check_qa144_lmia_release.ts 4471 xr_studio_b8_lmia
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { LEDGER_DIR } from "../../p2/policy.ts";

const PORT = Number(process.argv[2] ?? 4471), DB = process.argv[3] ?? "xr_studio_b8_lmia";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const n = (q: string) => Number(sql(q));
// node:http, not fetch: the load can take more than fetch's 300 s header wait on a busy Mac (slice 1's check).
const call = (method: string, path: string, body?: unknown) => new Promise<{ status: number; body: any }>((done, fail) => {
  const data = body === undefined ? undefined : JSON.stringify(body);
  const rq = request({ host: "localhost", port: PORT, path: `/api${path}`, method, headers: { "x-actor": "user-A", "content-type": "application/json", ...(data ? { "content-length": Buffer.byteLength(data) } : {}) } }, (r) => {
    let t = ""; r.setEncoding("utf8"); r.on("data", (c) => (t += c)); r.on("end", () => { let b: any = null; try { b = JSON.parse(t); } catch { /* not JSON */ } done({ status: r.statusCode ?? 0, body: b }); });
  });
  rq.on("error", fail); if (data) rq.write(data); rq.end();
});
const ledger = () => { const f = join(LEDGER_DIR, "spend.jsonl"); return existsSync(f) ? readFileSync(f, "utf8").length : 0; };
type Row = { row: string; status: string; shows: string; why: string | null };
const preview = async (id: string, people: object, answers: object) => (await call("GET", `/combinations/${id}/preview?people=${encodeURIComponent(JSON.stringify(people))}&answers=${encodeURIComponent(JSON.stringify(answers))}`)).body as { questions?: { fact: string; about: string; why?: string }[] } | null;
const bySection = (pv: Awaited<ReturnType<typeof preview>>, who: string) => (pv?.questions ?? []).filter((q) => q.about === who && /a section this row selects/.test(q.why ?? "")).map((q) => q.fact);

(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  ok("QA-144: the copy starts blank", n(`select count(*) from combination`) === 0 && n(`select count(*) from logical_section`) === 0);
  const before = ledger();
  const l = await call("POST", "/demo/load", { sample: "configured" });
  if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.body); process.exit(2); }
  const rows = l.body.checkpoint as Row[], r = (id: string) => rows.find((x) => x.row === id)!;
  const lm = sql(`select id from combination where combination_key = 'wp.lmia_inside'`), vv = sql(`select id from combination where combination_key = 'vv.single'`);
  console.log(`      loaded in ${l.body.seconds.toFixed(1)} s; released ${JSON.stringify(l.body.released)}`);

  // The Done-when (brief on #798): released at US$0 with 0 blocks.
  const released = sql(`select version || '|' || approver_id || '|' || submitter_id from config_release where combination_id = '${lm}' order by version desc limit 1`);
  ok("QA-144 slice 2 pass: the configured checkpoint releases With an LMIA – inside Canada (release 1, submitted by the author, approved by the Approver)", (l.body.released as string[]).some((x) => /With an LMIA – inside Canada/.test(x)) && released === "1|user-B|user-A", { released: l.body.released, row10: r("10").why?.slice(0, 300) });
  const o = (await call("GET", `/combinations/${lm}`)).body;
  const errors = (o?.draft?.problems ?? []).filter((p: { level: string }) => p.level === "error");
  ok("QA-144 slice 2 fail: nothing blocks it (no form field without a decision, no fact asked of nobody, no list value without the form's code)", errors.length === 0 && !/With an LMIA – inside Canada: Fix/.test(r("10").why ?? ""), errors.slice(0, 4).map((e: { item: string; message: string }) => `${e.item}: ${e.message.slice(0, 120)}`));
  ok("QA-144 slice 2 fail-guard: no live AI call and nothing spent (US$0)", n(`select count(*) from drafting_job where mode = 'LIVE'`) === 0 && ledger() === before && l.body.cost_usd === 0);
  ok("QA-144 slice 2 release (C10.1 row 10): the SME signed off and a different person released it", n(`select count(*) from review_submission s where s.combination_id = '${lm}' and s.status = 'APPROVED' and s.submitted_by = 'user-A'`) === 1 && n(`select count(*) from review_signoff where actor_id = 'user-C' and action = 'signed'`) > 0);

  // Row 7: its forms' sections by rules (no AI), approved by a second person.
  // QA-206 (tech lead on #883): partial exactly while sections the forms print no heading over wait on To review for a name.
  const heldNow = n(`select count(*) from proposal_item where kind = 'section' and status = 'waiting' and work->>'unnamed' = 'true' and coalesce(form_edition, '') not like 'IMM 5645 (%'`); // IMM 5645's are row 9's (B97)
  ok("QA-144 slice 2 row 7: done (partial exactly while sections wait for a name, QA-206), and names With an LMIA among the combinations set up from their forms", r("7").status === (heldNow ? "partial" : "done") && (!heldNow || /held on To review for a person to name/.test(r("7").why ?? "")) && /sections drafted from .*With an LMIA – inside Canada.*approved by the Approver/.test(r("7").shows), r("7"));
  // One rules pass per edition in the workspace (P-138): IMM 5710's is With an LMIA's own; the forms it shares with the
  // Visitor visa reuse that pass, and the placement step reads it for both.
  const editions = sql(`select string_agg(distinct edition, ',') from source_attachment where combination_id = '${lm}' and kind = 'Form'`).split(",");
  const drafted = sql(`select string_agg(distinct detail->>'edition', ',') from drafting_job where kind = 'masters_edition' and mode = 'LOCAL' and cost_usd = 0`).split(",");
  ok("QA-144 slice 2 rules pass: every With an LMIA form edition had its sections drafted by rules (no AI, US$0), IMM 5710 on With an LMIA itself", editions.length >= 5 && editions.every((e) => drafted.includes(e))
    && n(`select count(*) from drafting_job where combination_id = '${lm}' and kind = 'masters_edition' and detail->>'edition' like 'IMM 5710 (%'`) === 1 && n(`select count(*) from drafting_job where kind = 'masters_edition' and mode <> 'LOCAL'`) === 0, { editions, drafted });
  ok("QA-144 slice 2 BR-7 fail: the author approved no library item", n(`select count(*) from library_change where decided_by = 'user-A'`) === 0 && n(`select count(*) from library_change where status = 'WAITING'`) === 0);

  // Its forms from IRCC's words, added from the Form library (the Forms tab's "add one from the Form library").
  const line = (form: string) => sql(`select f.attach_mode || '|' || f.status || '|' || coalesce(f.min_age::text, '') || '|' || coalesce(f.predicate_json::text, '') from combination_form f join gov_form_def g on g.id = f.gov_form_def_id where f.combination_id = '${lm}' and g.form_key = '${form}' order by f.version desc limit 1`);
  const fromLibrary = sql(`select string_agg(entity_key, ',' order by entity_key) from audit_event where entity = 'form' and action = 'reused' and actor = 'user-A' and combination_id = '${lm}'`);
  ok("QA-144 slice 2 Form library: IMM 5707, IMM 5409, IMM 5476 and IMM 5475 are added to With an LMIA from the Form library by the author", fromLibrary === "IMM 5409,IMM 5475,IMM 5476,IMM 5707", fromLibrary);
  ok("QA-144 slice 2 rule, family information form (IMM 5710 filed as a PDF upload; the combination's page and IMM 5707's own words): IMM 5707 required of each person 18 or older", line("IMM 5710").split("|")[0] === "COMBINATION_MANDATORY" && line("IMM 5707").startsWith("COMBINATION_MANDATORY|PUBLISHED|18|"), [line("IMM 5710"), line("IMM 5707")]);
  ok("QA-144 slice 2 rule fail: IMM 5645 is not one of its forms (no line added, none taken off)", line("IMM 5645") === "");
  ok("QA-144 slice 2 rule IMM 5409 (Guide 5553 \"if applicable\", IMM 5556): only for an applicant in a common-law union", /^ANSWER_CONDITIONAL\|PUBLISHED\|\|.*"field": "person\.marital_status".*"value": "common_law"/.test(line("IMM 5409")), line("IMM 5409"));
  ok("QA-144 slice 2 rule IMM 5476 and IMM 5475 (IMM 5556's notes): only when the case says so (QA-227: its Yes/No question answered Yes)", /^ANSWER_CONDITIONAL\|PUBLISHED\|.*"field": ?"case\.uses_representative", ?"value": ?true/.test(line("IMM 5476")) && /^ANSWER_CONDITIONAL\|PUBLISHED\|.*"field": ?"case\.authorizes_release_to_designated_individual", ?"value": ?true/.test(line("IMM 5475")), [line("IMM 5476"), line("IMM 5475")]);

  // Its people: a worker on their own is asked nothing only because a section is chosen; nor is a spouse or partner.
  const never = sql(`select v.value_key from answer_list_value v join answer_list l on l.id = v.answer_list_id join canonical_field f on f.answer_list_key = l.answer_list_key where f.canonical_field_key = 'person.marital_status' and v.value_key in ('single', 'never_married') limit 1`) || "single";
  const alone = await preview(lm, {}, { "principal|person.marital_status": never });
  ok(`QA-144 slice 2 placement pass: a never-married worker on their own is asked questions, none only because a section is chosen`, (alone?.questions ?? []).some((q) => q.about === "principal") && bySection(alone, "principal").length === 0, bySection(alone, "principal").slice(0, 6));
  const pair = await preview(lm, { spouse_or_partner: 1 }, { "principal|person.marital_status": "married", "spouse_or_partner|person.marital_status": "married" });
  ok("QA-144 slice 2 placement pass: with a married spouse or partner, neither person is asked anything only because a section is chosen", (pair?.questions ?? []).some((q) => q.about === "spouse_or_partner") && bySection(pair, "principal").length + bySection(pair, "spouse_or_partner").length === 0, [...bySection(pair, "principal"), ...bySection(pair, "spouse_or_partner")].slice(0, 6));
  ok("QA-144 slice 2 placement M2: some sections are chosen on With an LMIA, not every one holding a placed fact", n(`select count(*) from sqr_section_selection where combination_id = '${lm}'`) >= 1
    && n(`select count(*) from sqr_section_selection where combination_id = '${lm}'`) < n(`select count(distinct section_key) from section_question where updated_by = 'user-A'`), sql(`select string_agg(section_key, ',') from sqr_section_selection where combination_id = '${lm}'`));

  // R2-m1: With an LMIA's placements land in sections the Visitor visa chose earlier (the library's sections are
  // shared); the step unchooses those on the Visitor visa, so its people are still asked only what they all answer.
  const unchosen = sql(`select string_agg(entity_key, ',' order by entity_key) from audit_event where entity = 'section selection' and actor = 'user-A' and combination_id = '${vv}' and summary like '%removed the section%'`);
  ok("QA-144 R2-m1 pass: sections the Visitor visa chose that With an LMIA's placements made not-everyone's are unchosen there, by the author, and row 7 says so", unchosen !== "" && /chosen sections? unchosen again where a shared placement made .* not everyone's \(.*Visitor visa.*\)/.test(r("7").shows) && unchosen.split(",").every((k) => n(`select count(*) from sqr_section_selection where combination_id = '${vv}' and section_key = '${k}'`) === 0), unchosen);
  const tod = await preview(vv, { child: 1 }, { "child-1|person.date_of_birth": "2025-03-01", "child-1|person.marital_status": never, "principal|person.marital_status": never });
  ok("QA-144 R2-m1 fail: after With an LMIA's load, the Visitor visa's toddler and a never-married principal are asked nothing only because a section is chosen", bySection(tod, "child-1").length === 0 && bySection(tod, "principal").length === 0, [...bySection(tod, "child-1"), ...bySection(tod, "principal")].slice(0, 6));
  // Round 2's R2-m1 (review R1-m4): the section the fact only IRM 0002's rule reads is placed in, when the Visitor visa's
  // own step chose it, is unchosen by that same step, before With an LMIA's step selects anything; not left to it.
  const rfSec = sql(`select section_key from section_question where canonical_field_key = 'person.gender_identifier_differs_from_documents' order by version desc limit 1`);
  const at = (q: string) => sql(`select coalesce(min(at)::text, '') from audit_event where entity = 'section selection' and ${q}`);
  const vvAdded = at(`combination_id = '${vv}' and entity_key = '${rfSec}' and summary like '%added the section%'`), vvRemoved = at(`combination_id = '${vv}' and entity_key = '${rfSec}' and summary like '%removed the section%'`), lmFirst = at(`combination_id = '${lm}' and summary like '%added the section%'`);
  // QA-206: with IMM 5257 SCH1's sections waiting for a name, the Visitor visa may never choose this section at all; then
  // there is nothing to unchoose, and it is not chosen at the end either (the invariant R1-m4 guards).
  ok("QA-144 R1-m4 pass: the IRM 0002 fact's section, once chosen on the Visitor visa, is unchosen by the Visitor visa's own step, before With an LMIA's first selection (or was never chosen there)", rfSec !== "" && lmFirst !== "" && (vvAdded === "" ? vvRemoved === "" : vvRemoved !== "" && vvRemoved < lmFirst)
    && n(`select count(*) from sqr_section_selection where combination_id = '${vv}' and section_key = '${rfSec}'`) === 0, { rfSec, vvAdded, vvRemoved, lmFirst });
  ok("QA-144 R2-m1 fail-guard: the Visitor visa keeps chosen sections (C4.1 can still order them)", n(`select count(*) from sqr_section_selection where combination_id = '${vv}'`) >= 3);

  // K1 and its list values: a form field no saved answer proposed is filled by hand; IMM 5710's own marital codes.
  ok("QA-144 slice 2 K1 pass: IMM 5710's form fields no saved answer proposed are filled by hand, with the rule's words", n(`select count(*) from form_field_map m join form_edition e on e.id = m.form_edition_id where e.edition_label like 'IMM 5710 (%' and m.outcome = 'by_hand' and m.reason like 'Not proposed by the saved AI answer%'`) > 0);
  const om = sql(`select m.option_map->'map'->>'legally_separated' from form_field_map m join form_edition e on e.id = m.form_edition_id where e.edition_label like 'IMM 5710 (%' and m.canonical_field_key = 'person.marital_status' and m.option_map is not null order by m.version desc limit 1`);
  ok("QA-144 slice 2 option map: IMM 5710 prints \"Separated\" (05) for the list's \"Legally Separated\", matched without AI", om === "05", om);

  // The rest keep their words: only the two slices are set up from their forms.
  // Slice 3 adds the Study permit (check_qa144_sp_release.ts).
  ok("QA-144 slice 2 scope: only the Visitor visa, With an LMIA and the Study permit have a rules pass", n(`select count(*) from drafting_job j join combination c on c.id = j.combination_id where j.kind = 'masters_edition' and c.combination_key not in ('vv.single', 'wp.lmia_inside', 'sp.outside')`) === 0);
  console.log(`${pass}/${pass + fail} passed`);
  process.exitCode = fail ? 1 : 0;
})();
