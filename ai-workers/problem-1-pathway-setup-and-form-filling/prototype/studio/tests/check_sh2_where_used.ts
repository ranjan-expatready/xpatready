// SH2 (P-258, inside G-CORE P-253): the one where-used service's working-out (engine/where-used.ts) is pure and gives the
// answers the three earlier computations gave (impact.ts, form-uses.ts, library-sources.ts usedInIds). No server, no
// database, US$0. Every rule has a passing and a failing case. The callers' own suites (check_screen02_slice2.ts,
// check_c119_library_items.ts, check_c313_reuse.ts, the form library's) prove the answers through the API, unchanged.
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/check_sh2_where_used.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { byItem, current, fieldUses, filingCombinations, formLineByCombination, newestBy, releaseUses, type FieldUseRows } from "../engine/where-used.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const HERE = import.meta.dirname;

// P-249: the engine part is lift-ready: no database, framework, vendor or file-system import inside it.
const src = readFileSync(join(HERE, "..", "engine", "where-used.ts"), "utf8");
const imports = [...src.matchAll(/^import .* from "([^"]+)"/gm)].map((m) => m[1]);
ok("SH2 pass: engine/where-used.ts imports only engine and contracts files (P-249)", imports.every((i) => /^\.\/|^\.\.\/contracts\//.test(i)), imports);
ok("SH2 fail: a database or framework import would be caught by the same scan", !["@prisma/client", "@nestjs/common", "node:fs"].every((i) => /^\.\/|^\.\.\/contracts\//.test(i)));
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

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
