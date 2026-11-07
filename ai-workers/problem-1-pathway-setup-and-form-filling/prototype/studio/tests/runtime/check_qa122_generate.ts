// QA-122 (C7.6, P-71, P-72): Generate never writes an invalid value. An optional date the case officer confirmed with a
// problem ("tomorrow") is not written into IMM 5257: its form field comes back "not written" with the problem as the
// reason, and the copy's frozen facts leave it out. Fixed to a real date, the next copy writes it (pass guard). Sample
// data on an isolated copy where setup_visitor_visa.ts released the visitor visa; no model call (US$0).
//   zsh studio/tools/isolated.sh runtime_r1 4430 start && tsx --tsconfig studio/api/tsconfig.json studio/tests/runtime/setup_visitor_visa.ts 4430 xr_studio_runtime_r1
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/runtime/check_qa122_generate.ts 4430 xr_studio_runtime_r1
import { client, recorder } from "./api.ts";

const PORT = Number(process.argv[2] ?? 4430), DB = process.argv[3] ?? "xr_studio_runtime_r1";
const { call, sql, until } = client(PORT, DB);
const { ok, summary } = recorder();
const OFFICER = "user-O", CLIENT = "user-P", run = Date.now().toString(36);
type Q = { fact: string; subjectId: string; section: string; required: boolean; hidden: boolean; value_type: string; shape: { datePrecision: string }; answer: { id: string; problems: string[] } | null; rows: { answer: { id: string } | null }[]; fills: { form: string }[] };

async function main() {
  const vv = sql("select id from combination where combination_key='vv.single'");
  if (!vv) { console.log("Run setup_visitor_visa.ts first."); process.exitCode = 2; return; }
  const made = await call("POST", "/runtime/cases", { combinationId: vv, reference: `QA122G-${run}`, clientActor: CLIENT, principal: { displayName: "Client A" } }, OFFICER);
  ok("setup: a Visitor visa case opens", made.status === 201, made.status);
  const id = made.body.id as string;
  const view = async () => (await call("GET", `/runtime/cases/${id}/questionnaire?mode=agent`, undefined, OFFICER)).body.sections as { section: string; subjectId: string; questions: Q[] }[];
  const all = async () => (await view()).flatMap((s) => s.questions);
  const opt = (await all()).find((q) => q.value_type === "date" && !q.required && !q.hidden && q.fills.some((f) => f.form === "IMM 5257"))!;
  ok("setup: an optional date fills IMM 5257", !!opt, opt?.fact);
  const P = opt.subjectId;
  const answerAndConfirm = async (value: string) => {
    const cur = (await all()).find((q) => q.subjectId === P && q.fact === opt.fact)!;
    const put = await call("PUT", `/runtime/cases/${id}/answers/${P}/${opt.fact}`, { value, expectedId: cur.answer?.id ?? null }, OFFICER);
    const sec = (await view()).find((s) => s.subjectId === P && s.questions.some((q) => q.fact === opt.fact))!;
    const seen = sec.questions.flatMap((q) => [q.answer?.id, ...q.rows.map((r) => r.answer?.id)]).filter(Boolean);
    const conf = await call("POST", `/runtime/cases/${id}/sections/${sec.section}/confirm`, { subjectId: P, seen }, OFFICER);
    return put.status === 200 && conf.status === 201;
  };
  const generate = async (n: number) => {
    const r = await call("POST", `/runtime/cases/${id}/forms/IMM%205257/${P}/generate`, { idempotencyKey: `qa122-${run}-${n}` }, OFFICER);
    const copy = r.body?.id as string;
    const finished = await until(async () => ["GENERATED", "FAILED"].includes((await call("GET", `/runtime/form-copies/${copy}`, undefined, OFFICER)).body?.status));
    const boxes = JSON.parse(sql(`select coalesce(result_json->'boxes','[]')::text from form_instance where id='${copy}'`) || "[]") as { fact: string | null; result: string; why: string | null }[];
    const facts = JSON.parse(sql(`select s.facts_json->'facts' from form_instance f join answer_snapshot s on s.id=f.snapshot_id where f.id='${copy}'`) || "[]") as { fact: string; value: unknown }[];
    return { status: r.status, finished, state: (await call("GET", `/runtime/form-copies/${copy}`, undefined, OFFICER)).body?.status, mine: boxes.filter((b) => b.fact === opt.fact), facts: facts.filter((f) => f.fact === opt.fact) };
  };
  ok("setup: the optional date is answered \"tomorrow\" and its section confirmed", await answerAndConfirm("tomorrow"));
  const bad = await generate(1);
  ok("C7.6 QA-122 fail: a copy is still made (P-71 blocks filing, not generating)", bad.status === 202 && bad.finished && bad.state === "GENERATED", bad);
  ok("C7.6 QA-122 fail: the invalid value is not written: its form fields say \"not written\" with the problem, and the copy's facts leave it out",
    bad.mine.length > 0 && bad.mine.every((b) => b.result === "not written" && /confirmed with a problem, not written: Enter a real date/.test(b.why ?? "")) && bad.facts.length === 0, bad);
  const real = opt.shape?.datePrecision === "month" ? "2020-01" : "2020-01-15";
  ok("setup: the date is fixed to a real one and confirmed again", await answerAndConfirm(real));
  const good = await generate(2);
  ok("C7.6 QA-122 pass: fixed, the next copy writes it", good.state === "GENERATED" && good.mine.some((b) => b.result === "written") && good.facts.some((f) => f.value === real), good);
  process.exitCode = summary() ? 1 : 0; // B160: a red line fails the suite (run-suites.sh judges the exit code; before, it always exited 0)
}
await main();
