// BK-8 (P-448, P-452; Bake Track 2 row 22): who is exempt from biometrics comes from each pathway's own fee rows (the
// line its combination lists for the biometrics step, `step: "biometrics"` in samples/fee-table.json), never the
// Visitor visa's: the prepare view's biometrics step and its "waits for the date of birth" words read the case's own
// combination's line (api/src/case-prepare.ts had feeRule("vv.single", "biometrics") at line 29, B164's BK-8 entry, now
// gone). The Visitor visa's result is unchanged (none under 14 or over 79, IRCC's "When to give biometrics: temporary
// residents", read 2026-03-30). The other pathway's line below (ages 18 and 60) is test scaffolding in a copy of the
// table, Sample, never shipped (P-170). Pure: no server, no database; US$0.
//   tsx studio/tests/check_bk8_biometrics_ages.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FEE_TABLE, feeRule, rulesFrom, soundLine, stepRule, type FeeTable } from "../engine/runtime/filings.ts";
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

// ── Another pathway's exemption comes from its own fee rows, in the same table: a copy where the work permit with an
// LMIA lists its own biometrics line (other ages, 18 and 60, and its own page; Sample scaffolding) and the Visitor visa
// keeps the shipped one.
const other: FeeTable = structuredClone(FEE_TABLE);
const shipped = other.lines.find((l) => l.key === "biometrics")!;
other.lines.push({ ...structuredClone(shipped), key: "biometrics_test", exempt: { ...structuredClone(shipped.exempt!), under_age: 18, over_age: 60, source: { ...shipped.exempt!.source, page: "Sample page for the test" } } });
other.combinations["wp.lmia_inside"] = { ...other.combinations["wp.lmia_inside"], lines: ["work_permit", "biometrics_test"] };
const rules = (k: string) => rulesFrom(other, k);
const wp = stepRule("wp.lmia_inside", BIOMETRICS_STEP.key, rules), vvThere = stepRule("vv.single", BIOMETRICS_STEP.key, rules);
ok("BK-8 pass: the shipped table marks the Visitor visa's biometrics line with its step, and the prepare view's lookup finds it",
  stepRule("vv.single", BIOMETRICS_STEP.key)?.key === "biometrics" && JSON.stringify(stepRule("vv.single", BIOMETRICS_STEP.key)?.exempt) === JSON.stringify(vv?.exempt));
ok("BK-8 pass: in one table, each pathway's biometrics rule is its own line: the work permit's 18 and 60, the Visitor visa's still 14 and 79",
  wp?.key === "biometrics_test" && wp.exempt?.underAge === 18 && wp.exempt.overAge === 60 && vvThere?.key === "biometrics" && vvThere.exempt?.underAge === 14 && vvThere.exempt.overAge === 79, { wp: wp?.exempt, vv: vvThere?.exempt });
ok("BK-8 pass: the other pathway's step follows its own ages: 18 to 60 give biometrics, 16 and 61 do not",
  JSON.stringify(steps(wp, { a16: 16, a18: 18, a60: 60, a61: 61, none: null })) === JSON.stringify({ a16: "no", a18: "yes", a60: "yes", a61: "no", none: "waits" }), steps(wp, { a16: 16, a18: 18, a60: 60, a61: 61, none: null }));
ok("BK-8 pass: in the same table the Visitor visa's step is unchanged (14 to 79)", JSON.stringify(steps(vvThere, AGES)) === JSON.stringify(steps(vv, AGES)));
ok("BK-8 pass: the other pathway's waiting words name its own ages and its own page, never 14, 79 or the Visitor visa's page",
  biometricsWaits(wp) === "Waits for the date of birth: no biometrics under 18 or over 60 (IRCC, Sample page for the test).", biometricsWaits(wp));
ok("BK-8 fail: the Visitor visa's ages would decide wrongly for that pathway (a 16-year-old and a 61-year-old would be asked for biometrics)",
  steps(vv, { a16: 16, a61: 61 }).a16 === "yes" && steps(vv, { a16: 16, a61: 61 }).a61 === "yes" && biometricsWaits(vv) !== biometricsWaits(wp));
ok("BK-8 fail: a pathway whose fee rows list no biometrics line gives nobody a biometrics step, whatever the Visitor visa lists",
  stepRule("fs.spouse", BIOMETRICS_STEP.key, rules) === undefined && Object.values(steps(stepRule("fs.spouse", BIOMETRICS_STEP.key, rules), AGES)).every((x) => x === "no"));
