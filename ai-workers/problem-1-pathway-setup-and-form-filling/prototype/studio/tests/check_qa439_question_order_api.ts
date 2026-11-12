// QA-439 (A25 UX sweep, P-498; C6.2, C4.9): in the client's questionnaire each person's date of birth and marital status
// come before every question they decide, so a 0-4 child is never walked through military service, government positions
// or a common-law declaration before their birth date is in. Read through the product's routes on the configured
// checkpoint's Visitor visa and Study permit families (principal, spouse, a child born in 2024): for each person, a fresh
// case is opened and read as Client A (the order a person walks with "Save and continue"); then only that person's date
// of birth and marital status are answered; every question that leaves the questionnaire with those two answers must have
// come after both of them. Loads the configured checkpoint itself (about 2 minutes; saved AI answers only, US$0, live AI off).
//   zsh studio/tools/isolated.sh qa439 4452 start && tsx studio/tests/check_qa439_question_order_api.ts 4452 xr_studio_qa439
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const PORT = Number(process.argv[2]), DB = process.argv[3];
if (!PORT || PORT === 4400 || !/^xr_studio_(?!demo)/.test(DB ?? "")) { console.error("usage: <port of an isolated copy, never 4400> <its database>"); process.exit(2); }
const BREW = "/opt/homebrew/opt/postgresql@18/bin/psql", PSQL = process.env.PSQL || (existsSync(BREW) ? BREW : "psql");
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const OFFICER = "user-O", AUTHOR = "user-A", CLIENT = "user-P";
const call = async (method: string, path: string, body?: unknown, actor = OFFICER) => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 700)}` : ""}`); };

const has = sql(`select count(*) from config_release r join combination c on c.id=r.combination_id where c.combination_key='sp.outside'`) !== "0";
const loaded = has ? { status: 200, body: null } : await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
if (loaded.status >= 300) { console.log("FAIL  the configured checkpoint did not load", loaded.status, JSON.stringify(loaded.body).slice(0, 300)); process.exit(1); }
const combo = (key: string) => sql(`select id from combination where combination_key='${key}'`);

type Q = { fact: string; hidden: boolean; label: string };
type Part = { subjectId: string; section: string; title: string; questions: Q[] };
const DOB = "person.date_of_birth", MARITAL = "person.marital_status";
// The parts a 0-4 child must never be walked through (IMM 5257 Schedule 1 from 18; IMM 5409 only for a common-law union).
const ADULT_ONLY = ["military_service", "government_positions", "statutory_declaration_of_common_law_union", "other_documentary_evidence"];
// The child's full name is read by IMM 5645 for every child, but the library places it in the common-law declaration's
// section: moving it is QA-440's (forms), so once the answers are in it is the one question allowed to stay there.
const KEPT_BY_ANOTHER_FORM = new Set(["person.full_name"]);

/** The client's walk: every question shown, in the order of its part, then its place in the part. */
const walk = (parts: Part[]) => parts.flatMap((p) => p.questions.filter((q) => !q.hidden).map((q) => ({ key: `${p.subjectId}|${q.fact}`, part: `${p.title}`, subject: p.subjectId, section: p.section, fact: q.fact })));
const family = async (key: string, ref: string) => {
  const open = await call("POST", "/runtime/cases", { combinationId: combo(key), reference: `${ref}-${Date.now()}`, clientActor: CLIENT, principal: { displayName: "Sample Applicant A" } });
  const id: string = open.body?.id;
  const add = async (role: string, name: string) => (await call("POST", `/runtime/cases/${id}/people`, { role, displayName: name })).body?.subject_id as string;
  const spouse = await add("spouse_or_partner", "Sample Spouse A"), child = await add("child", "Sample Child T");
  const principal = ((await call("GET", `/runtime/cases/${id}`)).body.people as { role: string; subject_id: string }[]).find((x) => x.role === "principal")!.subject_id;
  const all = (await call("GET", `/runtime/cases/${id}`)).body.people as { role: string; subject_id: string }[];
  return { id, status: open.status, people: { principal, spouse, child } as Record<string, string>, roleOf: new Map(all.map((x) => [x.subject_id, x.role])) };
};
const view = async (id: string) => ((await call("GET", `/runtime/cases/${id}/questionnaire`, undefined, CLIENT)).body?.sections ?? []) as Part[];
const ANSWERS: Record<string, [string, string]> = { principal: ["1990-03-01", "married"], spouse: ["1991-05-01", "married"], child: ["2024-02-01", "single"] };

// Review M2 (#1643): the release's form-field gates (B107; a form box written only while its condition holds). A question
// whose every mapped box in the release carries a gate is decided by the gate's facts: those come first in the walk.
const gatedBy = (key: string) => {
  const rows = sql(`select e->>'fact', coalesce(e->'condition_rule'->'gate', 'null'::jsonb)::text from config_release r join combination c on c.id=r.combination_id, jsonb_array_elements(r.snapshot->'field_maps') m, jsonb_array_elements(m->'entries') e where c.combination_key='${key}' and e->>'outcome'='mapped' and e->>'fact' is not null and r.version=(select max(version) from config_release x where x.combination_id=c.id)`).split("\n").filter(Boolean).map((l) => l.split("|"));
  const out = new Map<string, Set<string> | null>();
  for (const [fact, gate] of rows) {
    const had = out.get(fact);
    if (gate === "null") { out.set(fact, null); continue; }
    if (had === null) continue;
    const reads = new Set(had ?? []); for (const m of gate.matchAll(/"field": ?"([^"]+)"/g)) reads.add(m[1]);
    out.set(fact, reads);
  }
  return new Map([...out].filter((e): e is [string, Set<string>] => !!e[1] && e[1].size > 0));
};

