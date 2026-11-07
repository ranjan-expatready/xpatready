// B102 (A6, C6.4; product/screens/A6-age-on-application-date/concept.md): "Work it out instead". A fact a rule reads and
// the library lacks is worked out from library dates (a person's age in whole years from the date of birth on the
// application date) instead of being asked. A passing and a failing check per business rule (BR-1 to BR-7). On an
// isolated copy with the sample inputs loaded (the demo is never touched). No browser, NO model call (US$0).
//   zsh studio/tools/isolated.sh b102_worked_out 4463 start && tsx studio/tests/check_b102_worked_out.ts 4463 xr_studio_b102_worked_out
import { execFileSync } from "node:child_process";
import { ageInYears, evaluate } from "../../contracts/rules.ts";

const PORT = Number(process.argv[2] ?? 4463), DB = process.argv[3] ?? "xr_studio_b102_worked_out";
let pass = 0, failed = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : failed++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const PSQL = process.env.PSQL || "/opt/homebrew/opt/postgresql@18/bin/psql";
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const msg = (r: Res) => String(r.body?.message ?? r.body?.detail ?? r.body);

(async () => {
  // ─────────────────── BR-7: how age counts (the engine's tested helper; Sample, Unconfirmed: no counsel)
  ok("B102 BR-7 pass: on the 18th birthday the age is 18", ageInYears("2008-11-07", "2026-11-07") === 18);
  ok("B102 BR-7 fail: the day before the 18th birthday the age is still 17", ageInYears("2008-11-08", "2026-11-07") === 17);
  ok("B102 BR-7 pass: born 29 February, the birthday counts on 1 March in a year without one", ageInYears("2008-02-29", "2026-03-01") === 18 && ageInYears("2008-02-29", "2026-02-28") === 17);
  ok("B102 BR-7 fail: a birth after the date gives no age, never a negative one", ageInYears("2027-01-01", "2026-11-07") === undefined);
  const minor = { op: "lt", field: "person.age_years", value: 18 } as const, d = [{ id: "person.age_years", calculation: "age_in_years", inputs: ["person.date_of_birth"], reference: "case.application_date" }];
  ok("B102 BR-7 pass: a rule reading the worked-out age holds for a child of 15 on the application date", evaluate(minor, { "person.date_of_birth": "2011-06-01", "case.application_date": "2026-11-07" }, d).result === true);
  const open = evaluate(minor, { "person.date_of_birth": "2011-06-01" }, d);
  ok("B102 BR-7 fail: with no application date the rule cannot tell and names the date to answer", open.result === "cannot_tell" && open.missing.includes("case.application_date"), open);

  await call("POST", "/demo/reset", { confirm: "RESET" }); // its own copy only: a re-run starts from the sample inputs
  const loaded = await call("POST", "/demo/load");
  ok("setup: the sample inputs load", loaded.status === 201, loaded.body?.message);
  const combo = sql("select c.id from combination c join sqr_section_selection s on s.combination_id = c.id order by c.label limit 1");
  const ws = `(select workspace_id from combination where id='${combo}')`;
  const rule = (key: string, json: string, then: string) => sql(`insert into predicate (id, workspace_id, combination_id, predicate_key, predicate_json, when_plain, then_plain, for_whom, version, status, origin, updated_by) values (gen_random_uuid(), ${ws}, '${combo}', '${key}', '${json}', 'when the test says so', '${then}', 'principal', 1, 'PUBLISHED', 'HUMAN', 'user-A')`);
  rule("r_b102_age", `{"field":"person.b102_years","op":"lt","value":18}`, "ask for the papers of a child");
  rule("r_b102_asked", `{"field":"person.b102_asked","op":"eq","value":true}`, "a fact to ask");
  const caseDate = sql(`select canonical_field_key from canonical_field where workspace_id=${ws} and value_type='date' and canonical_field_key like 'case.%' and status in ('DRAFT','PUBLISHED') order by canonical_field_key limit 1`);
  const personDate = sql(`select canonical_field_key from canonical_field where workspace_id=${ws} and value_type='date' and canonical_field_key like 'person.%' and canonical_field_key <> 'person.date_of_birth' and status in ('DRAFT','PUBLISHED') order by canonical_field_key limit 1`);
  const good = { calculation: "age_in_years", from: "person.date_of_birth", on: caseDate, plain: "The person's age in whole years on the test date." };
  const url = (fact: string) => `/combinations/${combo}/rule-facts/${encodeURIComponent(fact)}/worked-out`;

  // ─────────────────── the choices the form offers
  let r = await call("GET", `/combinations/${combo}/rule-facts/worked-out`);
  ok("B102 pass: the form offers the calculation in words, person dates to work from and case dates to work on", r.status === 200 && r.body?.calculations?.[0]?.words === "Age in whole years" && r.body.from.some((x: { key: string }) => x.key === "person.date_of_birth") && r.body.on.length > 0 && r.body.on.every((x: { key: string }) => x.key.startsWith("case.")), r.body);
  r = await call("GET", `/combinations/${combo}/rule-facts/worked-out`, undefined, "user-O");
  ok("B102 fail: a case person cannot read the configuration's choices (401 or 403)", r.status === 401 || r.status === 403, r.status);

  // ─────────────────── BR-6: the configuration author only, with words
  r = await call("POST", url("person.b102_years"), good, "user-B");
  ok("B102 BR-6 fail: someone without the author duty is refused (403)", r.status === 403, [r.status, msg(r)]);
  r = await call("POST", url("person.b102_years"), { ...good, plain: "age" });
  ok("B102 BR-6 fail: words under 10 characters are refused, saying why", r.status === 400 && /10 characters or more/.test(msg(r)), [r.status, msg(r)]);
  r = await call("POST", url("person.b102_years"), { ...good, key: "person.other" });
  ok("B102 BR-6 fail: a typed key is refused (the key is the one the rule reads)", r.status === 400 && /the key is the one the rule reads, never typed/.test(msg(r)), [r.status, msg(r)]);
  // ─────────────────── BR-1: only for a fact a rule reads, not in the library, not worked out
  r = await call("POST", url("person.b102_nobody_reads"), good);
  ok("B102 BR-1 fail: a fact no rule of the combination reads is refused (404)", r.status === 404 && /a value is worked out only for a rule that needs it/.test(msg(r)), [r.status, msg(r)]);
  r = await call("POST", url("person.date_of_birth"), good);
  ok("B102 BR-1 fail: a library field is asked, so it is not worked out (409)", r.status === 409 && /already in the library/.test(msg(r)), [r.status, msg(r)]);
  // ─────────────────── BR-2: a calculation the engine works out
  r = await call("POST", url("person.b102_years"), { ...good, calculation: "months_between" });
  ok("B102 BR-2 fail: a calculation the product does not work out is refused, naming the one it does", r.status === 400 && /"Age in whole years"/.test(msg(r)), [r.status, msg(r)]);
  // ─────────────────── BR-3: from a date about the same subject
  r = await call("POST", url("person.b102_years"), { ...good, from: caseDate });
  ok("B102 BR-3 fail: worked out from a date about the case, not the person, is refused", r.status === 400 && /is about the case, not the person/.test(msg(r)), [r.status, msg(r)]);
  r = await call("POST", url("person.b102_years"), { ...good, from: "person.no_such_date" });
  ok("B102 BR-3 fail: a date the library does not hold is refused", r.status === 400 && /is not a date in the library/.test(msg(r)), [r.status, msg(r)]);
  // ─────────────────── BR-4: on a date about the case
  r = await call("POST", url("person.b102_years"), { ...good, on: personDate || "person.date_of_birth" });
  ok("B102 BR-4 fail: worked out on a date about the person is refused, saying to add the date about the case first", r.status === 400 && /add the date about the case first/.test(msg(r)), [r.status, msg(r)]);
  // ─────────────────── BR-5: never both asked and worked out
  r = await call("POST", `/combinations/${combo}/rule-facts`, { fact: "person.b102_asked", rule: "r_b102_asked", label: "B102 asked fact", meaning: "A fact proposed to be asked, for the B102 check.", valueType: "yes_no" });
  ok("setup: a proposal to ask person.b102_asked waits on To review", r.status === 201, [r.status, msg(r)]);
  r = await call("POST", url("person.b102_asked"), good);
  ok("B102 BR-5 fail: a fact with a waiting proposal to ask it is refused (409)", r.status === 409 && /decide it there first/.test(msg(r)), [r.status, msg(r)]);

  // ─────────────────── the pass: worked out, with an audit line, and no longer listed as a fact to add
  const audits = Number(sql(`select count(*) from audit_event where entity='worked-out value'`));
  r = await call("POST", url("person.b102_years"), good);
  ok("B102 BR-1 to BR-4 pass: the age is worked out from the date of birth on the case date (201)", r.status === 201 && r.body?.fact === "person.b102_years" && r.body?.from === "person.date_of_birth" && r.body?.on === caseDate, [r.status, r.body]);
  const row = sql(`select calculation || '|' || array_to_string(inputs, ',') || '|' || reference || '|' || executable from derived_field where derived_key='person.b102_years'`);
  ok("B102 pass (data): one derived value, executable, from the date of birth on the case date", row === `age_in_years|person.date_of_birth|${caseDate}|true`, row);
  ok("B102 BR-6 pass: one audit line names who worked it out", Number(sql(`select count(*) from audit_event where entity='worked-out value'`)) === audits + 1);
  r = await call("GET", `/combinations/${combo}/rule-facts`);
  ok("B102 pass: the fact leaves C3.6's list of facts to add (it is worked out, not asked)", r.status === 200 && !(r.body?.facts ?? []).some((f: { fact: string }) => f.fact === "person.b102_years"), (r.body?.facts ?? []).map((f: { fact: string }) => f.fact));
  r = await call("POST", url("person.b102_years"), good);
  ok("B102 BR-1 fail: working it out twice is refused (409)", r.status === 409 && /already worked out/.test(msg(r)), [r.status, msg(r)]);
  rule("r_b102_twice", `{"field":"person.b102_twice","op":"lt","value":18}`, "twice");
  const both = await Promise.all([call("POST", url("person.b102_twice"), good), call("POST", url("person.b102_twice"), good)]);
  ok("B102 fail (race): two parallel adds of one fact make one value; the other is refused (409)", both.filter((x) => x.status === 201).length === 1 && both.some((x) => x.status === 409) && sql(`select count(*) from derived_field where derived_key='person.b102_twice'`) === "1", both.map((x) => [x.status, msg(x)]));

  console.log(`\n${pass} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
