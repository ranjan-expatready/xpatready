// QA-144 slice 5 (B79b, C10.1 row 10): Demo › Load the configured checkpoint on a blank copy releases Family sponsorship
// › Spouse or common-law partner (fs.spouse) at US$0, through the screens' services only (no SQL write, no live AI, no
// simulated Validate): its forms' sections by the C3.4 rules pass (IMM 5669's from the numbered headings it prints, the
// sections no heading was read over named by a person, B78), approved by a second person; each form line set by IMM
// 5533's and Guide 5289's words (samples/form-setup.json; Sample, Unconfirmed: expert); IMM 5604's fact added for its
// rule (C3.6) and approved by a second person; its document lines cited from IMM 5533; every form field no saved answer
// proposed filled by hand. The three combinations released before keep their release (no regression). On main
// (86b721eac) the same load refuses it ("Fix 93 problems before submitting"), so this check fails there.
//   zsh studio/tools/isolated.sh fs_rel 4456 start && tsx studio/tests/check_qa144_fs_release.ts 4456 xr_studio_fs_rel
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { LEDGER_DIR } from "../../p2/policy.ts";
import { FORM_SETUP, ruleFactOf } from "../api/src/form-setup.ts";

const PORT = Number(process.argv[2] ?? 4456), DB = process.argv[3] ?? "xr_studio_fs_rel";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const n = (q: string) => Number(sql(q));
// node:http, not fetch: the load can take more than fetch's 300 s header wait on a busy machine.
const call = (method: string, path: string, body?: unknown) => new Promise<{ status: number; body: any }>((done, failed) => {
  const data = body === undefined ? undefined : JSON.stringify(body);
  const rq = request({ host: "localhost", port: PORT, path: `/api${path}`, method, headers: { "x-actor": "user-A", "content-type": "application/json", ...(data ? { "content-length": Buffer.byteLength(data) } : {}) } }, (r) => {
    let t = ""; r.setEncoding("utf8"); r.on("data", (c) => (t += c)); r.on("end", () => { let b: any = null; try { b = JSON.parse(t); } catch { /* not JSON */ } done({ status: r.statusCode ?? 0, body: b }); });
  });
  rq.on("error", failed); if (data) rq.write(data); rq.end();
});
const ledger = () => { const f = join(LEDGER_DIR, "spend.jsonl"); return existsSync(f) ? readFileSync(f, "utf8").length : 0; };
type Row = { row: string; status: string; shows: string; why: string | null };
type Form = { form: string; person: string; applies: boolean | string };
const LABEL = "Family sponsorship › Spouse or common-law partner";

