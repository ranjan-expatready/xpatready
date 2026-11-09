// qa lane, QA-165 re-test (8 Nov): a new Visitor visa case on the checkpoint, every required question answered and confirmed
// by the pack helper (fillEverything), then the principal's IMM 5257 copy generated through the API. Writes the copy's path,
// its filler report and the principal's questions near the three Yes/No boxes to OUT for the Python reader. US$0.
import { writeFileSync } from "node:fs";
const L = await import(process.env.LIB!);
const { call, fillEverything, needVisitorVisa, openCase, agent, until, sql, yearsAgo, OFFICER } = L;
const vv = needVisitorVisa();
const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) }]);
const P = c.subjects["Sample Client A"];
// run 2: the three Yes/No facts answered No first, by the client, as a person with none of them would
const { answer, confirmAll, CLIENT } = L;
const qsOf = async () => ((await agent(c.id))?.sections ?? []).flatMap((s: any) => (s.questions ?? []).map((q: any) => ({ ...q, section: s.title })));
for (const f of ["person.has_used_other_name", "person.has_national_id", "person.us_permanent_resident"]) { const r = await answer(c.id, P, f, false, CLIENT); console.log("answer No", f, r.status, JSON.stringify(r.body?.detail ?? r.body?.answer?.problems ?? "").slice(0, 200)); }
const dep = (await qsOf()).filter((q: any) => q.subjectId === P && /other_name|otherwise_used|national_id_|us_green_card/.test(q.fact));
console.log("after the three No answers, their follow-up questions:", JSON.stringify(dep.map((q: any) => ({ fact: q.fact, required: q.required, hidden: q.hidden, answer: q.answer?.value ?? null }))));
const filled = await fillEverything(c.id);
// choice lists the helper answered "SAMPLE": answer the list's first option instead, then confirm again
let fixed = 0;
for (const q of (await qsOf()).filter((q: any) => q.subjectId === P && (q.options ?? []).length && q.answer && !(q.options ?? []).some((o: any) => o.key === q.answer.value))) {
  const r = await answer(c.id, P, q.fact, q.options[0].key); if (r.status < 300) fixed++; else console.log("option answer refused", q.fact, r.status);
}
await confirmAll(c.id, P);
console.log("choice-list answers replaced with a listed option:", fixed);
const forms = (await call("GET", `/runtime/cases/${c.id}/forms`, undefined, OFFICER)).body?.forms ?? [];
const f0 = forms.find((f: any) => f.form === "IMM 5257" && f.subject_id === P);
console.log("fillEverything ready:", filled, "| IMM 5257 (principal) readiness:", JSON.stringify({ ready: f0?.readiness?.ready, missing: (f0?.readiness?.missing ?? []).length }));
const g = await call("POST", `/runtime/cases/${c.id}/forms/IMM%205257/${P}/generate`, { idempotencyKey: `qa165-${Date.now()}` }, OFFICER);
const copyId = g.body?.copy?.id ?? g.body?.id ?? sql(`select id from form_instance where case_id='${c.id}' and subject_id='${P}' order by created_at desc limit 1`);
await until(async () => ["GENERATED", "FAILED"].includes((await call("GET", `/runtime/form-copies/${copyId}`, undefined, OFFICER)).body?.status), 90_000);
const copy = (await call("GET", `/runtime/form-copies/${copyId}`, undefined, OFFICER)).body;
console.log("generate:", g.status, "| copy status:", copy?.status, "| counts:", JSON.stringify(copy?.counts));
const keys = Object.keys(copy ?? {}); console.log("copy fields:", keys.join(","));
for (const k of keys) if (/empty|missing|mandatory|required|not_written|unfilled|adobe/i.test(k)) console.log(`copy.${k}:`, JSON.stringify(copy[k]).slice(0, 1500));
const path = sql(`select path from form_instance where id='${copyId}'`);
const result = sql(`select result_json from form_instance where id='${copyId}'`);
// the principal's questions near the three Yes/No boxes QA-165 named (other names, national ID, US PR card)
const v = await agent(c.id);
const qs = (v?.sections ?? []).flatMap((s: any) => (s.questions ?? []).map((q: any) => ({ ...q, section: s.title, about: s.about_label })));
const near = qs.filter((q: any) => q.subjectId === P && /other_name|otherwise_used|alias|national_id|us_permanent|green_card/i.test(q.fact));
console.log("principal questions near the 3 Yes/No boxes:", JSON.stringify(near.map((q: any) => ({ fact: q.fact, section: q.section, required: q.required, hidden: q.hidden, answer: q.answer?.value ?? null, confirmed: q.answer?.confirmed ?? null }))));
writeFileSync(process.env.OUT!, JSON.stringify({ case: c.id, copy: copyId, path, result: result ? JSON.parse(result) : null }));
