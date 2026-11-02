// G-CORE B1 (P-253; concept screens/G-CORE-guarded-change/concept.md v2, approved on PR #504): POST /api/change-sets/check
// through the API on an isolated copy with the six combinations' sample: the rules check, the tier and the preview
// "What this change touches" (sections, forms, rules, combinations, releases, open cases per pinned release), with
// nothing written. A passing and a failing case per rule the endpoint adds. No browser, NO model call (US$0).
//   zsh studio/tools/isolated.sh forms_gcore 4456 start && tsx studio/tests/check_gcore_check_api.ts 4456 xr_studio_forms_gcore
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { seedAnswerList } from "./seed_library.cjs";

const PORT = Number(process.argv[2] ?? 4456), DB = process.argv[3] ?? "xr_studio_forms_gcore";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor: string | null = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const PSQL = existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql";
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const counts = () => sql("select (select count(*) from change_set) || '|' || (select count(*) from canonical_field) || '|' || (select count(*) from logical_section) || '|' || (select count(*) from library_change)");
const check = (items: unknown[], actor: string | null = "user-A") => call("POST", "/change-sets/check", { items }, actor);

(async () => {
  const FIELD = "person.family_name";
  const loaded = await call("POST", "/demo/load");
  ok("setup: the sample inputs load", loaded.status === 201, loaded.body?.message);
  // An open case on a released combination that carries the field (pinned at open).
  const rel = sql(`select r.combination_id from config_release r where r.snapshot->'canonical_fields' @> jsonb_build_array(jsonb_build_object('id', '${FIELD}')) order by r.version desc limit 1`);
  ok("setup: a released combination carries the field", /^[0-9a-f-]{36}$/.test(rel), rel);
  const c = await call("POST", "/runtime/cases", { combinationId: rel, reference: `GCORE-${Date.now().toString(36)}`, clientActor: "user-P", principal: { displayName: "Sample Applicant A" } }, "user-O");
  ok("setup: an open case on it", c.status === 201 || c.status === 200, c.body);
  const before = counts();

  // ─────────── The preview: every section, form, rule, combination, release and open case (P-253 step 4, BR-3)
  const label = sql(`select label from canonical_field where canonical_field_key = '${FIELD}' order by version desc limit 1`);
  let r = await check([{ action: "rename", kind: "field", key: FIELD, name: "Last name (Sample)" }]);
  const p = r.body?.preview?.[0];
  ok("G-CORE BR-3 pass: a clean rename passes the check (200, ok, no problems)", r.status === 200 && r.body.ok === true && r.body.problems.length === 0, r.body);
  ok("G-CORE BR-3 pass: the preview says before → after in names", p?.before === label && p?.after === "Last name (Sample)", [p?.before, p?.after]);
  const uses = (await call("GET", `/library/fields/${FIELD}/uses`)).body?.uses ?? [];
  const usedBy = uses.filter((u: { kind: string }) => u.kind === "combination").length;
  ok("G-CORE BR-3 pass: the preview lists every combination that uses it, the same as Library › Where used (SH2)", p?.combinations?.length === usedBy && usedBy >= 1, [p?.combinations?.length, usedBy]);
  ok("G-CORE BR-3 pass: the preview lists the forms whose current edition maps it", Array.isArray(p?.forms) && p.forms.length >= 1, p?.forms);
  ok("G-CORE BR-3 pass: the preview lists the sections whose questions ask it", Array.isArray(p?.sections) && p.sections.length >= 1 && p.sections.every((s: { title: string }) => s.title), p?.sections);
  ok("G-CORE BR-3 pass: the preview lists the releases carrying it, as Library › Where used does", p?.releases?.length === uses.filter((u: { kind: string }) => u.kind === "release").length && p.releases.length >= 1, [p?.releases, uses.filter((u: { kind: string }) => u.kind === "release").length]);
  ok("G-CORE BR-3 pass: the open case is counted on Visitor visa with the release it is pinned to", (p?.open_cases ?? []).some((o: { release: number | null; cases: number }) => o.cases >= 1 && typeof o.release === "number"), p?.open_cases);
  ok("G-CORE BR-3 pass: rules reading it are a list (each with its kind and combination)", Array.isArray(p?.rules) && p.rules.every((x: { kind: string; combination: string }) => x.kind && x.combination), p?.rules);
  ok("G-CORE BR-3: the result says what is not checked", (r.body?.not_checked ?? []).length === 3);
  // ─────────── The tier (BR-4, P-266)
  ok("G-CORE BR-4 pass: renaming a field a released combination uses needs a second person (P-266), in words", r.body?.tier?.tier === "second_person" && /second person/.test(r.body.tier.words) && r.body.tier.why.some((w: string) => /P-266/.test(w)), r.body?.tier);
  const unused = sql("select f.canonical_field_key from canonical_field f where f.status in ('DRAFT','PUBLISHED') and f.merged_into_key is null and not exists (select 1 from config_release c where c.snapshot->'canonical_fields' @> jsonb_build_array(jsonb_build_object('id', f.canonical_field_key))) order by 1 limit 1");
  if (unused) {
    const u2 = await check([{ action: "rename", kind: "field", key: unused, name: `Renamed ${Date.now().toString(36)} (Sample)` }]);
    ok("G-CORE BR-4 pass: renaming a field no release carries is direct and logged (P-96)", u2.body?.tier?.tier === "direct", [unused, u2.body?.tier]);
  } else ok("G-CORE BR-4 pass: (no unreleased field in the sample; the engine suite covers the direct row)", true);
  // ─────────── The fingerprint (BR-3: a changed preview is a new fingerprint)
  const again = await check([{ action: "rename", kind: "field", key: FIELD, name: "Last name (Sample)" }]);
  ok("G-CORE BR-3 pass: the same change on the same library gives the same fingerprint", again.body?.fingerprint === r.body?.fingerprint && /^[0-9a-f]{64}$/.test(r.body?.fingerprint));
  const other = await check([{ action: "rename", kind: "field", key: FIELD, name: "Last name 2 (Sample)" }]);
  ok("G-CORE BR-3 fail: a different change gives a different fingerprint", other.body?.fingerprint !== r.body?.fingerprint);

  // ─────────── R3 duplicate, R4 references, R7 never true: refused in words, through the API
  const twin = sql(`select canonical_field_key from canonical_field where group_key = (select group_key from canonical_field where canonical_field_key = '${FIELD}' limit 1) and canonical_field_key <> '${FIELD}' and status in ('DRAFT','PUBLISHED') and merged_into_key is null and label is not null order by 1 limit 1`);
  r = await check([{ action: "rename", kind: "field", key: twin, name: label }]);
  ok("G-CORE R3 fail: renaming a field onto another field's name in its group is refused in today's words, nothing written", r.status === 200 && r.body.ok === false && r.body.problems.some((x: { rule: string; message: string }) => x.rule === "R3" && /is already the name of/.test(x.message)), r.body?.problems);
  const num = sql("select canonical_field_key from canonical_field where value_type = 'number' and status in ('DRAFT','PUBLISHED') and merged_into_key is null order by 1 limit 1");
  r = await check([{ action: "merge", kind: "field", key: num, into: FIELD }]);
  ok("G-CORE R4 fail: merging a number into a text field is refused (different kinds)", r.body?.problems?.some((x: { rule: string }) => x.rule === "R4"), [num, r.body?.problems]);
  // The sample has no answer list yet: one Sample list on one coded field (test setup, as the runtime suites seed theirs).
  const cf = sql("select canonical_field_key from canonical_field where value_type = 'code' and status in ('DRAFT','PUBLISHED') and merged_into_key is null order by 1 limit 1");
  seedAnswerList(sql, { key: "gcore_sample_list", label: "G-CORE Sample list", values: [{ key: "ALPHA", label: "Alpha (Sample)" }, { key: "BETA", label: "Beta (Sample)" }] });
  sql(`update canonical_field set answer_list_key = 'gcore_sample_list' where canonical_field_key = '${cf}'`);
  const code = "ALPHA", coded = cf;
  const q = sql("select lineage_key from section_question where status in ('DRAFT','PUBLISHED') order by 1 limit 1");
  if (cf && q) {
    r = await check([{ action: "set_condition", kind: "condition", key: q, target: "question", tree: { subjectKind: "PERSON", op: "eq", field: cf, value: "NOT_ON_ANY_LIST" } }]);
    ok("G-CORE R7 fail: a condition asking a choice field for a value not on its list is refused (it can never be true)", r.body?.problems?.some((x: { rule: string }) => x.rule === "R7"), [cf, r.body?.problems]);
    r = await check([{ action: "set_condition", kind: "condition", key: q, target: "question", tree: { subjectKind: "PERSON", op: "eq", field: cf, value: code } }]);
    ok("G-CORE R7 pass: the same condition with a value on the list passes R7, and its tier names the expert at release", !r.body?.problems?.some((x: { rule: string }) => x.rule === "R7") && r.body?.tier?.expert_at_release === true, r.body);
  } else ok("G-CORE R7: (the sample has a coded field and a question)", false, { coded, q });

  // ─────────── Nothing is written by a check (B1); held and malformed changes
  ok("G-CORE pass: the check wrote nothing (no change set, no library row, no library change)", counts() === before, [before, counts()]);
  r = await check([{ action: "create", kind: "field", key: "person.height", name: "Height (Sample)" }]);
  ok("G-CORE held (P-251, P-252 (3)): a new field made by hand is refused 410, saying where items come from", r.status === 410 && /Nothing is added to the shared library by hand/.test(r.body?.detail), r);
  r = await check([{ action: "create", kind: "document_type", key: "doc.x", name: "Letter (Sample)" }]);
  ok("G-CORE held: a new document type made by hand is refused 410 too", r.status === 410, r.status);
  r = await call("POST", "/change-sets/check", { items: [{ action: "rename", kind: "field" }] });
  ok("G-CORE fail: a malformed change set is 400 in words, nothing checked", r.status === 400 && typeof r.body?.detail === "string", r);
  r = await call("POST", "/change-sets/check", { items: [] });
  ok("G-CORE fail: an empty change set is 400", r.status === 400, r.status);
  r = await check([{ action: "rename", kind: "field", key: FIELD, name: "Last name (Sample)" }], null);
  ok("G-CORE fail: no person, no check (the reader is required)", r.status === 401 || r.status === 403, r.status);

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
