// QA-403 (P-486; C6.2, C7.1): the firm's own facts are the case officer's, never the client's, in plain words, and the
// forms still fill them from the case officer's answers. Pure checks first, each rule a pass and a fail: the data file
// samples/who-fills.json and its reader; the filler's new general steps (p5/transforms.ts); the checkpoint step names no
// fact. Then on an isolated copy with the configured checkpoint loaded: release 1 and the family case as before (rows
// 10-12), the client's questionnaire without the three facts, the case officer's with them in the file's words, the
// client refused when answering one, and IMM 5476 and IMM 5475 read back from the generated files. Made-up people
// (Sample). No model call (US$0).
//   zsh studio/tools/isolated.sh forms_qa403 4459 start && tsx studio/tests/check_qa403_who_fills.ts 4459 xr_studio_forms_qa403
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTransform, wordsInSteps } from "../../p5/transforms.ts";
import { whoFillsFrom, WHO_FILLS_FILE } from "../api/src/features/checkpoint/097-who-fills.ts";
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4459), DB = process.argv[3] ?? "xr_studio_forms_qa403";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const STUDIO = join(import.meta.dirname, "..");
// QA-415 (P-486): the kind of application is no longer the case officer's answer: it is worked out for each person from
// their own filing (tests/check_qa415_application_kind.ts), so two of the firm's facts stay asked of the officer.
const FACTS = ["case.representative_form_action", "case.submission_office_name"];

// (1) The data, read as it is.
const data = whoFillsFrom();
ok("QA-403 pass: the three firm's facts are the case officer's in the data, each with its question, its help and its reason",
  JSON.stringify(data.map((e) => e.fact).sort()) === JSON.stringify([...FACTS].sort()) && data.every((e) => e.fills === "CASE_OFFICER" && e.question.length > 20 && /^Why we ask: /.test(e.help) && /P-486/.test(e.reason)), data.map((e) => e.fact));