for (const [key, name] of [["vv.single", "Visitor visa"], ["sp.outside", "Study permit (outside Canada)"]] as const) {
  const gates = gatedBy(key);
  for (const who of ["principal", "spouse", "child"] as const) {
    const f = await family(key, `QA439-${who}`);
    const s = f.people[who];
    const before = walk(await view(f.id));
    // Review M1 (#1643): people come in the case's order (the application, principal, spouse, child), never by their id.
    const firstSeen = [...new Set(before.map((q) => q.subject).filter((x) => !x.includes("/") && f.roleOf.has(x)))].map((x) => f.roleOf.get(x));
    ok(`QA-439 pass (${name}, case ${who}): people come in the case's order, the application first`, JSON.stringify(firstSeen) === JSON.stringify(["case", "principal", "spouse_or_partner", "child"]), firstSeen);
    if (who === "principal") {
      const caseSubject = [...f.roleOf].find(([, r]) => r === "case")![0];
      const late = before.flatMap((q, i) => { const g = gates.get(q.fact); if (!g) return []; return [...g].map((d) => ({ q, i, d: before.findIndex((x) => x.fact === d && x.subject === (d.startsWith("case.") ? caseSubject : q.subject.split("/")[0])) })).filter((x) => x.d > x.i); });
      ok(`QA-439 pass (${name}): every question the release's form-field gates decide (an "other" box after its purpose or status, details after their Yes) comes after the gate's question`,
        gates.size > 0 && late.length === 0, { gated: gates.size, late: late.slice(0, 6).map((x) => `${x.i}: ${x.q.part} · ${x.q.fact} before ${x.d}: ${before[x.d].fact}`) });
    }
    const at = (fact: string) => before.findIndex((q) => q.key === `${s}|${fact}`);
    const dob = at(DOB), marital = at(MARITAL);
    ok(`QA-439 setup (${name}, ${who}): the case opens for Client A with three people, and the ${who}'s date of birth and marital status are asked`, f.status === 201 && dob >= 0 && marital >= 0, { status: f.status, dob, marital });
    const [d, m] = ANSWERS[who];
    const put = await Promise.all([call("PUT", `/runtime/cases/${f.id}/answers/${s}/${DOB}`, { value: d, expectedId: null }, CLIENT), call("PUT", `/runtime/cases/${f.id}/answers/${s}/${MARITAL}`, { value: m, expectedId: null }, CLIENT)]);
    const after = walk(await view(f.id)), still = new Set(after.map((q) => q.key));
    const decided = before.map((q, i) => ({ ...q, i })).filter((q) => !still.has(q.key));
    const early = decided.filter((q) => q.i < Math.max(dob, marital));
    ok(`QA-439 fail-before (${name}, ${who}): every question the ${who}'s date of birth and marital status take away comes after both of them in the client's walk`,
      put.every((r) => r.status === 200) && decided.length > 0 && early.length === 0,
      { saved: put.map((r) => r.status), decided: decided.length, dob, marital, first_before: early.slice(0, 6).map((q) => `${q.i}: ${q.part} · ${q.fact}`) });
    // The order holds while the client answers: the parts still asked keep the order they had (Save and continue never
    // passes a part that moved behind the one the client is on).
    const partsOf = (qs: typeof before) => [...new Set(qs.map((x) => `${x.subject}|${x.section}`))];
    const kept = new Set(partsOf(after)), was = partsOf(before).filter((k) => kept.has(k)), now = partsOf(after).filter((k) => was.includes(k));
    ok(`QA-439 fail (${name}, ${who}): after the ${who}'s two answers the parts still asked keep their order`, JSON.stringify(was) === JSON.stringify(now), { first_moved: was.findIndex((k, i) => now[i] !== k), was: was.slice(0, 8), now: now.slice(0, 8) });
    if (who === "child") {
      const adult = (qs: typeof before) => qs.filter((q) => q.subject === s && ADULT_ONLY.includes(q.section));
      const seen = adult(before).filter((q) => before.indexOf(q) < Math.max(dob, marital));
      ok(`QA-439 pass (${name}): a child born in 2024 is asked no military-service, government-position or common-law question before their birth date and marital status, and none once they are in`,
        seen.length === 0 && adult(after).filter((q) => !KEPT_BY_ANOTHER_FORM.has(q.fact)).length === 0, { before_dob: seen.slice(0, 5).map((q) => `${q.part} · ${q.fact}`), after: adult(after).slice(0, 5).map((q) => `${q.part} · ${q.fact}`) });
      // The child's own parts start with the part that holds their birth date ("Personal details" first, QA-439's fix); only
      // the sections the combination's author chose and ordered (C4.1, asked whatever the age) may come before it.
      const chosen = new Set(sql(`select s.section_key from sqr_section_selection s join combination c on c.id=s.combination_id where c.combination_key='${key}'`).split("\n").filter(Boolean));
      const ahead = [...new Set(before.slice(0, dob).filter((q) => q.subject === s && q.section !== before[dob].section).map((q) => q.section))];
      ok(`QA-439 pass (${name}): before the child's part that holds their date of birth, the child has only the combination's own chosen sections`, ahead.every((x) => chosen.has(x)), { ahead, chosen: [...chosen] });
    }
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
