// SH2 (P-258, inside G-CORE P-253): the one where-used service's working-out (engine/where-used.ts) is pure and gives the
// answers the three earlier computations gave (impact.ts, form-uses.ts, library-sources.ts usedInIds). No server, no
// database, US$0. Every rule has a passing and a failing case. The callers' own suites (check_screen02_slice2.ts,
// check_c119_library_items.ts, check_c313_reuse.ts, the form library's) prove the answers through the API, unchanged.
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/check_sh2_where_used.ts
import fc from "fast-check";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { byItem, current, fieldUses, filingCombinations, formLineByCombination, newestBy, releaseUses, type FieldUseRows } from "../engine/where-used.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const HERE = import.meta.dirname;

// P-249: the engine part is lift-ready: no database, framework, vendor or file-system import inside it. Every import,
// single- or multi-line, static or dynamic, is read; the same reader is tried on a planted bad source (the fail case).
const importsOf = (code: string) => [...code.matchAll(/\bfrom\s+"([^"]+)"|\bimport\s*\(\s*["']([^"']+)["']|^\s*import\s+"([^"]+)"/gm)].map((m) => m[1] ?? m[2] ?? m[3]);
const pure = (code: string) => importsOf(code).every((i) => /^\.\/|^\.\.\/contracts\//.test(i)) && !/\brequire\s*\(/.test(code);
const src = readFileSync(join(HERE, "..", "engine", "where-used.ts"), "utf8");
ok("SH2 pass: engine/where-used.ts imports only engine and contracts files (P-249)", pure(src) && importsOf(src).length > 0, importsOf(src));
ok("SH2 fail: a multi-line database import, a dynamic node:fs import or a require in the file is caught",
  !pure(src + '\nimport {\n  PrismaClient,\n} from "@prisma/client";\n') && !pure(src + '\nconst f = await import("node:fs");\n') && !pure(src + '\nconst f = require("node:fs");\n'));
// P-258: the three callers call the service and keep no copy of it.
const api = (f: string) => readFileSync(join(HERE, "..", "api", "src", f), "utf8");
ok("SH2 pass: impact.ts, form-uses.ts, library-sources.ts and library-items.ts read where-used from api/src/where-used.ts", ["impact.ts", "form-uses.ts", "library-sources.ts", "library-items.ts"].every((f) => /from "\.\/where-used\.ts"/.test(api(f))));
ok("SH2 fail: none of them queries the lines, releases or cases for where-used itself any more",
  !/combinationForm\.findMany\(\{ where: \{ workspaceId: h\.workspaceId, govFormDefId/.test(api("impact.ts")) && !/config_release/.test(api("form-uses.ts")) && !/config_release/.test(api("library-items.ts")) && !/sqrSectionSelection\.findMany/.test(api("library-sources.ts").split("async usedInIds")[1]?.split("async reuse")[0] ?? ""));

// newestBy / current: the newest version counts, only while draft or published (PR #96 finding (a)).
const v = [{ k: "a", version: 1, status: "PUBLISHED" }, { k: "a", version: 2, status: "RETIRED" }, { k: "b", version: 1, status: "DRAFT" }];
ok("SH2 pass: current keeps the newest draft or published version", current(v, (r) => r.k).map((r) => r.k).join() === "b");
ok("SH2 fail: a retired newest version hides the older published one", !current(v, (r) => r.k).some((r) => r.k === "a"));
ok("SH2 pass: newestBy keeps a retired newest version (a form's retired line still points to it, break M1)", newestBy(v, (r) => r.k).find((r) => r.k === "a")?.status === "RETIRED");

// Form lines: the newest line per combination; a combination whose newest line is retired no longer files the form.
const lines = [
  { combinationId: "c1", version: 1, status: "PUBLISHED" }, { combinationId: "c1", version: 2, status: "RETIRED" },
  { combinationId: "c2", version: 3, status: "DRAFT" }, { combinationId: "c2", version: 1, status: "PUBLISHED" },
];
ok("SH2 pass: formLineByCombination gives each combination's newest line", formLineByCombination(lines).get("c1")?.version === 2 && formLineByCombination(lines).get("c2")?.version === 3);
ok("SH2 pass: filingCombinations lists a combination whose newest line is live", filingCombinations(lines).map((l) => l.combinationId).join() === "c2");
ok("SH2 fail: an older published line behind a retired newest one does not count as filing the form", !filingCombinations(lines).some((l) => l.combinationId === "c1"));
ok("SH2 pass: releaseUses marks each combination's latest release", JSON.stringify(releaseUses([{ combinationId: "c1", version: 2, latest: 2 }, { combinationId: "c1", version: 1, latest: 2 }]).map((r) => r.latest)) === "[true,false]");

// fieldUses: every way a combination uses a shared field.
const ed = (id: string, label: string, published: string) => ({ id, govFormDefId: "f1", channel: "PDF", editionLabel: label, published });
const rows: FieldUseRows = {
  boxes: [{ canonicalFieldKey: "person.family_name", edition: ed("e2", "IMM 1295 (2025-06)", "2025-06-01") }, { canonicalFieldKey: "person.old_only", edition: ed("e1", "IMM 1295 (2023-01)", "2023-01-01") }],
  lines: [{ combinationId: "c1", lineageKey: "IMM 1295", govFormDefId: "f1", predicateJson: { op: "eq", field: "person.married", value: true }, version: 1, status: "PUBLISHED" }],
  rules: [{ combinationId: "c2", predicateKey: "r1", predicateJson: { op: "gt", field: "person.age", value: 17 }, version: 1, status: "DRAFT" },
    { combinationId: "c2", predicateKey: "r2", predicateJson: { op: "eq", field: "person.gone", value: true }, version: 2, status: "RETIRED" },
    { combinationId: "c2", predicateKey: "r2", predicateJson: { op: "eq", field: "person.gone", value: true }, version: 1, status: "PUBLISHED" }],
  docs: [{ combinationId: "c3", lineageKey: "d1", predicateJson: { op: "eq", field: "person.has_children", value: true }, version: 1, status: "PUBLISHED" }],
  checks: [{ combinationId: "c3", checkKey: "k1", predicateJson: { op: "eq", field: "person.check_fact", value: true }, version: 1, status: "PUBLISHED" }],
  questions: [{ lineageKey: "q1", sectionKey: "personal", canonicalFieldKey: "person.given_name", predicateJson: { op: "eq", field: "person.show", value: true }, version: 1, status: "PUBLISHED" }],
  picks: [{ sectionKey: "personal", combinationId: "c4" }],
};
const uses = byItem(fieldUses(rows));
const has = (f: string, c: string) => uses.get(f)?.has(c) ?? false;
ok("SH2 pass: a field mapped on the form's current edition is used by every combination filing that form", has("person.family_name", "c1"));
ok("SH2 fail: a field mapped only on a superseded edition is not used there (PR #108 minor (a))", !uses.has("person.old_only"));
ok("SH2 pass: form conditions, rules, document lines and checks read their fields", has("person.married", "c1") && has("person.age", "c2") && has("person.has_children", "c3") && has("person.check_fact", "c3"));
ok("SH2 fail: a rule whose newest version is retired reads nothing", !uses.has("person.gone"));
ok("SH2 pass: a question and its condition are used by each combination selecting its section", has("person.given_name", "c4") && has("person.show", "c4"));
ok("SH2 pass: byItem maps a field to its answer list and leaves out a field with none", (() => { const m = byItem(fieldUses(rows), (f) => (f === "person.married" ? "yes_no" : null)); return m.get("yes_no")?.has("c1") && m.size === 1; })());

// Review m1: each table's newest-version rule counts on its own (a replaced form line, document line, check or question
// no longer reads its old fields), and editions are compared per channel (an online edition never supersedes a PDF one).
const gone = (version: number, status: string) => ({ version, status });
const replaced = (base: FieldUseRows): FieldUseRows => ({
  ...base,
  // An older version behind a newer one, and a newest version that is retired (it hides the older published one).
  lines: [...base.lines, { combinationId: "c1", lineageKey: "IMM 1295", govFormDefId: "f1", predicateJson: { op: "eq", field: "person.line_old", value: true }, ...gone(0, "PUBLISHED") },
    ...[gone(1, "PUBLISHED"), gone(2, "RETIRED")].map((v) => ({ combinationId: "c5", lineageKey: "IMM 9999", govFormDefId: "f9", predicateJson: { op: "eq", field: "person.line_retired", value: true }, ...v }))],
  docs: [...base.docs, { combinationId: "c3", lineageKey: "d1", predicateJson: { op: "eq", field: "person.doc_old", value: true }, ...gone(0, "PUBLISHED") },
    ...[gone(1, "PUBLISHED"), gone(2, "RETIRED")].map((v) => ({ combinationId: "c5", lineageKey: "d9", predicateJson: { op: "eq", field: "person.doc_retired", value: true }, ...v }))],
  checks: [...base.checks, { combinationId: "c3", checkKey: "k1", predicateJson: { op: "eq", field: "person.check_old", value: true }, ...gone(0, "PUBLISHED") },
    ...[gone(1, "PUBLISHED"), gone(2, "RETIRED")].map((v) => ({ combinationId: "c5", checkKey: "k9", predicateJson: { op: "eq", field: "person.check_retired", value: true }, ...v }))],
  questions: [...base.questions, { lineageKey: "q1", sectionKey: "personal", canonicalFieldKey: "person.question_old", predicateJson: null, ...gone(0, "PUBLISHED") },
    ...[gone(1, "PUBLISHED"), gone(2, "RETIRED")].map((v) => ({ lineageKey: "q9", sectionKey: "personal", canonicalFieldKey: "person.question_retired", predicateJson: null, ...v }))],
});
const r2 = byItem(fieldUses(replaced(rows)));
ok("SH2 fail: an older version of a form line, document line, check or question reads nothing", !["person.line_old", "person.doc_old", "person.check_old", "person.question_old"].some((f) => r2.has(f)), [...r2.keys()]);
ok("SH2 fail: a form line, document line, check or question whose newest version is retired reads nothing", !["person.line_retired", "person.doc_retired", "person.check_retired", "person.question_retired"].some((f) => r2.has(f)), [...r2.keys()]);
const online = byItem(fieldUses({ ...rows, boxes: [...rows.boxes, { canonicalFieldKey: "person.online_only", edition: { id: "e3", govFormDefId: "f1", channel: "ONLINE", editionLabel: "IMM 1295 online (2026-01)", published: "2026-01-01" } }] }));
ok("SH2 pass: editions are current per channel: a newer online edition leaves the PDF edition's fields in use", online.get("person.family_name")?.has("c1") && online.get("person.online_only")?.has("c1"));

// STANDARDS §7: property-based checks on the pure engine (fast-check).
const prop = (name: string, p: fc.IProperty<any>) => { let err = ""; try { fc.assert(p, { numRuns: 300 }); } catch (e) { err = String(e).slice(0, 300); } ok(name, !err, err); };
const status = fc.constantFrom("DRAFT", "PUBLISHED", "RETIRED", "SUPERSEDED");
const row = fc.record({ k: fc.constantFrom("a", "b", "c", "d"), version: fc.integer({ min: 1, max: 6 }), status });
// Unique (key, version), as the database's own unique index keeps them.
const rowsArb = fc.uniqueArray(row, { selector: (r) => `${r.k}|${r.version}`, maxLength: 20 });
const keyset = (xs: { k: string; version: number; status: string }[]) => xs.map((r) => `${r.k}|${r.version}|${r.status}`).sort().join();
prop("SH2 property: newestBy and current give the same answer whatever the order of the rows", fc.property(rowsArb, fc.func(fc.integer()), (xs, f) => {
  const shuffled = [...xs].sort((a, b) => f(a.k + a.version) - f(b.k + b.version));
  return keyset(newestBy(xs, (r) => r.k)) === keyset(newestBy(shuffled, (r) => r.k)) && keyset(current(xs, (r) => r.k)) === keyset(current(shuffled, (r) => r.k));
}));
prop("SH2 property: current keeps exactly each row's newest version, and only when it is a draft or published", fc.property(rowsArb, (xs) => {
  const model = [...new Set(xs.map((r) => r.k))].map((k) => xs.filter((r) => r.k === k).sort((a, b) => b.version - a.version)[0]).filter((r) => r.status === "DRAFT" || r.status === "PUBLISHED");
  return keyset(current(xs, (r) => r.k)) === keyset(model);
}));
prop("SH2 property: filingCombinations lists exactly the combinations whose newest line is not retired", fc.property(fc.uniqueArray(fc.record({ combinationId: fc.constantFrom("c1", "c2", "c3"), version: fc.integer({ min: 1, max: 5 }), status }), { selector: (r) => `${r.combinationId}|${r.version}`, maxLength: 15 }), (ls) => {
  const model = [...new Set(ls.map((l) => l.combinationId))].filter((c) => ls.filter((l) => l.combinationId === c).sort((a, b) => b.version - a.version)[0].status !== "RETIRED").sort().join();
  return filingCombinations(ls).map((l) => l.combinationId).sort().join() === model;
}));
prop("SH2 property: byItem keeps exactly the pairs whose item key is set, each combination once", fc.property(fc.array(fc.tuple(fc.constantFrom("f1", "f2", "f3", ""), fc.constantFrom("c1", "c2", "c3")), { maxLength: 30 }), (pairs) => {
  const m = byItem(pairs);
  const model = new Set(pairs.filter(([k]) => k).map(([k, c]) => `${k}|${c}`));
  const got = new Set([...m].flatMap(([k, s]) => [...s].map((c) => `${k}|${c}`)));
  return model.size === got.size && [...model].every((x) => got.has(x)) && !m.has("");
}));

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
