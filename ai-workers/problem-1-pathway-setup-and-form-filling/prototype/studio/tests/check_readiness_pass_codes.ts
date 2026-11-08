// B162 guard (the tech lead's ruling on #1318, Lead 34): the database's readiness_pass checks list exactly the warning codes
// the engine knows. Each migration that adds a code rewrites both checks in full, so a migration written from an older
// list silently drops a code another PR added (#1318's breaker replayed it: B162's first migration dropped
// 'fields_left_empty'). Here the newest migration that sets each check is read, its code list parsed, and compared with
// engine/runtime/readiness.ts: readiness_pass_known_code_check = WARN_CODES, and the CRITICAL list of
// readiness_pass_severity_matches_check = CRITICAL_CODES. Pure: files only, no database, no server (US$0).
//   tsx studio/tests/check_readiness_pass_codes.ts
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { CRITICAL_CODES, WARN_CODES } from "../engine/runtime/readiness.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const DIR = join(import.meta.dirname, "..", "prisma", "migrations");
const migrations = readdirSync(DIR).filter((d) => existsSync(join(DIR, d, "migration.sql"))).sort();

/** The code list a migration gives one check (its last ADD CONSTRAINT of that name), or null when it does not set it. */
export function listOf(sql: string, check: string): string[] | null {
  const adds = [...sql.matchAll(new RegExp(`ADD CONSTRAINT "${check}" CHECK \\(([^;]*)\\);`, "g"))];
  if (!adds.length) return null;
  const body = adds[adds.length - 1][1];
  // The severity check reads ("severity" = 'critical') = ("code" IN (...)); the known-codes check ("code" IN (...)).
  const inList = /"code" IN \(([^)]*)\)/.exec(body);
  return inList ? [...inList[1].matchAll(/'([^']*)'/g)].map((m) => m[1]) : [];
}
/** The newest migration that sets a check, and its list. */
function newest(check: string): { migration: string; codes: string[] } | null {
  for (const m of [...migrations].reverse()) { const codes = listOf(readFileSync(join(DIR, m, "migration.sql"), "utf8"), check); if (codes) return { migration: m, codes }; }
  return null;
}
const diff = (a: readonly string[], b: readonly string[]) => ({ missing: b.filter((x) => !a.includes(x)), extra: a.filter((x) => !b.includes(x)) });
const same = (a: readonly string[], b: readonly string[]) => a.length === new Set(a).size && !diff(a, b).missing.length && !diff(a, b).extra.length;

const known = newest("readiness_pass_known_code_check"), crit = newest("readiness_pass_severity_matches_check");
ok(`B162 pass: the newest passable-codes check (${known?.migration ?? "none"}) lists exactly the engine's WARN_CODES (${WARN_CODES.length})`, !!known && same(known.codes, WARN_CODES), known && diff(known.codes, WARN_CODES));
ok(`B162 pass: the newest severity check (${crit?.migration ?? "none"}) lists exactly the engine's CRITICAL_CODES (${CRITICAL_CODES.length}) as critical`, !!crit && same(crit.codes, CRITICAL_CODES), crit && diff(crit.codes, CRITICAL_CODES));
// The guard's own fail cases: a list that drops a code, adds an unknown one or repeats one is never "the same".
ok("B162 fail: a list that drops a code, adds an unknown code or repeats one is refused", !same(WARN_CODES.slice(1), WARN_CODES) && !same([...WARN_CODES, "no_such_code"], WARN_CODES) && !same([...WARN_CODES, WARN_CODES[0]], WARN_CODES));
ok("B162 fail: the parser reads both shapes and the last of two ADD CONSTRAINTs in one migration", JSON.stringify(listOf(`ALTER TABLE "readiness_pass" ADD CONSTRAINT "x_check" CHECK ("code" IN ('a', 'b')); ALTER TABLE "readiness_pass" ADD CONSTRAINT "x_check" CHECK (("severity" = 'critical') = ("code" IN ('c')));`, "x_check")) === JSON.stringify(["c"]) && listOf("nothing", "x_check") === null);
process.exitCode = summary() ? 1 : 0;