(async () => {
  // Review m1 (pure): a rule fact given whole in samples/form-setup.json is read only when C3.6's door would take it.
  const fsSetup = FORM_SETUP["fs.spouse"], ok5604 = fsSetup?.ruleFacts?.find((f) => f.rule === "IMM 5604");
  const refused = (f: unknown) => { try { ruleFactOf("fs.spouse", f as never, fsSetup!.rules); return false; } catch { return true; } };
  ok("QA-144 slice 5 pass (pure): Family sponsorship's IMM 5604 fact is read from the data, asked beside the date of birth", !!ok5604 && !refused(ok5604) && JSON.stringify(ok5604.beside) === JSON.stringify(["person.date_of_birth"]), ok5604);
  ok("QA-144 slice 5 fail (pure): a rule fact whose rule is no form of the combination, whose \"beside\" is not a list of fact keys, or that is not Yes/No is refused at the read",
    !!ok5604 && refused({ ...ok5604, rule: "IMM 9999" }) && refused({ ...ok5604, beside: "person.date_of_birth" }) && refused({ ...ok5604, beside: [] }) && refused({ ...ok5604, valueType: "text" }) && refused({ ...ok5604, fact: "minor" }));
  await call("POST", "/demo/reset", { confirm: "RESET" });
  ok("QA-144 slice 5: the copy starts blank", n(`select count(*) from combination`) === 0 && n(`select count(*) from logical_section`) === 0);
  const before = ledger();
  const l = await call("POST", "/demo/load", { sample: "configured" });
  if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.body); process.exit(2); }
  const rows = l.body.checkpoint as Row[], r = (id: string) => rows.find((x) => x.row === id)!;
  const fs = sql(`select id from combination where combination_key = 'fs.spouse'`);
  const fsWhy = (r("10").why ?? "").split(" · ").filter((x) => x.startsWith(`${LABEL}: `)).join(" · ");
  console.log(`      loaded in ${l.body.seconds.toFixed(1)} s; released ${JSON.stringify(l.body.released)}`);

  // The Done-when: Submit no longer refuses Family sponsorship; release 1 by the product's own duties, at US$0.
  ok("QA-144 slice 5 pass: the configured checkpoint releases Family sponsorship › Spouse or common-law partner: release 1, submitted by the author, signed by the SME, approved by the Approver",
    (l.body.released as string[]).includes(LABEL) && sql(`select version || '|' || submitter_id || '|' || approver_id from config_release where combination_id = '${fs}' order by version desc limit 1`) === "1|user-A|user-B",
    { released: l.body.released, refused: fsWhy.slice(0, 300) });
  // Review m3: the SME's sign-off is on this combination's own submission, not another's.
  ok("QA-144 slice 5 pass: the SME (user-C) signed Family sponsorship's submission, and the submission is approved", n(`select count(*) from review_signoff s join review_submission b on b.id = s.submission_id where b.combination_id = '${fs}' and s.actor_id = 'user-C'`) >= 1
    && n(`select count(*) from review_submission where combination_id = '${fs}' and submitted_by = 'user-A' and status = 'APPROVED'`) === 1);
  ok("QA-144 slice 5 fail: Family sponsorship is not among row 10's refusals (no form field without a decision, no fact nobody is asked)", !fsWhy && /Family sponsorship › Spouse or common-law partner/.test(r("10").shows), fsWhy.slice(0, 300));
  ok("QA-144 slice 5 fail-guard: no live AI call and nothing spent (US$0)", n(`select count(*) from drafting_job where mode = 'LIVE'`) === 0 && ledger() === before && l.body.cost_usd === 0);
  // P-46, P-171, P-172: the release is the validator's own, never a simulated Validate: the draft the SME signed has no error.
  // Review m2: the route must answer, so an error page never reads as "no error".
  const got = await call("GET", `/combinations/${fs}`), problems = (got.body?.draft?.problems ?? []) as { level: string }[];
  ok("QA-144 slice 5 fail-guard: the validator itself finds no error on Family sponsorship's draft (nothing simulated)", got.status === 200 && Array.isArray(got.body?.draft?.problems) && problems.filter((p) => p.level === "error").length === 0, { status: got.status, errors: problems.filter((p) => p.level === "error").slice(0, 3) });
  // No regression: the three combinations released before this slice keep their release.
  for (const k of ["vv.single", "sp.outside", "wp.lmia_inside"])
    ok(`QA-144 slice 5 no regression: ${k} keeps its release 1`, n(`select count(*) from config_release c join combination b on b.id = c.combination_id where b.combination_key = '${k}'`) >= 1);

  // Row 7: sections from Family sponsorship's own forms (rules, no AI), approved by a second person.
  ok("QA-144 slice 5 row 7: names Family sponsorship among the combinations set up from their forms", /Family sponsorship › Spouse or common-law partner/.test(r("7").shows), r("7").shows.slice(0, 300));
  ok("QA-144 slice 5 rules pass: every Family sponsorship form edition had its sections drafted by rules (no AI, US$0)", n(`select count(*) from source_attachment a where a.combination_id = '${fs}' and a.kind = 'Form' and not exists (select 1 from drafting_job j join source_attachment b on b.id = j.attachment_id where j.kind = 'masters_edition' and j.mode = 'LOCAL' and j.cost_usd = 0 and b.edition = a.edition)`) === 0
    && n(`select count(*) from drafting_job where kind = 'masters_edition' and mode <> 'LOCAL'`) === 0);
  // IMM 5669's sections come from the numbered headings it prints (main drafted none from it).
  const sec5669 = sql(`select string_agg(distinct p.payload->>'label', ',') from proposal_item p join drafting_job j on j.id = p.run_id join source_attachment a on a.id = j.attachment_id where j.kind = 'masters_edition' and p.kind = 'section' and a.edition like 'IMM 5669 (%' and p.status = 'accepted'`);
  ok("QA-144 slice 5: IMM 5669's sections are the headings it prints (Education, Personal history, Addresses …), accepted by the author", ["Education", "Personal history", "Addresses"].every((x) => sec5669.split(",").includes(x)), sec5669);
  ok("QA-144 slice 5 BR-7: every library item is approved by the Approver, none by the author", n(`select count(*) from library_change where status <> 'APPROVED' and status <> 'RELEASED'`) === 0 && n(`select count(*) from library_change where decided_by = 'user-A'`) === 0);

  // The form lines from IRCC's words (IMM 5533, Guide 5289), as a case reads them.
  const line = (form: string) => sql(`select f.attach_mode || '|' || f.who || '|' || f.channel || '|' || coalesce(f.min_age::text, '') || '|' || coalesce(f.predicate_json::text, '') from combination_form f join gov_form_def g on g.id = f.gov_form_def_id where f.combination_id = '${fs}' and g.form_key = '${form}' and f.status <> 'RETIRED' and f.version = (select max(v.version) from combination_form v where v.combination_id = f.combination_id and v.lineage_key = f.lineage_key)`);
  ok("QA-144 slice 5 rule IMM 1344 and IMM 5532 (IMM 5533 p. 1 and p. 3): the sponsor's, every case", line("IMM 1344").startsWith("COMBINATION_MANDATORY|sponsor|PDF_UPLOAD|") && line("IMM 5532").startsWith("COMBINATION_MANDATORY|sponsor|PDF_UPLOAD|"), [line("IMM 1344"), line("IMM 5532")]);
  ok("QA-144 slice 5 rule IMM 0008 (IMM 5533 p. 2): the principal applicant's, Online", line("IMM 0008").startsWith("COMBINATION_MANDATORY|principal_applicant|ONLINE|"), line("IMM 0008"));
  ok("QA-144 slice 5 rule IMM 5406 and IMM 5669 (IMM 5533 p. 2–3): the principal applicant and family members from 18, Online", ["IMM 5406", "IMM 5669"].every((f) => line(f).startsWith("COMBINATION_MANDATORY|principal_partner_adult_children|ONLINE|18|")), [line("IMM 5406"), line("IMM 5669")]);
  ok("QA-144 slice 5 rule IMM 5604 (IMM 5533 p. 6): each child, only when the child is under 18 and the sponsor is not their other parent", /^ANSWER_CONDITIONAL\|each_dependent_child\|.*"field": "person\.minor_other_parent_not_sponsor".*"value": true/.test(line("IMM 5604")), line("IMM 5604"));
  ok("QA-144 slice 5 rule IMM 5476 and IMM 5475 (IMM 5533 p. 3): only when the case says so", /case\.uses_representative/.test(line("IMM 5476")) && /case\.authorizes_release_to_designated_individual/.test(line("IMM 5475")));
  ok("QA-144 slice 5 fail-guard: no Family sponsorship form is left with its condition in words only, and no temporary resident family form (IMM 5707, IMM 5645) or IMM 5409 is added", n(`select count(*) from combination_form f where f.combination_id = '${fs}' and f.attach_mode = 'ANSWER_CONDITIONAL' and f.predicate_json is null and f.status <> 'RETIRED'`) === 0
    && n(`select count(*) from combination_form f join gov_form_def g on g.id = f.gov_form_def_id where f.combination_id = '${fs}' and g.form_key in ('IMM 5707', 'IMM 5645', 'IMM 5409')`) === 0);

  // IMM 5604's fact (C3.6): in the library, approved by the Approver, asked of each person beside their date of birth.
  const m = "person.minor_other_parent_not_sponsor";
  ok("QA-144 slice 5 IMM 5604's fact: in the library, approved by the Approver (not the author)", n(`select count(*) from library_change where key = '${m}' and decided_by = 'user-B'`) === 1);
  ok("QA-144 slice 5 IMM 5604's fact: asked of each person, by the client, in the section that asks their date of birth", n(`select count(*) from section_question where canonical_field_key = '${m}' and repeats = 'per_person' and collected_from = 'client_questionnaire'`) > 0
    && sql(`select section_key from section_question where canonical_field_key = '${m}' order by version desc limit 1`) === sql(`select section_key from section_question where canonical_field_key = 'person.date_of_birth' order by version desc limit 1`));

  // Document lines cited from IMM 5533 (a release needs one; main had none).
  ok("QA-144 slice 5: three document lines, each cited from IMM 5533 with page and quote", n(`select count(*) from document_requirement where combination_id = '${fs}' and status <> 'RETIRED' and source_quote like 'IMM 5533 (09-2022)%p. %'`) === 3, sql(`select string_agg(left(source_quote, 60), ' | ') from document_requirement where combination_id = '${fs}'`));

  // The rules as a case reads them (Preview): the sponsor files IMM 1344 and IMM 5532; a child of 11 files IMM 5604 only
  // when the fact says so, and never IMM 5406 or IMM 5669 (from 18).
  // Review m2: Preview must answer with its forms; a refused call stops the check instead of passing the fail lines.
  const preview = async (answers: Record<string, unknown>) => {
    const pv = await call("GET", `/combinations/${fs}/preview?people=${encodeURIComponent(JSON.stringify({ child: 1 }))}&answers=${encodeURIComponent(JSON.stringify(answers))}`);
    if (pv.status !== 200 || !Array.isArray(pv.body?.forms) || !pv.body.forms.length) { console.error("STOP  Preview did not answer with forms", pv.status, JSON.stringify(pv.body).slice(0, 300)); process.exit(2); }
    return pv.body.forms as Form[];
  };
  const applies = (fsList: Form[], form: string, person: string) => fsList.some((f) => f.form === form && f.person === person && f.applies === true);
  const yes = await preview({ "principal|person.date_of_birth": "1990-01-01", "child-1|person.date_of_birth": "2015-01-01", [`child-1|${m}`]: true });
  const no = await preview({ "principal|person.date_of_birth": "1990-01-01", "child-1|person.date_of_birth": "2015-01-01", [`child-1|${m}`]: false });
  ok("QA-144 slice 5 preview pass: the sponsor files IMM 1344 and IMM 5532; the principal applicant IMM 0008, IMM 5406 and IMM 5669", applies(yes, "IMM 1344", "sponsor") && applies(yes, "IMM 5532", "sponsor") && ["IMM 0008", "IMM 5406", "IMM 5669"].every((f) => applies(yes, f, "principal")), yes.map((f) => `${f.form}:${f.person}:${f.applies}`));
  ok("QA-144 slice 5 preview pass: a child of 11 whose other parent is not the sponsor files IMM 5604", applies(yes, "IMM 5604", "child-1"), yes.filter((f) => f.person === "child-1").map((f) => `${f.form}:${f.applies}`));
  ok("QA-144 slice 5 preview fail: a child of 11 whose other parent is the sponsor files no IMM 5604, and no child under 18 files IMM 5406 or IMM 5669", !applies(no, "IMM 5604", "child-1") && !applies(yes, "IMM 5406", "child-1") && !applies(yes, "IMM 5669", "child-1"), no.filter((f) => f.person === "child-1").map((f) => `${f.form}:${f.applies}`));

  // K1 (ruling 2): no Family sponsorship PDF form field without a decision; an Online form has no PDF to fill by hand.
  const fsEditions = `select e.id from form_edition e join combination_form f on f.gov_form_def_id = e.gov_form_def_id where f.combination_id = '${fs}' and f.channel <> 'ONLINE' and f.status <> 'RETIRED' and e.channel = 'PDF'`;
  ok("QA-144 slice 5 K1 pass: Family sponsorship's PDF form fields all have a decision (the leftovers of IMM 1344, IMM 5532 and IMM 5604 filled by hand)", n(`select count(*) from form_field_map where form_edition_id in (${fsEditions}) and outcome = 'unresolved' and status <> 'RETIRED'`) === 0
    && n(`select count(*) from form_field_map m join form_edition e on e.id = m.form_edition_id where e.edition_label like 'IMM 5532 (%' and m.outcome = 'by_hand' and m.reason like 'Not proposed by the saved AI answer%'`) >= 229);
  console.log(`${pass}/${pass + fail} passed`);
  process.exitCode = fail ? 1 : 0;
})();