const unstepped: FeeTable = structuredClone(other); unstepped.lines.find((l) => l.key === "biometrics_test")!.step = undefined;
ok("BK-8 fail: a line that does not name the step is no biometrics step, even when its key says biometrics", stepRule("wp.lmia_inside", BIOMETRICS_STEP.key, (k) => rulesFrom(unstepped, k)) === undefined);
const twice: FeeTable = structuredClone(other); twice.combinations["wp.lmia_inside"].lines = ["work_permit", "biometrics_test", "biometrics"];
ok("BK-8 fail: a combination listing two lines for the same step is not derived (which ages apply would be left to chance)", rulesFrom(twice, "wp.lmia_inside") === undefined && rulesFrom(other, "wp.lmia_inside") !== undefined);
const blankStep: FeeTable = structuredClone(other); blankStep.lines.find((l) => l.key === "biometrics_test")!.step = " ";
const noPage: FeeTable = structuredClone(other); (noPage.lines.find((l) => l.key === "biometrics_test")!.exempt!.source as { page?: string }).page = undefined;
ok("BK-8 fail: a blank step, or an exemption whose source names no page, makes the line unsound (never \"(IRCC, undefined)\")",
  rulesFrom(blankStep, "wp.lmia_inside") === undefined && rulesFrom(noPage, "wp.lmia_inside") === undefined && !soundLine(noPage.lines.find((l) => l.key === "biometrics_test")));
ok("BK-8 pass: a rule without ages names no age in its words (it never waits)", biometricsWaits(undefined) === "Waits for the date of birth." && biometricsWaits({ ...vv!, exempt: undefined }) === "Waits for the date of birth.");

// ── Review m1: the shipped table's steps are ones the prepare view knows, and a biometrics line names its step (a missing
// or misspelt step would charge the fee and give nobody the "Give biometrics" step, in silence).
const KNOWN_STEPS = new Set<string>([BIOMETRICS_STEP.key]);
const stepsIn = (t: FeeTable) => t.lines.filter((l) => l.step !== undefined).map((l) => l.step);
const unmarked = (t: FeeTable) => t.lines.filter((l) => /biometric/i.test(`${l.key} ${l.label}`) && l.step !== BIOMETRICS_STEP.key).map((l) => l.key);
ok("BK-8 pass: every step the shipped table names is one the prepare view knows, and every biometrics line names its step",
  stepsIn(FEE_TABLE).length >= 1 && stepsIn(FEE_TABLE).every((x) => KNOWN_STEPS.has(x!)) && unmarked(FEE_TABLE).length === 0, { steps: stepsIn(FEE_TABLE), unmarked: unmarked(FEE_TABLE) });
const misspelt: FeeTable = structuredClone(FEE_TABLE); misspelt.lines.find((l) => l.key === "biometrics")!.step = "biometric";
const missing: FeeTable = structuredClone(FEE_TABLE); delete missing.lines.find((l) => l.key === "biometrics")!.step;
ok("BK-8 fail: a misspelt step, or a biometrics line without one, is named by this check",
  !stepsIn(misspelt).every((x) => KNOWN_STEPS.has(x!)) && unmarked(misspelt).includes("biometrics") && unmarked(missing).includes("biometrics"));

// ── The prepare view reads one rule, the case's own combination's, for the items and their words (code, comments left out).
const code = readFileSync(join(ROOT, "api/src/case-prepare.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const calls = [...code.matchAll(/stepRule\(([^,]+),\s*BIOMETRICS_STEP\.key\)/g)].map((m) => m[1].trim());
ok("BK-8 pass: case-prepare.ts reads the biometrics rule once, by its step, from the case's own combination (own!.combinationKey)", calls.length === 1 && calls[0] === "own!.combinationKey" && !/feeRule\(/.test(code), calls);
ok("BK-8 pass: that one rule feeds both the biometrics items and their waiting words", /wantedItems\([^;]*\bbio, ages\)/.test(code) && /biometricsWaits\(bio\)/.test(code) && !/bioAges/.test(code));
ok("BK-8 fail: the Visitor visa's key is not in case-prepare.ts's code any more", !/"vv\.single"/.test(code));

process.exitCode = summary() ? 1 : 0;
