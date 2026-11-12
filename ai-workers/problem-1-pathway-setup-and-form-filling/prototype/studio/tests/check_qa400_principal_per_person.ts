// QA-400 (Critical, journey; P-485, Lead 20 ruling on #1576): on a family Visitor visa case, the spouse's IMM 5257 SCH1
// said she was the principal applicant. Cause: SCH1's "*Indicate whether you are" read an application-level fact
// (case.subject_is_principal_applicant), stored once, so every person's SCH1 got the same answer, and the client was
// asked it once for the whole application. Fix: `person.is_principal_applicant` is a person's fact, worked out from each
// person's role on the case in knownOf (the C7.7 has_children pattern), never asked; the author's review of the replayed
// SCH1 draft changes the proposed key to it (samples/review-corrections.json, 040-field-map-review.ts).
// This check:
//   A. engine (no server): principalOf gives Yes for the principal only, No for the spouse and every child, nothing for
//      the case; knownOf carries it per person, confirmed and worked out (fail: never Yes for anyone but the principal);
//   B. on the configured checkpoint (loaded here, about 3 minutes; replays only, US$0): the library holds
//      person.is_principal_applicant about a person, and no case.subject_is_principal_applicant; the Visitor visa's released
//      SCH1 map reads it per person (form_subject, yes_no_code:true/false);
//   C. the family case's SCH1 for each person (principal, spouse, child 18 or over) is generated and read back from the PDF
//      with the project's XFA reader (tests/fixtures/read_choice_values.py): principal "true" (The principal applicant),
//      spouse and child "false" (spouse, common-law partner or dependent child 18+). Fail lines: no non-principal reads
//      "true"; the same check catches a planted "true" on the spouse's read-back;
//   D. "Indicate whether you are" is asked nowhere: not in the officer's questionnaire, not in the client's.
//   zsh studio/tools/isolated.sh screens_qa400 4481 start && tsx studio/tests/check_qa400_principal_per_person.ts 4481
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { IS_PRINCIPAL, knownOf, principalOf, type Participant } from "../engine/runtime/case.ts";
import { scopeRefusal, SCOPE_WORDS_REFUSED } from "../engine/field-scope.ts";

const PORT = Number(process.argv[2] ?? 4481);
const STUDIO = join(import.meta.dirname, ".."), ROOT = join(STUDIO, "..", "..", "..", "..");
const PY = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python"), READER = join(STUDIO, "tests", "fixtures", "read_choice_values.py");
const BOX = "Schedule1[0].PrincipalApplicant[0]", SCH1 = "IMM 5257 SCH1", OLD = "case.subject_is_principal_applicant";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
if (PORT === 4400) { console.log("refused: this check loads the configured checkpoint; run it on an isolated copy, never the demo (:4400)"); process.exit(2); }

// A. The engine.
const people: Participant[] = [
  { subjectId: "case", role: "case", label: "Application", applies: true },
  { subjectId: "p", role: "principal", label: "Client A", applies: true },
  { subjectId: "s", role: "spouse_or_partner", label: "Partner", applies: true },
  { subjectId: "c1", role: "child", label: "Child under 18", applies: true },
  { subjectId: "c2", role: "child", label: "Child 18 or over", applies: true },
] as Participant[];
const derived = principalOf(people);
ok("QA-400 A: the principal is the principal applicant (Yes)", derived.get("p") === true);
ok("QA-400 A: the spouse and each child are not (No)", derived.get("s") === false && derived.get("c1") === false && derived.get("c2") === false, [...derived]);
ok("QA-400 A (fail): nobody but the principal is ever Yes; the case itself gets no value", [...derived].filter(([, v]) => v).map(([k]) => k).join() === "p" && !derived.has("case"), [...derived]);
const { known } = knownOf({ canonical_fields: [], placements: [] } as never, people, [], [], new Date("2026-11-11"));
const kv = (id: string) => known.get(`${id}|${IS_PRINCIPAL}`);
ok("QA-400 A: knownOf carries it per person, confirmed and worked out", kv("p")?.value === true && kv("s")?.value === false && kv("c2")?.value === false && kv("p")?.status === "confirmed" && /worked out/.test(String(kv("p")?.source)), [kv("p"), kv("s")]);