ok("QA-403 pass: no question uses the internal words QA-403 named ((values: …), use-of-representative filing)", data.every((e) => !/\(values:|use-of-representative filing|The type of temporary residence application the case is for/.test(`${e.question} ${e.help}`)));

// (2) A changed copy of the data: each bad entry is refused, naming it.
const dir = mkdtempSync(join(tmpdir(), "qa403-"));
const raw = JSON.parse(readFileSync(WHO_FILLS_FILE, "utf8"));
const copy = (change: (d: typeof raw) => void) => { const d = structuredClone(raw); change(d); const f = join(dir, `w${Math.random().toString(36).slice(2)}.json`); writeFileSync(f, JSON.stringify(d)); return f; };
const refusal = (f: string) => { try { whoFillsFrom(f); return ""; } catch (e) { return (e as Error).message; } };
ok("QA-403 pass: a new fact is read from data alone", whoFillsFrom(copy((d) => { d.questions.push({ fact: "case.x_any", fills: "CLIENT", question: "A question?", help: "Why we ask: a reason.", reason: "A reason here." }); })).length === 3);
const fails: [string, (d: typeof raw) => void, RegExp][] = [
  ["a fact given twice", (d) => { d.questions.push(structuredClone(d.questions[0])); }, /case\.representative_form_action: given twice/],
  ["a name the reader does not know", (d) => { d.questions[1].fils = "CLIENT"; }, /case\.submission_office_name: "fils" is not a known name/],
  ["a 'fills' that is neither", (d) => { d.questions[1].fills = "FIRM"; }, /case\.submission_office_name: fills is CLIENT or CASE_OFFICER/],
  ["an empty question", (d) => { d.questions[1].question = " "; }, /case\.submission_office_name: needs its question/],
  ["no help", (d) => { delete d.questions[0].help; }, /case\.representative_form_action: needs its help/],
  ["a fact that is not a library key", (d) => { d.questions[0].fact = "Representative form action"; }, /needs its fact/],
  ["no questions list", (d) => { delete d.questions; }, /needs a "questions" list/],
];
for (const [what, change, words] of fails) { const said = refusal(copy(change)); ok(`QA-403 fail: ${what} is refused, naming it`, words.test(said), said); }

// (3) The filler's new steps (general: any form whose drafted map uses these words), each a pass and a fail. The caller
// (engine/form-values.ts) gives each box its own fact and the words the form's steps name for it (wordsInSteps).
const box = { ui: "checkButton" };
const APPOINT = "derived: 1 if case.representative_form_action = appoint, else 0 (checkbox codes on/off/neutral = 1/0/2 per inventory)";
const CANCEL = "derived: 1 if case.representative_form_action = cancel, else 0 (checkbox codes on/off/neutral = 1/0/2 per inventory)";
const IS_V = "derived:checked_if_application_type_is_visitor:1/0", IS_W = "derived:checked_if_application_type_is_worker:1/0", IS_S = "derived:checked_if_application_type_is_student:1/0", OTHER = "derived:checked_if_application_type_not_visitor_worker_or_student:1/0";
const REP = "case.representative_form_action", APP = "case.application_type";
const wordsOf = (fact: string, steps: string[]) => steps.flatMap((t) => wordsInSteps(t, fact));
const REP_WORDS = wordsOf(REP, [APPOINT, CANCEL]), APP_WORDS = wordsOf(APP, [IS_V, IS_W, IS_S, OTHER]);
const run = (s: string, v: unknown, own: string, words: string[], facts: Record<string, unknown> = {}) => runTransform(s, v, box, { fact: (k: string) => facts[k], ownFact: own, words } as never);
const val = (o: ReturnType<typeof runTransform>) => ("value" in o ? o.value : null);
const why = (o: ReturnType<typeof runTransform>) => ("reason" in o ? String(o.reason) : "");
ok("C7.1 pass: the words each fact can take are read from the form's own steps (appoint, cancel; visitor, worker, student)", REP_WORDS.join() === "appoint,cancel" && [...new Set(APP_WORDS)].sort().join() === "student,visitor,worker", { REP_WORDS, APP_WORDS });
ok("C7.1 pass: IMM 5476's appoint box is ticked (1) when the case officer wrote appoint, in any case; its cancel box is not (0)", val(run(APPOINT, "Appoint", REP, REP_WORDS)) === "1" && val(run(CANCEL, "Appoint", REP, REP_WORDS)) === "0");
ok("C7.1 fail (review M1): a misspelt answer (apoint) ticks neither box silently: both go by hand, naming the words the form takes", "hand" in run(APPOINT, "apoint", REP, REP_WORDS) && "hand" in run(CANCEL, "apoint", REP, REP_WORDS) && /not one of the words this form takes \(appoint, cancel\)/.test(why(run(CANCEL, "apoint", REP, REP_WORDS))));
ok("C7.1 fail: a value that is not one word (a list) is never ticked: by hand, with its reason", /not a single word/.test(why(run(APPOINT, ["appoint"], REP, REP_WORDS))));
ok("C7.1 fail (review m1): a step naming another fact compares that fact only: not answered, by hand (never the box's own value)", /case\.other_fact is not answered/.test(why(run("derived: 1 if case.other_fact = appoint, else 0", "appoint", REP, REP_WORDS))));
ok("C7.1 pass: IMM 5645's application-type ticks: visitor ticks Visitor only; worker ticks Worker only", val(run(IS_V, "Visitor", APP, APP_WORDS)) === "1" && val(run(IS_W, "visitor", APP, APP_WORDS)) === "0" && val(run(OTHER, "visitor", APP, APP_WORDS)) === "0" && val(run(IS_W, "worker", APP, APP_WORDS)) === "1" && val(run(IS_V, "worker", APP, APP_WORDS)) === "0");
ok("C7.1 fail (review M1): a misspelt or unknown type (vistor, trv) never ticks Other by elimination: every tick goes by hand", ["vistor", "trv"].every((x) => [IS_V, IS_W, IS_S, OTHER].every((t) => "hand" in run(t, x, APP, APP_WORDS))));
ok("C7.1 fail (review M1): \"other\" names no tick of the form's steps, so Other goes by hand too (never a guess)", "hand" in run(OTHER, "other", APP, APP_WORDS));
ok("C7.1 fail: a record as the application type is by hand, never ticked", "hand" in run(IS_V, { kind: "visitor" }, APP, APP_WORDS) && "hand" in run(OTHER, { kind: "visitor" }, APP, APP_WORDS));
ok("C7.1 pass (review m3): a name holding \"is\" is read from the box's own fact, never split there", val(run("derived:checked_if_person_is_resident_is_yes:1/0", "yes", "person.person_is_resident", ["yes", "no"])) === "1" && val(run("derived:checked_if_person_is_resident_is_yes:1/0", "no", "person.person_is_resident", ["yes", "no"])) === "0");
ok("C7.1 pass: the yes/no ticks the filler ran before still run the same (checked_if_true, checked_if_false)", val(run("derived:checked_if_true:1/0", true, "case.x", [])) === "1" && val(run("derived:checked_if_false:1/0", true, "case.x", [])) === "0" && "hand" in run("derived:checked_if_true:1/0", "visitor", "case.x", []));
ok("C7.1 pass: as_is with a plain-language note writes the value as it is", val(run("as_is (plain-language application type)", "visitor", APP, [])) === "visitor" && val(run("as_is (plain-language application type text)", "visitor", APP, [])) === "visitor" && val(run("as_is (max 7 chars)", "visitor", APP, [])) === "visitor");
ok("C7.1 fail (review m2): as_is with any other note, or a plain-language note that orders a change, stays not executable (by hand)", ["as_is (uppercase)", "as_is (plain-language, write in uppercase)", "as_is (plain-language application type in uppercase)"].every((t) => /not in the executable set/.test(why(run(t, "visitor", APP, [])))) && "hand" in run("as_is (max 3 chars)", "visitor", APP, []));

// (4) The checkpoint step names no fact and no combination (P-319): the data does.
const step = readFileSync(join(STUDIO, "api/src/features/checkpoint/097-who-fills.ts"), "utf8").replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, "");
ok("QA-403 pass: the checkpoint step's code names no fact, form or combination (only the data does)", !/"(case|person|relationship)\.[a-z_]+"|IMM ?\d{4}|vv\.single|sp\.outside/.test(step));

