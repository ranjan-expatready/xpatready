// BK-8 (P-448, P-452; Bake Track 2 row 22): who is exempt from biometrics comes from each pathway's own fee rows (the
// combination's biometrics line in samples/fee-table.json), never the Visitor visa's: the prepare view's biometrics step
// and its "waits for the date of birth" words read the case's own combination's rule (api/src/case-prepare.ts had
// feeRule("vv.single", "biometrics") at line 29, B164's BK-8 entry, now gone). The Visitor visa's result is unchanged
// (none under 14 or over 79, IRCC's "When to give biometrics: temporary residents", read 2026-03-30). The other
// pathway's ages below (18 and 60) are test scaffolding in a copy of the table, Sample, never shipped (P-170).
// Pure: no server, no database; US$0.
//   tsx studio/tests/check_bk8_biometrics_ages.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FEE_TABLE, feeRule, rulesFrom, type FeeTable } from "../engine/runtime/filings.ts";
import { biometricsWaits, BIOMETRICS_STEP, wantedItems } from "../engine/runtime/prepare.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const ROOT = join(import.meta.dirname, "..");
type Rule = ReturnType<typeof feeRule>;
/** The biometrics step each person of these ages gets: "yes", "waits" (no date of birth) or "no". */
const steps = (rule: Rule, ages: Record<string, number | null>) => {
  const items = wantedItems(Object.keys(ages), [], new Map(), rule, new Map(Object.entries(ages)));
  return Object.fromEntries(Object.keys(ages).map((s) => { const i = items.find((x) => x.subject === s && x.key === BIOMETRICS_STEP.key); return [s, !i ? "no" : i.applies === true ? "yes" : "waits"]; }));
};
const AGES = { a13: 13, a14: 14, a16: 16, a60: 60, a61: 61, a79: 79, a80: 80, none: null };

// ── The Visitor visa's result is unchanged (the shipped table; R2's values: none under 14 or over 79, VV-R15)
const vv = feeRule("vv.single", "biometrics");
ok("BK-8 pass: the Visitor visa's biometrics ages are still 14 and 79, from the table's biometrics line and IRCC's page",
  vv?.exempt?.underAge === 14 && vv.exempt.overAge === 79 && vv.exempt.source.page === "When to give biometrics: temporary residents" && /under the age of 14; an applicant over the age of 79/.test(vv.exempt.source.quote), vv?.exempt);
ok("BK-8 pass: the Visitor visa's biometrics step is unchanged: 14 to 79 give them, 13 and 80 do not, no date of birth waits",
  JSON.stringify(steps(vv, AGES)) === JSON.stringify({ a13: "no", a14: "yes", a16: "yes", a60: "yes", a61: "yes", a79: "yes", a80: "no", none: "waits" }), steps(vv, AGES));
ok("BK-8 pass: the Visitor visa's waiting words name its own ages and IRCC's page",
  biometricsWaits(vv) === "Waits for the date of birth: no biometrics under 14 or over 79 (IRCC, When to give biometrics: temporary residents).", biometricsWaits(vv));

// ── Another pathway's exemption comes from its own fee rows: a copy of the table where the work permit with an LMIA
// lists a biometrics line with other ages (18 and 60, Sample scaffolding) and the Visitor visa lists none.
const other: FeeTable = structuredClone(FEE_TABLE);
const line = other.lines.find((l) => l.key === "biometrics")!;
line.exempt = { ...line.exempt!, under_age: 18, over_age: 60 };
other.combinations["wp.lmia_inside"] = { ...other.combinations["wp.lmia_inside"], lines: ["work_permit", "biometrics"] };
other.combinations["vv.single"] = { ...other.combinations["vv.single"], lines: ["visitor_visa"] };
const wp = rulesFrom(other, "wp.lmia_inside")?.fees.find((f) => f.key === "biometrics");
ok("BK-8 pass: the other pathway's rule is read from its own fee rows (18 and 60), with the Visitor visa listing no biometrics there",
  wp?.exempt?.underAge === 18 && wp.exempt.overAge === 60 && rulesFrom(other, "vv.single")?.fees.some((f) => f.key === "biometrics") === false, wp?.exempt);
ok("BK-8 pass: the other pathway's step follows its own ages: 18 to 60 give biometrics, 16 and 61 do not",
  JSON.stringify(steps(wp, { a16: 16, a18: 18, a60: 60, a61: 61, none: null })) === JSON.stringify({ a16: "no", a18: "yes", a60: "yes", a61: "no", none: "waits" }), steps(wp, { a16: 16, a18: 18, a60: 60, a61: 61, none: null }));
ok("BK-8 pass: the other pathway's waiting words name its own ages, never 14 and 79",
  biometricsWaits(wp) === "Waits for the date of birth: no biometrics under 18 or over 60 (IRCC, When to give biometrics: temporary residents).", biometricsWaits(wp));
ok("BK-8 fail: the Visitor visa's ages would decide wrongly for that pathway (a 16-year-old and a 61-year-old would be asked for biometrics)",
  steps(vv, { a16: 16, a61: 61 }).a16 === "yes" && steps(vv, { a16: 16, a61: 61 }).a61 === "yes" && biometricsWaits(vv) !== biometricsWaits(wp));
ok("BK-8 fail: a pathway whose fee rows list no biometrics gives nobody a biometrics step, whatever the Visitor visa lists",
  Object.values(steps(rulesFrom(other, "vv.single")?.fees.find((f) => f.key === "biometrics"), AGES)).every((x) => x === "no"));
ok("BK-8 pass: a rule without ages names no age in its words (it never waits)", biometricsWaits(undefined) === "Waits for the date of birth." && biometricsWaits({ ...vv!, exempt: undefined }) === "Waits for the date of birth.");

// ── The prepare view reads one rule, the case's own combination's, for the items and their words (code, comments left out).
const code = readFileSync(join(ROOT, "api/src/case-prepare.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const calls = [...code.matchAll(/feeRule\(([^,]+),\s*"biometrics"\)/g)].map((m) => m[1].trim());
ok("BK-8 pass: case-prepare.ts reads the biometrics rule once, from the case's own combination (own!.combinationKey)", calls.length === 1 && calls[0] === "own!.combinationKey", calls);
ok("BK-8 pass: that one rule feeds both the biometrics items and their waiting words", /wantedItems\([^;]*\bbio, ages\)/.test(code) && /biometricsWaits\(bio\)/.test(code) && !/bioAges/.test(code));
ok("BK-8 fail: the Visitor visa's key is not in case-prepare.ts's code any more", !/"vv\.single"/.test(code));

process.exitCode = summary() ? 1 : 0;