// Review m2: the fact stays about each person: Household is refused for it in the person's words (a shared answer
// would put the principal's Yes on every adult's SCH1 again); an ordinary person fact may still be made Household.
const unpublished = { published: false, placements: [], representativeBox: false };
ok("QA-400 A: the fact can never be made a household answer (person-only)", scopeRefusal({ key: IS_PRINCIPAL, ...unpublished }, "household")?.message === SCOPE_WORDS_REFUSED.personOnly);
ok("QA-400 A (fail-guard): an ordinary person fact is not refused the same way", scopeRefusal({ key: "person.occupation_sample", ...unpublished }, "household") === null);

// B-D. The configured checkpoint.
type Res = { status: number; body: any };
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(900_000) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
type Read = { file: string; values: Record<string, string> };
const readCopies = (files: string[]): Read[] => execFileSync(PY, ["-I", READER, ...files], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
/** The SCH1 rule under test: the principal's box reads "true", everyone else's "false". Returns what is wrong. */
const wrong = (rows: { role: string; value: string | undefined }[]) => rows.filter((r) => r.value !== (r.role === "principal" ? "true" : "false")).map((r) => `${r.role}: ${r.value ?? "(empty)"}`);

const tmp = mkdtempSync(join(tmpdir(), "qa400-"));
try {
  const reset = await call("POST", "/demo/reset", { confirm: "RESET" });
  const loaded = await call("POST", "/demo/load", { sample: "configured" });
  ok("setup: the configured checkpoint loads", reset.status < 300 && loaded.status < 300, [reset.status, loaded.status, loaded.body?.detail]);
  const rowFour = (loaded.body?.checkpoint ?? []).find((r: { row: string }) => r.row === "4");
  // QA-415 (P-486): the same review also changes case.application_type to person.application_type on the three drafts
  // that propose it (IMM 5476, IMM 5475, IMM 5645): 1 + 3 = 4 changed.
  ok("QA-400 B: the author's review changes the proposed SCH1 key to another library field (with QA-415's three: 4), and row 4 keeps its one edit and one return (checkpoint row 4)", rowFour?.status === "done" && /\b4 changed to another library field/.test(rowFour?.shows ?? "") && /1 edited, 1 returned with a reason/.test(rowFour?.shows ?? ""), rowFour);

  const fields: { key: string; scope: string; status: string; value_type: string }[] = (await call("GET", "/library/fields")).body ?? [];
  const field = fields.find((f) => f.key === IS_PRINCIPAL);
  ok("QA-400 B: the library holds person.is_principal_applicant, about a person (not the application), Yes/No, published", field?.scope === "CLIENT_LEVEL" && field?.value_type === "yes_no" && field?.status === "PUBLISHED", field);
  ok("QA-400 B (fail): no application-level \"is the principal applicant\" field is in the library", !fields.some((f) => f.key === OLD), fields.filter((f) => /principal/.test(f.key)).map((f) => f.key));

  const openable: { combination: string; combination_id: string }[] = (await call("GET", "/runtime/openable", undefined, "user-O")).body ?? [];
  const vv = openable.find((r) => /Visitor visa/.test(r.combination))?.combination_id;
  const snap = (await call("GET", `/combinations/${vv}/config?mode=published`)).body?.snapshot;
  const entry = (snap?.field_maps ?? []).filter((m: { form_number: string }) => m.form_number === SCH1).flatMap((m: { entries: { data_path: string }[] }) => m.entries).find((e: { data_path: string }) => e.data_path === BOX);
  ok("QA-400 B: the Visitor visa's released SCH1 reads it for the person the form is about (form_subject, yes_no_code:true/false)", entry?.fact === IS_PRINCIPAL && entry?.person === "form_subject" && entry?.transform === "yes_no_code:true/false" && entry?.status === "PUBLISHED", entry);

  // C. Each person's SCH1, generated and read back.
  const cases: { id: string; reference: string }[] = (await call("GET", "/runtime/cases", undefined, "user-O")).body?.cases ?? [];
  const fam = cases.find((c) => /FAMILY/.test(c.reference));
  const view = (await call("GET", `/runtime/cases/${fam?.id}/questionnaire?mode=agent`, undefined, "user-O")).body;
  const roleOf = new Map<string, string>((view?.case?.people ?? []).map((p: { subject_id: string; role: string }) => [p.subject_id, p.role]));
  const forms = async () => ((await call("GET", `/runtime/cases/${fam?.id}/forms`, undefined, "user-O")).body?.forms ?? []).filter((f: { form: string }) => f.form === SCH1) as { subject_id: string; person: string; copies: { id: string; status: string }[] }[];
  const rows = await forms();
  ok("setup: the family case has SCH1 for the principal, the spouse and the child 18 or over", !!fam && rows.length === 3, rows.map((r) => r.person));
  for (const r of rows) await call("POST", `/runtime/cases/${fam!.id}/forms/${encodeURIComponent(SCH1)}/${r.subject_id}/generate`, {}, "user-O");
  let done = await forms();
  for (let i = 0; i < 60 && !done.every((r) => r.copies[0]?.status === "GENERATED"); i++) { await new Promise((w) => setTimeout(w, 1000)); done = await forms(); }
  ok("C: a new SCH1 copy is generated for each of the three people", done.length === 3 && done.every((r) => r.copies[0]?.status === "GENERATED"), done.map((r) => [r.person, r.copies[0]?.status]));
  const files: string[] = [];
  for (const r of done) {
    const res = await fetch(`http://localhost:${PORT}/api/runtime/form-copies/${r.copies[0].id}/file`, { headers: { "x-actor": "user-O" } });
    const f = join(tmp, `${r.subject_id}.pdf`); writeFileSync(f, Buffer.from(await res.arrayBuffer())); files.push(f);
  }
  const read = readCopies(files);
  const got = done.map((r, i) => ({ person: r.person, role: roleOf.get(r.subject_id) ?? "?", value: read[i]?.values?.[BOX] }));
  const principal = got.find((g) => g.role === "principal"), spouse = got.find((g) => g.role === "spouse_or_partner"), child = got.find((g) => g.role === "child");
  ok(`C: the principal's SCH1 reads "true" (The principal applicant) — ${principal?.person}`, principal?.value === "true", principal);
  ok(`C: the spouse's SCH1 reads "false" (spouse, common-law partner or dependent child 18+) — ${spouse?.person}`, spouse?.value === "false", spouse);
  ok(`C: the child's (18 or over) SCH1 reads "false" — ${child?.person}`, child?.value === "false", child);
  ok("C (fail, the bug): no SCH1 of anyone but the principal reads \"true\"", wrong(got).length === 0 && got.filter((g) => g.value === "true").length === 1, got);
  const planted = got.map((g) => (g.role === "spouse_or_partner" ? { ...g, value: "true" } : g));
  ok("C (fail): the same check catches a spouse's SCH1 planted as the principal applicant (QA-400 as reported)", wrong(planted).length === 1 && /spouse_or_partner: true/.test(wrong(planted)[0]), wrong(planted));

  // D. Never asked.
  const asks = (v: { sections?: { title?: string; questions: { fact: string; label: string }[] }[] } | null) => (v?.sections ?? []).flatMap((s) => s.questions.filter((q) => q.fact === IS_PRINCIPAL || q.fact === OLD || /Indicate whether you are/i.test(q.label)).map((q) => `${s.title}: ${q.label}`).concat(/Indicate whether you are/i.test(s.title ?? "") && s.questions.length ? [`section ${s.title}`] : []));
  ok("D: the officer's questionnaire asks nobody whether they are the principal applicant", (view?.sections?.length ?? 0) > 0 && asks(view).length === 0, asks(view));
  const client = (await call("GET", `/runtime/cases/${fam?.id}/questionnaire?mode=sqr`, undefined, "user-P")).body;
  ok("D: the client's questionnaire does not ask it either", (client?.sections?.length ?? 0) > 0 && asks(client).length === 0, asks(client));
} finally { rmSync(tmp, { recursive: true, force: true }); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
