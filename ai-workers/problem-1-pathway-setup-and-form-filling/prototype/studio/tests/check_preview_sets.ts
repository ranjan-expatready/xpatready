// M2 queue item 4, Preview by person and by channel (runtime lane; C4.3, C4.6; plan.md "Preview by person and by
// channel"; Lead answers Q1–Q3, 29 Oct): per person, the three sets (PQR, what the client is asked once documents fill
// theirs, the case officer's view with each answer's source) with one question count, and the forms grouped by how each
// is filed. A passing and a failing case per rule: the engine on the sample's own snapshot (changed copies for the
// rules the sample does not exercise), and the API on an isolated copy with the sample loaded. Rules only: US$0.
//   zsh studio/tools/isolated.sh runtime_pv 4436 start && tsx studio/tests/check_preview_sets.ts 4436 xr_studio_runtime_pv
import { execFileSync } from "node:child_process";
import { previewFamily } from "../engine/runtime/preview.ts";
import { caseView } from "../engine/runtime/case.ts";
import { familyPeople } from "../engine/runtime/preview.ts";
import { factSources } from "../engine/sources.ts";
import { OUTPUT_GROUPS } from "../contracts/workspace.ts";

const PORT = Number(process.argv[2] ?? 4436), DB = process.argv[3] ?? "xr_studio_runtime_pv";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
// A system key: a field key ("person.date_of_birth") or a document or form key ("passport_or_travel…"); "e.g." is words.
const KEYS = /\b(person|case|organisation|representative|relationship)\.[a-z_]+\b|\b[a-z]+_[a-z_]+\b/;
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", {});
  if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); }
  const wp = sql(`select id from combination where combination_key='wp.family'`);
  const pv = async (q = "") => (await call("GET", `/combinations/${wp}/workspace?tab=preview${q}`)).body.preview;

  // ======================================================== C4.3: three sets, one count
  const Q = (await call("GET", `/combinations/${wp}/workspace?tab=questionnaires`)).body.questionnaire;
  const chipOf = new Map((Q.roles as any[]).map((r) => [r.role, r.questions]));
  const P0 = await pv();
  const firstOf = new Map<string, string>(); for (const x of P0.people) if (!firstOf.has(x.role)) firstOf.set(x.role, x.subjectId);
  const views = new Map<string, any>(); for (const id of P0.people.map((x: any) => x.subjectId)) views.set(id, await pv(`&person=${id}`));
  ok("C4.3 pass: every person's preview has the three sets (pre-qualification, what the client is asked, the case officer's view)", [...views.values()].every((v) => Array.isArray(v.sets?.pqr) && typeof v.sets?.sqr?.asked === "number" && Array.isArray(v.sets?.agent?.sections)), [...views.keys()]);
  const same = [...firstOf].map(([role, id]) => ({ role, chip: chipOf.get(role), agent: views.get(id).sets.agent.questions, person: P0.people.find((x: any) => x.subjectId === id).questions }));
  ok("C4.3 one count (journey item 8) pass: each person's question count equals their chip on the Questionnaires tab, on the person chip and in the case officer's view", same.length >= 4 && same.every((x) => x.chip === x.agent && x.agent === x.person), same);
  ok("C4.3 one count fail-guard: the client is asked no more than that count, and the person chip's second number is what the client is asked", P0.people.every((x: any) => x.asked <= x.questions && views.get(x.subjectId).sets.sqr.asked === x.asked), P0.people.map((x: any) => `${x.subjectId}:${x.questions}/${x.asked}`));
  const agentRows = [...views.values()].flatMap((v) => v.sets.agent.sections.flatMap((s: any) => s.questions));
  ok("C4.3 pass: each answer in the case officer's view says where it comes from, in words (Client, Case officer, Document · its name)", agentRows.length > 0 && agentRows.every((q: any) => /^(Client|Case officer|Document · .+)$/.test(q.from)), [...new Set(agentRows.map((q: any) => q.from))]);
  ok("C4.3 fail: no system key on the sets (no field key, no document key)", agentRows.every((q: any) => !KEYS.test(q.from) && !KEYS.test(q.label)) && [...views.values()].every((v) => v.sets.sqr.fromDocuments.every((d: any) => !KEYS.test(d.document)) && v.sets.pqr.every((x: any) => !KEYS.test(x.from))), agentRows.find((q: any) => KEYS.test(q.from) || KEYS.test(q.label)));
  const pr = views.get("principal");
  const pass1 = pr.sets.sqr.fromDocuments.find((d: any) => /Passport/.test(d.document));
  ok("C4.3 Q1 pass: the information line says what the principal's documents fill (\"Passport … fills n answers\")", !!pass1 && pass1.facts.length >= 5, pr.sets.sqr.fromDocuments.map((d: any) => `${d.document}: ${d.facts.length}`));
  const childV = views.get(firstOf.get("child")!);
  ok("C4.3 Q1 fail: a document asked only in some cases (Cannot tell yet) fills nothing yet (the child's birth certificate)", !childV.sets.sqr.fromDocuments.some((d: any) => /Birth certificate/.test(d.document)), childV.sets.sqr.fromDocuments);

  // ======================================================== C4.3 PQR
  ok("C4.3 PQR fail: with nothing ticked (Load sample), no person's pre-qualification set lists a question", [...views.values()].every((v) => v.sets.pqr.length === 0), [...views.values()].map((v) => v.sets.pqr.length));
  const L = (await call("GET", `/combinations/${wp}/fact-sources`)).body;
  const spouseFact = (L.facts as any[]).find((f) => f.role === "spouse_or_partner" && f.source === "CLIENT" && f.placed && !f.prequalification);
  const t = await call("PUT", `/combinations/${wp}/fact-sources/spouse_or_partner/${encodeURIComponent(spouseFact.fact)}`, { prequalification: true, reason: "Sample: preview test", version: spouseFact.version });
  const afterTick = await pv(`&person=spouse`), prAfter = await pv(`&person=principal`);
  ok("C4.3 PQR pass: a draft tick for the spouse shows in the spouse's pre-qualification set, with where it comes from", t.status === 200 && afterTick.sets.pqr.some((x: any) => x.fact === spouseFact.fact && x.from === "Client"), { status: t.status, pqr: afterTick.sets.pqr });
  ok("C4.3 PQR fail: the spouse's tick is not in the principal's set", prAfter.sets.pqr.length === pr.sets.pqr.length && !prAfter.sets.pqr.some((x: any) => x.fact === spouseFact.fact), prAfter.sets.pqr.map((x: any) => x.fact));
  ok("C4.3 PQR fail: the prospect is shown no verdict (the set holds questions only: fact, label, where it comes from)", afterTick.sets.pqr.every((x: any) => Object.keys(x).sort().join() === "fact,from,label"));

  // ======================================================== the engine on changed copies of the sample
  const S = (await call("GET", `/combinations/${wp}/config?mode=draft`)).body.snapshot;
  const docTypes = S.document_types as any[];
  const passport = docTypes.find((d) => (d.supplies_facts ?? []).includes("person.passport_number"));
  // A client fact of the principal that the passport does not supply yet.
  const base = previewFamily(S, "", "principal", {});
  const clientQ = base.questionnaire.sections.filter((x: any) => x.subjectId === "principal").flatMap((x: any) => x.questions).find((q: any) => !(passport.supplies_facts ?? []).includes(q.fact) && !q.group);
  const S1 = clone(S); S1.document_types.find((d: any) => d.key === passport.key).supplies_facts.push(clientQ.fact);
  const v1 = previewFamily(S1, "", "principal", {});
  const asked = (v: any, fact: string) => v.questionnaire.sections.filter((x: any) => x.subjectId === "principal").some((x: any) => x.questions.some((q: any) => q.fact === fact));
  ok("C4.3 Q2 pass (P-130): a client question a needed document supplies is not asked in the client view, and the line names it under that document", asked(base, clientQ.fact) && !asked(v1, clientQ.fact) && v1.sets.sqr.fromDocuments.some((d: any) => d.document === passport.name && d.facts.includes(clientQ.label)) && v1.sets.sqr.asked === base.sets.sqr.asked - 1, { fact: clientQ.fact, before: base.sets.sqr.asked, after: v1.sets.sqr.asked });
  ok("C4.3 one count: the case officer's view still counts it (the document fills it, the question stays the fallback)", v1.sets.agent.questions === base.sets.agent.questions, [base.sets.agent.questions, v1.sets.agent.questions]);
  const S2 = clone(S1); S2.document_requirements = S2.document_requirements.filter((r: any) => !(r.document_type_key === passport.key || r.document_type === passport.name));
  const v2 = previewFamily(S2, "", "principal", {});
  ok("C4.3 Q2 fail (P-130 fallback): with the passport line removed from the checklist, the same question is asked again", asked(v2, clientQ.fact) && !v2.sets.sqr.fromDocuments.some((d: any) => d.document === passport.name), v2.sets.sqr.fromDocuments.map((d: any) => d.document));
  const people = familyPeople(S1.combination.participants, base.family);
  const plain = caseView(S1, people, [], [], "sqr");
  const plainAsks = plain.sections.filter((x: any) => x.subjectId === "principal").some((x: any) => x.questions.some((q: any) => q.fact === clientQ.fact));
  ok("C4.3 Q2 fail-guard: only Preview sets the option; a case's view without it still asks the question and has no document line", plainAsks && plain.from_documents === undefined);
  const skip = caseView(S1, people, [], [], "sqr", new Date(), [], { skipDocumentFacts: (id: string, f: string) => (id === "principal" && f === clientQ.fact ? passport.name : null) });
  ok("C4.3 Q2: the renderer option lists what it skipped, per person and document", (skip.from_documents ?? []).some((d) => d.subjectId === "principal" && d.document === passport.name && d.facts.includes(clientQ.label)) && skip.summary.questions === plain.summary.questions - 1, skip.from_documents);
  const officerFact = factSources(S).find((f) => f.role === "principal" && f.source === "AGENT" && f.placed)!;
  const S3 = clone(S); S3.fact_sources = [...(S3.fact_sources ?? []), { role: "principal", fact: officerFact.fact, source: null, document_type: null, prequalification: true, reason: null, origin: "HUMAN" }];
  ok("C4.3 PQR fail: a case officer's fact is never in the prospect's set, even when ticked", !previewFamily(S3, "", "principal", {}).sets.pqr.some((x: any) => x.fact === officerFact.fact), officerFact.fact);

  // ======================================================== C4.6 outputs per channel
  const groups = new Set(OUTPUT_GROUPS.map((g) => g.key));
  ok("C4.6 pass: each form of each person is in exactly one group", [...views.values()].every((v) => v.forms.every((f: any) => groups.has(f.group)) && new Set(v.forms.map((f: any) => f.form)).size === v.forms.length));
  const allForms = [...views.entries()].flatMap(([id, v]) => v.forms.map((f: any) => ({ id, ...f })));
  const app = allForms.filter((f) => f.group === "APPLICATION");
  ok("C4.6 pass: a form filed for the application (IMM 5475, IMM 5476) is its own group, shown once with the principal applicant", app.length >= 1 && app.every((f) => f.id === "principal") && new Set(app.map((f) => f.form)).size === app.length, app.map((f) => `${f.id}:${f.form}`));
  const couple = allForms.filter((f) => f.form === "IMM 5409");
  ok("C4.6 + Q3: IMM 5409 is filed once per couple, shown once under the spouse or partner, never under a child", couple.length === 1 && couple[0].id === "spouse" && couple[0].group === "COUPLE", couple.map((f) => `${f.id}:${f.group}`));
  const kids = [...views.entries()].filter(([id]) => id.startsWith("child-"));
  ok("C4.6 + Q3 fail: no child gets a form filed for the application or the couple (who a form applies to is right on the sample)", kids.every(([, v]) => !v.forms.some((f: any) => f.group === "APPLICATION" || f.group === "COUPLE")), kids.map(([id, v]) => `${id}: ${v.forms.map((f: any) => f.form).join(",") || "none"}`));
  const perForm = allForms.filter((f) => f.group !== "APPLICATION" && f.group !== "COUPLE");
  ok("C4.6 pass: every other form is grouped by its filing channel", perForm.length > 0 && perForm.every((f) => f.group === f.channel), perForm.map((f) => `${f.form}:${f.channel}`));
  const S4 = clone(S); const f1 = S4.forms.find((f: any) => f.form_number === "IMM 1295"); f1.channel = "ONLINE"; const f2 = S4.forms.find((f: any) => f.form_number === "IMM 5707"); f2.channel = "SIGNED_PDF_UPLOAD";
  const v4 = previewFamily(S4, "", "principal", {});
  ok("C4.6 pass: a form filed online is under \"Filled on the portal\"; a signed PDF under \"PDF to print and sign\"", v4.forms.find((f) => f.form === "IMM 1295")?.group === "ONLINE" && v4.forms.find((f) => f.form === "IMM 5707")?.group === "SIGNED_PDF_UPLOAD", v4.forms.map((f) => `${f.form}:${f.group}`));
  const S5 = clone(S4); S5.forms.find((f: any) => f.form_number === "IMM 5476").channel = "ONLINE";
  ok("C4.6 fail: a form filed for the application stays in that group whatever its channel (never repeated by channel)", previewFamily(S5, "", "principal", {}).forms.filter((f) => f.form === "IMM 5476").map((f) => f.group).join() === "APPLICATION");

  // ======================================================== released version and errors
  const rel = (await call("GET", `/combinations/${wp}/workspace?tab=preview&release=1&person=spouse`)).body.preview;
  ok("C4.3 pass: the released version shows the same three sets", !!rel && Array.isArray(rel.sets.pqr) && rel.sets.agent.questions > 0 && /Released version/.test(rel.label), rel?.label);
  ok("C4.3 fail: the released version does not have the draft tick yet (a draft is not in a release)", !rel.sets.pqr.some((x: any) => x.fact === spouseFact.fact), rel.sets.pqr.map((x: any) => x.fact));
  const bad = await call("GET", `/combinations/${wp}/workspace?tab=preview&person=nobody`);
  ok("C4.3 fail: an unknown person falls back to the principal applicant, never a 500", bad.status === 200 && bad.body.preview.person === "principal", bad.status);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
