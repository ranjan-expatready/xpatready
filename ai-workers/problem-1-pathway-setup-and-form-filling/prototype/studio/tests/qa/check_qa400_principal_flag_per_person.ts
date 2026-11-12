// QA-400 (C6.2, C7.1; walk 0, Bake S5): IMM 5257 SCH1 asks each person "Indicate whether you are: the principal applicant /
// the spouse, common-law partner or dependent child". Its form field is mapped per form subject, but to the library field
// case.subject_is_principal_applicant, which is asked once for the whole application, so one answer is written on every
// person's SCH1 (the spouse's copy says she is the principal applicant). This check fails while a form field that needs
// the form subject's own value reads a field asked once for the application. Fresh configured checkpoint, live AI off, US$0.
//   zsh studio/tools/isolated.sh qa_400 4475 start && tsx --tsconfig studio/api/tsconfig.json studio/tests/qa/check_qa400_principal_flag_per_person.ts 4475 xr_studio_qa_400
import { execFileSync } from "node:child_process";

const PORT = Number(process.argv[2]), DB = process.argv[3];
if (!PORT || !/^xr_studio_(?!demo)/.test(DB ?? "")) { console.error("usage: <port> <isolated database>"); process.exit(2); }
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`); };
const sql = (q: string) => execFileSync("psql", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", "-d", DB, "-Atc", q], { encoding: "utf8" }).trim();

// Set-up: the configured checkpoint, as Demo › Load the configured checkpoint does (scaffolding for the case half, P-33).
const r = await fetch(`http://localhost:${PORT}/api/demo/load`, { method: "POST", headers: { "content-type": "application/json", "x-actor": "user-A" }, body: JSON.stringify({ sample: "configured" }) });
if (r.status >= 300) { console.error("STOP  the configured checkpoint did not load", r.status, (await r.text()).slice(0, 300)); process.exit(2); }

// The library field the latest published version of a form field map reads, with that field's latest published scope.
const rows = (q: string) => sql(q).split("\n").filter(Boolean).map((l) => l.split("|"));
const sch1 = rows(`select m.canonical_field_key, m.person, f.scope from form_field_map m
  join form_edition e on e.id = m.form_edition_id
  join lateral (select scope from canonical_field c where c.canonical_field_key = m.canonical_field_key and c.status = 'PUBLISHED' order by c.version desc limit 1) f on true
  where m.status = 'PUBLISHED' and e.edition_label like 'IMM 5257 SCH1%' and m.data_path like '%PrincipalApplicant%'`);
ok("QA-400 setup: IMM 5257 SCH1's \"Indicate whether you are\" form field is mapped", sch1.length >= 1, sch1);
for (const [key, person, scope] of sch1) {
  ok(`QA-400 (C6.2, C7.1): SCH1's principal-applicant box reads a value of the form's own person, not one answer for the whole application (${key})`,
    !(person === "form_subject" && scope === "CASE_LEVEL"), { key, person, scope });
}
// Report (not counted): every published map that needs the form subject's own value but reads a field asked once per application.
const all = rows(`select distinct e.edition_label, m.canonical_field_key from form_field_map m
  join form_edition e on e.id = m.form_edition_id
  join lateral (select scope from canonical_field c where c.canonical_field_key = m.canonical_field_key and c.status = 'PUBLISHED' order by c.version desc limit 1) f on true
  where m.status = 'PUBLISHED' and m.person = 'form_subject' and f.scope = 'CASE_LEVEL' order by 1, 2`);
console.log(`INFO  per-person form fields reading a once-per-application field: ${all.length}`);
for (const [form, key] of all.slice(0, 30)) console.log(`      ${form} · ${key}`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