(async () => {
  // (5) The configured checkpoint, through the screens' services.
  await call("POST", "/demo/reset", { confirm: "RESET" });
  let r = await call("POST", "/demo/load", { sample: "configured" });
  ok("setup: the configured checkpoint loads", r.status === 200 || r.status === 201, typeof r.body === "object" ? r.body?.detail : r.body);
  const rows: { row: string; status: string; shows: string }[] = r.body?.checkpoint ?? [];
  const row = (n: string) => rows.find((x) => x.row === n);
  ok("QA-403 pass: releases and the family case as before: rows 10, 11 and 12 done (the change is approved by a second person, so the Approver still releases, BR-14)", ["10", "11", "12"].every((n) => row(n)?.status === "done"), rows.map((x) => `${x.row}:${x.status}`));
  ok("QA-403 pass: the load says who fills each, in the log", (r.body?.log ?? []).some((l: string) => /who fills \(QA-403.*case officer's, in plain words: .*case\.submission_office_name/.test(l)), (r.body?.log ?? []).filter((l: string) => /who fills/.test(l)));
  ok("QA-403 pass: each change went through To review, proposed by the author and approved by another person, and was released",
    FACTS.every((k) => sql(`select status || '|' || proposed_by || '|' || decided_by from library_change where kind='placement_fills' and key='${k}'`) === "RELEASED|user-A|user-C"), FACTS.map((k) => sql(`select status || '|' || proposed_by || '|' || coalesce(decided_by,'') from library_change where kind='placement_fills' and key='${k}'`)));

  const fam = sql("select id from runtime_case where reference='SAMPLE-VV-FAMILY-1'");
  type Q = { fact: string; label: string; collected_from: string; note?: string | null; answer?: { value?: unknown } | null };
  type V = { sections: { subjectId: string; questions: Q[] }[] };
  const facts = (v: V) => v.sections.flatMap((s) => s.questions);
  const mine = (await call("GET", `/runtime/cases/${fam}/questionnaire`, undefined, "user-P")).body as V;
  ok("QA-403 pass: the client's questionnaire (Client A) asks none of the firm's facts", Array.isArray(mine?.sections) && mine.sections.length > 0 && !facts(mine).some((q) => FACTS.includes(q.fact)), facts(mine ?? { sections: [] }).filter((q) => FACTS.includes(q.fact)).map((q) => q.fact));
  ok("QA-403 fail: no client question uses the internal words QA-403 named", !facts(mine).some((q) => /\(values:|use-of-representative filing/.test(q.label)), facts(mine).filter((q) => /\(values:/.test(q.label)).map((q) => q.label));
  const staff = (await call("GET", `/runtime/cases/${fam}/questionnaire?mode=agent`, undefined, "user-O")).body as V;
  const asked = facts(staff).filter((q) => FACTS.includes(q.fact));
  ok("QA-403 pass: the case officer's view asks both, once each, in the file's own words", asked.length === 2 && asked.every((q) => q.collected_from === "staff_working_view" && q.label === data.find((e) => e.fact === q.fact)!.question), asked.map((q) => [q.fact, q.collected_from, q.label]));
  ok("QA-403 pass: the Sample family's case officer answered appoint (from samples/sample-family-imm5257.json)", asked.find((q) => q.fact === "case.representative_form_action")?.answer?.value === "appoint");
  ok("QA-415 fail: the kind of application is asked of nobody: in neither view (worked out per person from their filing)", !facts(staff).some((q) => /application_type/.test(q.fact)) && !facts(mine).some((q) => /application_type/.test(q.fact)), facts(staff).filter((q) => /application_type/.test(q.fact)).map((q) => q.fact));
  const caseSubject = sql(`select subject_id from case_participant where case_id='${fam}' and role='case'`);
  r = await call("PUT", `/runtime/cases/${fam}/answers/${caseSubject}/case.representative_form_action`, { value: "cancel", expectedId: null }, "user-P");
  ok("QA-403 fail: the client cannot answer it (refused, in words), and the case officer's answer stands", r.status === 403 && /officer/.test(r.body?.detail ?? "") && sql(`select count(*) from client_canonical_answer where subject_id='${caseSubject}' and canonical_field_key='case.representative_form_action' and value_json::text like '%cancel%'`) === "0", r.body);

  // (6) The forms fill them from the case officer's answers: read back from the generated files.
  type F = { form: string; person: string; copies: { id: string; status: string; counts?: { by_hand: number; written: number } }[] };
  const forms = ((await call("GET", `/runtime/cases/${fam}/forms`, undefined, "user-R")).body?.forms ?? []) as F[];
  const copyOf = (form: string) => forms.find((f) => f.form === form && /^Client A/.test(f.person))?.copies?.[0];
  const c5476 = copyOf("IMM 5476"), c5475 = copyOf("IMM 5475");
  ok("C7.1 pass: IMM 5476 and IMM 5475 generated for Client A with nothing by hand", c5476?.status === "GENERATED" && c5476.counts?.by_hand === 0 && c5475?.status === "GENERATED" && c5475.counts?.by_hand === 0, { c5476: c5476?.counts, c5475: c5475?.counts });
  const dl = async (id: string) => { const f = join(dir, `${id}.pdf`); const res = await fetch(`http://127.0.0.1:${PORT}/api/runtime/form-copies/${id}/file`, { headers: { "x-actor": "user-R" } }); writeFileSync(f, Buffer.from(await res.arrayBuffer())); return f; };
  // Read back with the project's own XFA reader (tests/fixtures/read_choice_values.py, p1's xfa_inventory and e5_roundtrip,
  // run by the project's Python as the other copy checks do): every non-empty value of the copy's data, by data path.
  const PY = join(STUDIO, "..", "..", "..", "..", ".tools", "solution-1-prototype", ".venv", "bin", "python"), READER = join(STUDIO, "tests", "fixtures", "read_choice_values.py");
  const readBack = (file: string) => (JSON.parse(execFileSync(PY, ["-I", READER, file], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim().split("\n").pop()!) as { values: Record<string, string> }).values;
  const v5476 = readBack(await dl(c5476!.id)), v5475 = readBack(await dl(c5475!.id));
  const at = (vals: Record<string, string>, tail: string) => Object.entries(vals).find(([k]) => k.endsWith(tail))?.[1];
  ok("C7.1 pass: IMM 5476 read back from its file: appoint ticked, cancel not, the application says Visitor (QA-415: Client A's own filing), no office (a new application)", at(v5476, "Page1[0].appoint[0]") === "1" && at(v5476, "Page1[0].cancel[0]") === "0" && at(v5476, "SectionA[0].application[0]") === "Visitor" && !at(v5476, "SectionA[0].office[0]"), Object.fromEntries(Object.entries(v5476).filter(([k]) => /appoint|cancel|application|office/.test(k))));
  ok("C7.1 pass: IMM 5475 read back from its file (XFA data): the application type says Visitor (QA-415), the office fields empty", at(v5475, "AppDetails[0].TextField2[2]") === "Visitor" && !at(v5475, "AppDetails[0].TextField2[0]") && !at(v5475, "AppDetails[0].TextField2[1]"), Object.fromEntries(Object.entries(v5475).filter(([k]) => /AppDetails/.test(k))));
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
