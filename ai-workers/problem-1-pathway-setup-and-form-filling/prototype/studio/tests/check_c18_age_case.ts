// C1.8 rest (screens, F1): a form line's minimum age, walked from the setting to a case. A case applies it from each
// person's date of birth; while the date of birth is unknown the form "cannot tell" and the date of birth is asked; a
// release is refused when nobody is asked for a date of birth. Who signs it is saved and reaches the snapshot. On an
// isolated copy with the sample loaded, through the runtime's own caseView. No browser, no model call (US$0).
//   zsh studio/tools/isolated.sh screens_age 4442 start && tsx studio/tests/check_c18_age_case.ts 4442 xr_studio_screens_age
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { caseView, type Answer, type Participant } from "../engine/runtime/case.ts";
import { validate } from "../engine/validate.ts";

const PORT = Number(process.argv[2] ?? 4442), DB = process.argv[3] ?? "xr_studio_screens_age";
const log: any[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const BIRTH = "person.date_of_birth";

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  if (!(await call("GET", "/demo/status")).body?.loaded) { const l = await call("POST", "/demo/load", {}); if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); } }
  const C = sql("select id from combination where combination_key='wp.family'");
  if (!C) { console.error("STOP  the sample has no wp.family combination"); process.exit(2); }
  const F = "IMM 1295";
  const line = async () => ((await call("GET", `/combinations/${C}/workspace?tab=forms`)).body.lines as any[]).find((l) => l.code === F);
  let r = await call("PATCH", `/combinations/${C}/forms/${encodeURIComponent(F)}`, { minAge: 18, signedBy: "person", baseRevision: (await line()).revision });
  ok("C1.8 setup: from age 18 and 'signed by the person' are saved on IMM 1295", r.status === 200 && r.body.minAge === 18 && r.body.signedBy === "person", r.status);
  const s = (await call("GET", `/combinations/${C}/config`)).body.snapshot;
  const f = s.forms.find((x: any) => x.form_number === F);
  ok("C1.8 pass: the draft snapshot a case reads carries min_age 18 and signed_by person", f?.min_age === 18 && f?.signed_by === "person", f && { min_age: f.min_age, signed_by: f.signed_by });

  // ---------------------------------------------------------------- a case, through the runtime's own caseView
  const today = new Date(Date.UTC(2026, 9, 31));
  const people: Participant[] = [{ subjectId: "case", role: "case", label: "The application", applies: true }, { subjectId: "principal", role: "principal", label: "Principal applicant", applies: true }];
  const born = (iso: string): Answer[] => [{ id: "a1", subjectId: "principal", field: BIRTH, rowKey: null, value: iso, status: "DECLARED", channel: "test", actor: "test", at: today.toISOString() }];
  const applies = (answers: Answer[]) => caseView(s, people, answers, [], "sqr", today).forms.find((x) => x.form === F)?.applies;
  const unknown = caseView(s, people, [], [], "sqr", today);
  ok("C1.8 pass: with the date of birth unknown, IMM 1295 is 'cannot tell' on the case (never filed, never dropped)", unknown.forms.find((x) => x.form === F)?.applies === "cannot_tell", unknown.forms.find((x) => x.form === F));
  // The sample reads the date of birth from the passport (collected from a verified document): the client is not asked
  // while the passport is on the checklist (P-130 rule, as Preview says); the staff working view asks it.
  const asked = caseView(s, people, [], [], "agent", today).sections.flatMap((x: any) => x.questions).filter((q: any) => q.subjectId === "principal" && q.fact === BIRTH);
  ok("C1.8 pass: and the case's working view asks the principal's date of birth (not answered yet)", asked.length === 1 && (asked[0].value === undefined || asked[0].value === null || asked[0].value === ""), asked.map((q: any) => ({ label: q.label, value: q.value })));
  ok("C1.8 pass: a principal of 30 gets IMM 1295", applies(born("1996-05-01")) === true);
  ok("C1.8 fail: a principal of 10 does not", applies(born("2016-05-01")) === false);
  ok("C1.8 pass (edge): 18 today, on the birthday, gets it", applies(born("2008-10-31")) === true);
  ok("C1.8 fail (edge): one day before the 18th birthday does not", applies(born("2008-11-01")) === false);
  ok("C1.8 fail: a date of birth that is not a date stays 'cannot tell', never a guess", applies(born("31/10/2008")) === "cannot_tell");

  // ---------------------------------------------------------------- release rule: somebody must be asked
  const lib = (await call("GET", "/library/fields")).body as any[];
  const library = (Array.isArray(lib) ? lib : lib?.fields ?? []).map((x: any) => ({ key: x.key ?? x.canonicalFieldKey, valueType: x.valueType ?? x.value_type }));
  const noBirth = { ...s, placements: s.placements.filter((p: any) => p.fact !== BIRTH), document_types: [] };
  const age = (x: any) => validate(x, library, []).filter((p) => p.item === F && /date of birth decides it/.test(p.message));
  ok("C1.8 pass (release): with the date of birth asked, no age error stands in the way", age(s).length === 0);
  ok("C1.8 fail (release): with nobody asked for a date of birth, release is refused with an error naming the fix", age(noBirth).length === 1 && age(noBirth)[0].level === "error" && /Add the date of birth question/.test(age(noBirth)[0].message), age(noBirth)[0]?.message);

  r = await call("PATCH", `/combinations/${C}/forms/${encodeURIComponent(F)}`, { minAge: null, signedBy: null, baseRevision: (await line()).revision });
  const s2 = (await call("GET", `/combinations/${C}/config`)).body.snapshot;
  ok("C1.8 pass: clearing the age gives every person the form again (any age)", r.status === 200 && caseView(s2, people, born("2016-05-01"), [], "sqr", today).forms.find((x) => x.form === F)?.applies === true);

  const out = join(import.meta.dirname, "..", "var", "suites"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_c18_age_case.json"), JSON.stringify({ at: new Date().toISOString(), pass, fail, log }, null, 1));
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
