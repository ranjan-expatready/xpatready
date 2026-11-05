// B81 (C10.1 row 9): the choices step's routes on an isolated copy: what a person reads, what they may save, and who may.
// No browser, no AI, US$0.
//   zsh studio/tools/isolated.sh forms_b81 4412 start && tsx studio/tests/check_forms_b81_routes.ts 4412 xr_studio_forms_b81
import { execFileSync } from "node:child_process";
import { seedAnswerList } from "./seed_library.cjs";

const PORT = Number(process.argv[2]), DB = process.argv[3];
if (!PORT || !/^xr_studio_(?!demo)/.test(DB ?? "")) { console.error("usage: <port> <isolated database>"); process.exit(2); }
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "content-type": "application/json", "x-actor": actor }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let parsed: unknown = t; try { parsed = JSON.parse(t); } catch { /* words */ }
  return { status: r.status, body: parsed };
};
const sql = (q: string) => execFileSync("psql", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", "-d", DB, "-Atc", q], { encoding: "utf8" }).trim();

const load = await call("POST", "/demo/load");
if (load.status >= 300) { console.error("STOP  the fixture did not load", load.body); process.exit(2); }
// The fixture's marital status answer list (Sample): IMM 5257's eight values, as on the six, plus one made-up value so this check needs no form to lack a real one. A list is seeded, never typed in (P-158).
seedAnswerList(sql, { key: "marital_status", label: "Marital status (Sample)", values: ([["annulled_marriage", "Annulled Marriage"], ["common_law", "Common-Law"], ["divorced", "Divorced"], ["legally_separated", "Legally Separated"], ["married", "Married"], ["single", "Single"], ["unknown", "Unknown"], ["widowed", "Widowed"], ["sample_no_choice", "Sample answer no form prints"]] as const).map(([key, label]) => ({ key, label })) });
const linked = await call("POST", "/library/fields/person.marital_status/answer-list", { list: "marital_status" });
if (linked.status >= 300) { console.error("STOP  the answer list did not link", linked.body); process.exit(2); }
const ed = sql("select id from form_edition where edition_label like 'IMM 5707 (%' limit 1");
const before = (await call("GET", `/editions/${ed}/option-maps`)).body;
const g = before.groups.find((x: { fact: string }) => x.fact === "person.marital_status");
ok("B81: the step lists the form's fields on an answer list, grouped by what they print", !!g && g.form_fields.length >= 1 && g.choices.length >= 2 && g.values.length >= 2, before);
const paths: string[] = g.form_fields.map((f: { data_path: string }) => f.data_path);
const val = (k: string) => g.values.find((v: { key: string }) => v.key === k);
ok("B81: reading writes nothing, and a suggestion names only printed codes", g.values.every((v: { code: string | null }) => v.code === null || g.choices.some((c: { code: string }) => c.code === v.code)) && !g.saved === (sql(`select count(*) from form_field_map where form_edition_id = '${ed}' and option_map is not null`) === "0"));
const map: Record<string, string> = Object.fromEntries(g.values.filter((v: { code: string | null }) => v.code).map((v: { key: string; code: string }) => [v.key, v.code]));
const save = (b: object, actor?: string) => call("PATCH", `/editions/${ed}/option-maps/group`, { dataPaths: paths, map, baseRevision: g.revision, ...b }, actor);
const unprinted = g.values.find((v: { code: string | null; printed: string[]; asks_more: boolean }) => !v.code && !v.printed.length && !v.asks_more);
ok("B81: the fixture has a value this form prints nothing for", !!unprinted, g.values);

let r = await save({ notOnForm: [unprinted.key] }, "user-C");
ok("B81 fail: only the configuration author saves choices", r.status === 403, r);
r = await save({ notOnForm: ["no_such_value"] });
ok("B81 fail: a mark on a value the list does not have is refused in words", r.status >= 400 && r.status < 500 && /not on the answer list/.test(r.body.message), r);
const printedKey = Object.keys(map)[0];
r = await save({ notOnForm: [printedKey] });
ok("B81 fail: a value with a code cannot also be marked", r.status >= 400 && r.status < 500 && /cannot have a code/.test(r.body.message), r);
const { [printedKey]: code0, ...rest } = map;
r = await call("PATCH", `/editions/${ed}/option-maps/group`, { dataPaths: paths, map: rest, notOnForm: [printedKey], baseRevision: g.revision });
ok("B81 fail (challenge B1): a value the form prints is refused as a mark, quoting the form's words", r.status >= 400 && r.status < 500 && /is on this form: it prints/.test(r.body.message), r);
r = await call("PATCH", `/editions/${ed}/option-maps/group`, { dataPaths: paths, map: { ...rest, [printedKey]: "no-such-code" }, baseRevision: g.revision });
ok("B81 fail: a code the form does not print is refused", r.status >= 400 && r.status < 500 && /is not one of this form field's codes/.test(r.body.message), r);
const other = Object.keys(rest)[0];
r = await call("PATCH", `/editions/${ed}/option-maps/group`, { dataPaths: paths, map: { ...map, [other]: code0 }, baseRevision: g.revision });
ok("B81 fail: two values on one printed code stay refused (the form's one choice is one answer)", r.status >= 400 && r.status < 500 && /two values share one code/.test(r.body.message), r);

r = await save({ notOnForm: [unprinted.key], baseRevision: g.revision });
ok("B81 pass: the author marks the value on every form field of the group, with the form's other codes unused", r.status < 300 && r.body.option_map.notOnForm.join() === unprinted.key && r.body.form_fields.length === paths.length, r);
const after = (await call("GET", `/editions/${ed}/option-maps`)).body.groups.find((x: { fact: string; values: { key: string; not_on_form: boolean }[] }) => x.fact === "person.marital_status" && x.values.some((v) => v.key === unprinted.key && v.not_on_form));
ok("B81: the mark reads back on the group, with no problem left and saved", !!after && after.saved && after.problems.length === 0 && after.form_fields.length === paths.length, after);
r = await save({ notOnForm: [], baseRevision: g.revision });
ok("B81 fail (challenge M4): a save against what someone has changed since is refused, and says so", r.status === 409 && /Configuration author changed these choices since you opened them \(at \d\d:\d\d IST\)/.test(r.body.message), r);
const drafted = (await call("POST", `/editions/${ed}/option-maps/draft`)).body.option_maps.filter((o: { form_field: string }) => paths.includes(o.form_field));
ok("B81 (challenge M6): a new rules draft keeps the mark", drafted.length === paths.length && drafted.every((o: { optionMap: { notOnForm?: string[] } }) => o.optionMap.notOnForm?.join() === unprinted.key), drafted.map((o: { optionMap: unknown }) => o.optionMap));
ok("B81: the save is in the audit trail, naming the answer in words", sql(`select count(*) from audit_event where action = 'changed' and detail::text like '%not on this form: ${unprinted.label}%'`) >= "1");
r = await call("PATCH", `/editions/${ed}/option-maps/group`, { dataPaths: paths, map, notOnForm: [] });
ok("B81 fail (review M6): a save that does not say which choices it opened is refused", r.status >= 400 && r.status < 500, r);

// The real fill path on IMM 1295, which the fixture's sample fills with "married": that box does print Married, so the mark
// is written straight into this copy's database (the route rightly refuses it), only to read what a fill does with a mark.
const wp = sql("select id from combination where combination_key = 'wp.family' and retired_at is null limit 1");
const ed1295 = sql("select id from form_edition where edition_label like 'IMM 1295 (%' limit 1");
const om1295 = (await call("POST", `/editions/${ed1295}/option-maps/draft`)).body.option_maps.find((o: { fact: string }) => o.fact === "person.marital_status");
const { married: _married, ...withoutMarried } = om1295.optionMap.map as Record<string, string>; void _married;
sql(`update form_field_map set option_map = '${JSON.stringify({ ...om1295.optionMap, map: withoutMarried, notOnForm: ["married"] }).replace(/'/g, "''")}'::jsonb where form_edition_id = '${ed1295}' and data_path = '${om1295.form_field}' and status = 'DRAFT'`);
const fillIt = await call("POST", `/combinations/${wp}/fill`, { form: "IMM 1295", person: "principal", mode: "draft" });
const boxOf = fillIt.body.boxes?.find((x: { box: string }) => x.box === om1295.form_field);
ok("B81 fail: a fill with a marked answer is refused in words on that form field: nothing written, its own result and count, never \"by hand\"", fillIt.status < 300 && boxOf?.result === "not on this form" && !boxOf.written && /The form has no choice for "Married"/.test(boxOf.why) && /leave it blank or change the answer/.test(boxOf.why) && fillIt.body.counts.not_on_form === 1, { status: fillIt.status, boxOf, counts: fillIt.body?.counts, message: fillIt.body?.message });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
