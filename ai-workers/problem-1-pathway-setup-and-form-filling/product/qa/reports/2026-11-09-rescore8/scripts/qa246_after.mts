// qa's own retest of QA-246 (9 Nov, main fc49dc5a4): GET …/forms against /prepare, before any answer, as each rule is answered
// either way, and after everything is answered. Written by qa from the bug's row, not from the builder's check. US$0, no model call.
// Args: <port> <db>
const L = await import(process.env.LIB!);
const { call, sql, ok, main, OFFICER } = L;
type F = { person: string; form: string; subject_id: string; applies?: boolean; readiness?: { missing?: unknown[] } };
await main("QA-246 retest (qa)", "forms list against Prepare application", async () => {
  const vv = L.needVisitorVisa();
  const c = await L.openCase(vv, L.FAMILY);
  const names = Object.keys(c.subjects);
  const forms = async () => { const r = await call("GET", `/runtime/cases/${c.id}/forms`, undefined, OFFICER); return { status: r.status, body: r.body, list: (r.body?.forms ?? []) as F[] }; };
  const of = (l: F[], n: string) => [...new Set(l.filter((f) => f.subject_id === c.subjects[n]).map((f) => f.form))].sort();
  const prep = async (n: string) => { const p = (await L.prepare(c.id, OFFICER)).p; return [...new Set((L.itemsOf(p, c.subjects[n]) as { form?: string }[]).map((i) => i.form).filter(Boolean))].sort() as string[]; };
  const snapshot = async (label: string) => {
    const f = await forms();
    const row: Record<string, { forms: string[]; prepare: string[]; missing: string[] }> = {};
    for (const n of names) row[n] = { forms: of(f.list, n), prepare: await prep(n), missing: f.list.filter((x) => x.subject_id === c.subjects[n]).map((x) => `${x.form}:${x.readiness?.missing?.length ?? "?"}`) };
    console.log(`SNAP ${label} ` + JSON.stringify({ status: f.status, keys: Object.keys(f.body ?? {}), row }));
    return row;
  };
  const rel = sql(`select config_release_id from pack_work_pin where case_id='${c.id}' order by revision desc limit 1`);
  const conds = JSON.parse(sql(`select coalesce(json_agg(json_build_object('form', x->>'form_number', 'cond', x->'condition')), '[]') from config_release, jsonb_array_elements(snapshot->'forms') x where id='${rel}'`) ?? "[]") as { form: string; cond: { op?: string; field?: string; value?: unknown; subjectKind?: string } | null }[];
  console.log("CONDITIONS " + JSON.stringify(conds));
  const WAIT = ["IMM 5409", "IMM 5475", "IRM 0002"];

  // 1. Before any answer.
  const before = await snapshot("before-any-answer");
  const adults = names.filter((n) => !/Child/.test(n)), kids = names.filter((n) => /Child/.test(n));
  ok("before any answer no one is listed IMM 5409, IMM 5475 or IRM 0002", names.every((n) => !before[n].forms.some((x) => WAIT.includes(x))), before);
  ok("before any answer each adult is listed 4 forms and each child 1 (the bug's expected numbers)", adults.every((n) => before[n].forms.length === 4) && kids.every((n) => before[n].forms.length === 1), Object.fromEntries(names.map((n) => [n, before[n].forms])));
  ok("before any answer the forms list and Prepare application name the same forms for each person", names.every((n) => JSON.stringify(before[n].forms) === JSON.stringify(before[n].prepare)), before);

  // 2. Each waiting form's rule, answered so it applies and then so it does not (the builder's check answers one way only).
  const P = "Sample Client A";
  for (const form of WAIT) {
    const cond = conds.find((x) => x.form === form)?.cond;
    if (!cond?.field || cond.op !== "eq") { console.log(`SKIP ${form}: condition is ` + JSON.stringify(cond)); continue; }
    const subject = cond.subjectKind === "CASE" ? c.caseSubject : c.subjects[P];
    const yes = await L.answer(c.id, subject, cond.field, cond.value, OFFICER);
    let f = await forms();
    const listedYes = names.filter((n) => of(f.list, n).includes(form));
    console.log(`RULE ${form} ${cond.field}=${JSON.stringify(cond.value)}: answer ${yes.status}, listed for ${JSON.stringify(listedYes)}; prepare for ${P}: ${JSON.stringify(await prep(P))}`);
    ok(`${form}: once its rule says it applies it is listed, and Prepare application agrees`, yes.status === 200 && listedYes.includes(P) && (await prep(P)).includes(form), { put: yes.status, listedYes });
    if (cond.subjectKind !== "CASE") ok(`${form}: a per-person rule lists it for that person only`, listedYes.length === 1, listedYes);
    let otherStatus = 0, other: unknown = null;
    const tries: unknown[] = typeof cond.value === "boolean" ? [!cond.value] : ["single", "married", "SINGLE", "MARRIED", "female", "male", "F", "M"].filter((v) => v !== cond.value);
    for (const v of tries) { const r = await L.answer(c.id, subject, cond.field, v, OFFICER); if (r.status === 200) { otherStatus = 200; other = v; break; } else otherStatus = r.status; }
    f = await forms();
    const listedNo = names.filter((n) => of(f.list, n).includes(form));
    console.log(`RULE ${form} ${cond.field}=${JSON.stringify(other)}: answer ${otherStatus}, listed for ${JSON.stringify(listedNo)}`);
    ok(`${form}: when the answer changes so it does not apply it leaves the list again`, otherStatus === 200 && !listedNo.includes(P), { other, otherStatus, listedNo });
  }

  // 3. After everything is answered and confirmed.
  const filled = await L.fillEverything(c.id);
  const after = await snapshot("after-everything");
  ok("after everything is answered the forms list and Prepare application still name the same forms for each person", filled && names.every((n) => JSON.stringify(after[n].forms) === JSON.stringify(after[n].prepare)), after);
});
