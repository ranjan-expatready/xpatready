// qa after-merge 1 Nov, second round (main 751cbc42), runtime explore: QA-122. An optional fact the case officer
// confirmed with a problem ("Enter a real date…") is written into the form copy, and the form still counts as ready:
// readiness (engine/runtime/forms.ts) checks required facts only. P-71: a form is blocked by facts "it would write
// wrong". Fails today; passes when an answered optional fact with a problem blocks like a required one.
// Also a pass guard: an optional fact left empty still does not block (P-71 "Optional facts left empty do not").
// Sample data, no model call (US$0).
//   zsh studio/tools/isolated.sh qa_rt 4473 start && tsx --tsconfig studio/api/tsconfig.json studio/tests/runtime/setup_visitor_visa.ts 4473 xr_studio_qa_rt
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/qa/check_qa_am_1101b_api.ts 4473
const PORT = Number(process.argv[2] ?? 4473), OFFICER = "user-O", CLIENT = "user-P";
let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : ` — ${JSON.stringify(d).slice(0, 300)}`}`); };
const call = async (method: string, url: string, body: unknown, actor: string) => {
  const r = await fetch(`http://localhost:${PORT}/api${url}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) as any };
};
type Q = { fact: string; subjectId: string; section: string; required: boolean; hidden: boolean; value_type: string; answer: { id: string; problems: string[]; confirmed: boolean } | null; rows: { answer: { id: string } | null }[]; fills: { form: string; subject: string }[] };
const rows = (await call("GET", "/catalogue?pathway=INDIVIDUAL&filter=all", null, "user-A")).body.rows as { nodeKey: string; combinationId: string }[];
const vv = rows.find((r) => r.nodeKey === "individual.visitors.visitor_visa")?.combinationId;
const made = await call("POST", "/runtime/cases", { combinationId: vv, reference: `QA122-${Date.now().toString(36).slice(-5)}`, clientActor: CLIENT, principal: { displayName: "Client A" } }, OFFICER);
ok("setup: a Visitor visa case opens on its release", made.status === 201, made.status);
const id = made.body.id as string;
const view = async () => (await call("GET", `/runtime/cases/${id}/questionnaire?mode=agent`, null, OFFICER)).body.sections as { section: string; subjectId: string; questions: Q[] }[];
let v = await view();
const opt = v.flatMap((s) => s.questions).find((q) => q.value_type === "date" && !q.required && !q.hidden && q.fills.some((f) => f.form === "IMM 5257"));
ok("setup: the release has an optional date that fills IMM 5257", !!opt, opt?.fact);
const P = opt!.subjectId;
const put = await call("PUT", `/runtime/cases/${id}/answers/${P}/${opt!.fact}`, { value: "tomorrow", expectedId: null }, OFFICER);
ok("the answer is kept, though it fails its check (P-47: never blocked by its checks)", put.status === 200, put.status);
v = await view();
const sec = v.find((s) => s.subjectId === P && s.questions.some((q) => q.fact === opt!.fact))!;
const seen = sec.questions.flatMap((q) => [q.answer?.id, ...q.rows.map((r) => r.answer?.id)]).filter(Boolean);
const conf = await call("POST", `/runtime/cases/${id}/sections/${sec.section}/confirm`, { subjectId: P, seen }, OFFICER);
ok("the case officer confirms the section; the reply counts it as invalid", conf.status === 201 && conf.body.invalid >= 1, conf.body);
v = await view();
const q = v.flatMap((s) => s.questions).find((x) => x.subjectId === P && x.fact === opt!.fact)!;
ok("underneath: the answer is confirmed and still carries its problem", q.answer?.confirmed === true && (q.answer?.problems.length ?? 0) > 0, q.answer);
const forms = (await call("GET", `/runtime/cases/${id}/forms`, null, OFFICER)).body.forms as { form: string; subject_id?: string; subjectId?: string; person: string; readiness: { missing: { fact: string; reason: string }[] } }[];
const f5257 = forms.filter((f) => f.form === "IMM 5257");
const listed = f5257.some((f) => f.readiness.missing.some((m) => m.fact === opt!.fact && m.reason === "needs a fix"));
ok(`QA-122 fail: IMM 5257 is not ready while it would write "tomorrow" into ${opt!.fact} (listed "needs a fix")`, listed, f5257.map((f) => ({ person: f.person, n: f.readiness.missing.length })));
// guard: another optional fact left empty is not listed
const empty = v.flatMap((s) => s.questions).find((x) => x.subjectId === P && !x.required && !x.hidden && !x.answer && x.fills.some((f) => f.form === "IMM 5257"));
ok("QA-122 pass guard: an optional fact left empty does not block (P-71)", !!empty && !f5257.some((f) => f.readiness.missing.some((m) => m.fact === empty.fact)), empty?.fact);
console.log(`\n${pass}/${pass + fail} passed`);
process.exitCode = fail ? 1 : 0;
