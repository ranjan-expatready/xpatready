// QA-144 slice 4 (B79a; C10.1 step E10): Demo › Load the configured checkpoint on a blank copy sets up Provincial
// nominees › Express Entry stream (pnp.express_entry) from its forms at US$0, through the screens' services only (no SQL
// write, no live AI, no simulated Validate: P-46, P-171, P-172): its forms' sections by the C3.4 rules pass (IMM 5669's
// from the numbered headings it prints), approved by a second person; each form line set by its canada.ca page's words
// (samples/form-setup.json, Sample, Unconfirmed: expert); every form field no saved answer proposed filled by hand. So
// Submit no longer refuses it for a form field with no decision or a fact nobody is asked (219 such refusals on main
// 86b721eac). The other three releases stay (no regression). On main the same load leaves those refusals, so this check
// fails there.
//   zsh studio/tools/isolated.sh forms_ee 4451 start && tsx studio/tests/check_qa144_ee_release.ts 4451 xr_studio_forms_ee
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { LEDGER_DIR } from "../../p2/policy.ts";

const PORT = Number(process.argv[2] ?? 4451), DB = process.argv[3] ?? "xr_studio_forms_ee";
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
const EE = "Provincial nominees › Express Entry stream";

(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  ok("QA-144 slice 4: the copy starts blank", n(`select count(*) from combination`) === 0 && n(`select count(*) from logical_section`) === 0);
  const before = ledger(), validatedBefore = n(`select count(*) from validated_copy`);
  const l = await call("POST", "/demo/load", { sample: "configured" });
  if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.body); process.exit(2); }
  const rows = l.body.checkpoint as Row[], r = (id: string) => rows.find((x) => x.row === id)!;
  const ee = sql(`select id from combination where combination_key = 'pnp.express_entry'`);
  console.log(`      loaded in ${l.body.seconds.toFixed(1)} s; released ${JSON.stringify(l.body.released)}`);

  // The Done-when: Submit refuses Express Entry for no form field without a decision and no fact nobody is asked.
  const released = (l.body.released as string[]).some((x) => x.startsWith(EE));
  const probe = released ? null : await call("POST", `/combinations/${ee}/submit`, { note: "QA-144 slice 4 check: what Submit still says" });
  const errors = ((probe?.body?.errors ?? []) as { where: string; message: string }[]);
  const k1 = errors.filter((e) => /form fields? ha(s|ve) no decision/.test(e.message)), unasked = errors.filter((e) => /nobody is asked for it/.test(e.message));
  ok("QA-144 slice 4 pass: Submit refuses Express Entry for no form field without a decision (K1) and no fact nobody is asked", released || (probe!.status === 400 && k1.length === 0 && unasked.length === 0),
    { released, status: probe?.status, k1: k1.map((e) => e.message.slice(0, 120)), unasked: unasked.length, first: unasked[0]?.message.slice(0, 160) });
  // What may still refuse it (question for the tech lead on the PR): IMM 0008 DEP prints no "Unknown" marital status, a
  // value the shared list has (IMM 0008 prints it, code 00); no code can be given without inventing one.
  ok("QA-144 slice 4: Express Entry is released, or its only refusal is IMM 0008 DEP's missing \"unknown\" marital status code (named, for a ruling)", released || (errors.length === 1 && /^IMM 0008 DEP \(10-2024\): .*marital status \(person\.marital_status\): no code for "unknown"/.test(errors[0].message)), errors.map((e) => e.message.slice(0, 160)));
  ok("QA-144 slice 4 fail: Express Entry's form editions keep no form field without a decision", n(`select count(*) from form_field_map m join form_edition e on e.id = m.form_edition_id join combination_form f on f.gov_form_def_id = e.gov_form_def_id where f.combination_id = '${ee}' and f.status <> 'RETIRED' and e.channel = 'PDF' and m.outcome = 'unresolved' and m.status = 'DRAFT'`) === 0);
  ok("QA-144 slice 4 fail-guard: no live AI call, nothing spent (US$0), and no validated copy made (no simulated Validate)", n(`select count(*) from drafting_job where mode = 'LIVE'`) === 0 && ledger() === before && l.body.cost_usd === 0 && n(`select count(*) from validated_copy`) === validatedBefore);
  ok("QA-144 slice 4 no regression: the Visitor visa, the Study permit and With an LMIA are still released", ["Visitors › Visitor visa", "Study permits › Study permit › Outside Canada", "Work permits › Employer-specific work permit › With an LMIA – inside Canada"].every((x) => (l.body.released as string[]).includes(x)), l.body.released);
  ok("QA-144 slice 4 row 7: names Express Entry among the combinations set up from their forms", /sections drafted from .*Provincial nominees › Express Entry stream.*approved by the Approver/.test(r("7").shows), r("7").shows.slice(0, 300));

  // IMM 5669's sections from the numbered headings it prints (rules, no AI), approved by the Approver, and its facts asked there.
  const job = `select j.id from drafting_job j join source_attachment a on a.id = j.attachment_id where j.kind = 'masters_edition' and j.mode = 'LOCAL' and j.cost_usd = 0 and a.edition = 'IMM 5669 (05-2021)'`;
  const labels = sql(`select string_agg(payload->>'label', '|' order by created_at) from proposal_item where run_id in (${job}) and kind = 'section'`).split("|");
  ok("QA-144 slice 4 rules pass: IMM 5669's sections are drafted by rules from its printed headings (Education, Personal history, Addresses, …)", ["Education", "Personal history", "Membership of association with organizations", "Government positions", "Military and/or paramilitary service", "Addresses"].every((h) => labels.includes(h)), labels);
  ok("QA-144 slice 4 rules pass: each is accepted by the author and its library item approved by the Approver", n(`select count(*) from proposal_item where run_id in (${job}) and kind = 'section' and status = 'waiting'`) === 0
    && n(`select count(*) from library_change where status not in ('APPROVED', 'RELEASED')`) === 0 && n(`select count(*) from library_change where decided_by = 'user-A'`) === 0);
  const sectionOf = (fact: string) => sql(`select s.title from section_question q join logical_section s on s.section_key = q.section_key where q.canonical_field_key = '${fact}' and q.status <> 'RETIRED' order by q.version desc, s.version desc limit 1`);
  ok("QA-144 slice 4 placement: IMM 5669's facts are asked in its sections: an activity in \"Personal history\", an address's street in \"Addresses\", military ranks in \"Military and/or paramilitary service\"",
    sectionOf("person.activity_description") === "Personal history" && sectionOf("person.residence_street_and_number") === "Addresses" && sectionOf("person.military_service_ranks") === "Military and/or paramilitary service",
    [sectionOf("person.activity_description"), sectionOf("person.residence_street_and_number"), sectionOf("person.military_service_ranks")]);
  // The form lines from IRCC's words (samples/form-setup.json), as rules a case reads.
  const line = (form: string) => sql(`select f.attach_mode || '|' || coalesce(f.min_age::text, '') || '|' || coalesce(f.who, '') || '|' || coalesce(f.predicate_json::text, '') from combination_form f join gov_form_def g on g.id = f.gov_form_def_id where f.combination_id = '${ee}' and g.form_key = '${form}' and f.status <> 'RETIRED' order by f.version desc limit 1`);
  ok("QA-144 slice 4 rule IMM 0008 (its canada.ca page): the principal applicant's", line("IMM 0008").startsWith("COMBINATION_MANDATORY||principal_applicant|"), line("IMM 0008"));
  ok("QA-144 slice 4 rule IMM 5669 and IMM 5406: the principal, a spouse or partner, and each child 18 or older", ["IMM 5669", "IMM 5406"].every((f) => line(f).startsWith("COMBINATION_MANDATORY|18|principal_partner_adult_children|")), [line("IMM 5669"), line("IMM 5406")]);
  ok("QA-144 slice 4 rule IMM 5562: the principal applicant's (who completes every person's sections)", line("IMM 5562").startsWith("COMBINATION_MANDATORY||principal_applicant|"), line("IMM 5562"));
  ok("QA-144 slice 4 rule IMM 5476: only when the application uses a representative", /^ANSWER_CONDITIONAL\|\|.*case\.uses_representative/.test(line("IMM 5476")), line("IMM 5476"));
  ok("QA-144 slice 4 fail: no temporary-residence family form is added to Express Entry (its own is IMM 5406)", n(`select count(*) from combination_form f join gov_form_def g on g.id = f.gov_form_def_id where f.combination_id = '${ee}' and g.form_key in ('IMM 5707', 'IMM 5645')`) === 0);

  // The rules as a case reads them (Preview): a principal, a spouse, a child of 19 and a child of 10, no representative.
  const preview = async (answers: Record<string, unknown>) => (await call("GET", `/combinations/${ee}/preview?people=${encodeURIComponent(JSON.stringify({ spouse_or_partner: 1, child: 2 }))}&answers=${encodeURIComponent(JSON.stringify(answers))}`)).body as { forms?: Form[] } | null;
  const family = { "principal|person.date_of_birth": "1985-01-01", "spouse_or_partner|person.date_of_birth": "1986-01-01", "child-1|person.date_of_birth": "2007-01-01", "child-2|person.date_of_birth": "2016-01-01" };
  const pv = await preview({ ...family, "case|case.uses_representative": false });
  const applies = (p: typeof pv, form: string, who: string) => (p?.forms ?? []).find((f) => f.form === form && f.person === who)?.applies === true;
  ok("QA-144 slice 4 preview pass: IMM 5669 for the principal, the spouse and the child of 19", ["principal", "spouse_or_partner", "child-1"].every((w) => applies(pv, "IMM 5669", w)), (pv?.forms ?? []).filter((f) => f.form === "IMM 5669").map((f) => `${f.person}:${f.applies}`));
  ok("QA-144 slice 4 preview fail: not for the child of 10", !applies(pv, "IMM 5669", "child-2") && !applies(pv, "IMM 5406", "child-2"));
  ok("QA-144 slice 4 preview: IMM 0008 and IMM 5562 for the principal only", applies(pv, "IMM 0008", "principal") && applies(pv, "IMM 5562", "principal") && !applies(pv, "IMM 5562", "spouse_or_partner"));
  ok("QA-144 slice 4 preview fail: no IMM 5476 without a representative", !(pv?.forms ?? []).some((f) => f.form === "IMM 5476" && f.applies === true), (pv?.forms ?? []).filter((f) => f.form === "IMM 5476").map((f) => `${f.person}:${f.applies}`));
  const rep = await preview({ ...family, "case|case.uses_representative": true });
  ok("QA-144 slice 4 preview pass: IMM 5476 once the application uses a representative", (rep?.forms ?? []).some((f) => f.form === "IMM 5476" && f.applies === true), (rep?.forms ?? []).filter((f) => f.form === "IMM 5476").map((f) => `${f.person}:${f.applies}`));
  console.log(`${pass}/${pass + fail} passed`);
  process.exitCode = fail ? 1 : 0;
})();
