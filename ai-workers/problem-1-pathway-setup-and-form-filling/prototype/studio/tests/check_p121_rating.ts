// QA-176 (G-CORE B3 part A; P-121, C11.14): the one rating every proposal is held to at the door (engine/agreement.ts
// p121Rating, called by api/src/proposals.ts insertProposals) and the bulk guard (bulkWhy). An AI item is Ready only when
// both rounds were read, they agree, and the rules ran and all passed; a one-round item is never Ready and never ticked
// with others, and the box says why. A passing and a failing case per P-121 case. No server, no database, US$0.
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/check_p121_rating.ts
import { p121Rating, P121_WHY, type Rateable } from "../engine/agreement.ts";
import { bulkWhy } from "../api/src/proposals.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const R = { reading: "Family name of the applicant", payload: { kind: "field" }, from: "replay", runFile: "runs/test.json", costUsd: 0 };
const PASSED = [{ rule: "quote_found", passed: true, why: null }];
const base: Rateable = { origin: "ai", agreement: "agreed", rounds: { draft: R, check: R }, rules: PASSED, confidence: "ready", reason: null };
const rate = (over: Partial<Rateable>) => p121Rating({ ...base, ...over });

let r = rate({});
ok("P-121 pass: both rounds read and agree, the rules ran and passed: Ready, no reason", r.confidence === "ready" && r.reason === null, r);
r = rate({ agreement: "one_round", rounds: { draft: null, check: null } });
ok("P-121 fail (QA-176): a one-round item rated Ready by its producer (the saved field-map runs) is Decide, \"Needs a checker round\"", r.confidence === "decide" && r.reason === P121_WHY.oneRound, r);
r = rate({ agreement: "one_round", rounds: { draft: R, check: null }, reason: "Reuses Family name." });
ok("P-121 fail: one round with its draft reading: Decide, the checker words first and the producer's reason kept", r.confidence === "decide" && r.reason === `${P121_WHY.oneRound} Reuses Family name.`, r);
r = rate({ rounds: { draft: R, check: null } });
ok("P-121 fail: \"agreed\" but the checker round is missing: never Ready (Decide, needs a checker round)", r.confidence === "decide" && r.reason === P121_WHY.oneRound, r);
r = rate({ rounds: { draft: null, check: null } });
ok("P-121 fail: \"agreed\" with no AI reading saved at all: never Ready (Decide, says no reading is saved)", r.confidence === "decide" && r.reason === P121_WHY.noRounds, r);
r = rate({ agreement: "differ" });
ok("P-121 fail: the two readings differ: Decide (Low), a person chooses", r.confidence === "decide" && r.reason === P121_WHY.differ, r);
r = rate({ rules: [] });
ok("P-121 fail: both rounds agree but no rules check was recorded: Check", r.confidence === "check" && r.reason === P121_WHY.noRules, r);
r = rate({ rules: [...PASSED, { rule: "type_and_options", passed: false, why: "The form takes a date here, not text." }] });
ok("P-121 fail: a rule did not pass: Check, with the rule's own reason", r.confidence === "check" && /A rule did not pass \(The form takes a date here, not text\.\)/.test(r.reason ?? ""), r);
r = rate({ agreement: "one_round", confidence: "check", reason: "Check the checklist line." });
ok("P-121 pass: an item its producer already rated Check (or Decide) keeps its own rating and words", r.confidence === "check" && r.reason === "Check the checklist line.", r);
r = rate({ origin: "rules", agreement: "rules_only", rounds: { draft: null, check: null }, rules: [] });
ok("P-121 pass: an item the rules made (no AI reading) is not an AI review item: its rating is kept", r.confidence === "ready", r);
r = rate({ agreement: "one_round", rounds: { draft: null, check: null }, reason: "x".repeat(600) });
ok("P-121: the reason stays within the contract's 500 characters", (r.reason ?? "").length === 500 && r.reason!.startsWith(P121_WHY.oneRound), (r.reason ?? "").length);
// Pure: the input is not changed.
const input: Rateable = { ...base, agreement: "one_round" }; const copy = JSON.stringify(input); p121Rating(input);
ok("P-121: rating never changes its input", JSON.stringify(input) === copy);

// The bulk guard: what the box says (an item stored Ready before the fix is still never ticked with others).
const row = { confidence: "ready" as const, origin: "ai" as const, landsOn: "library" as const, step: "field_map_edition" };
ok("P-121 pass: an agreed Ready AI item can be ticked with others", bulkWhy({ ...row, agreement: "agreed" }) === null, bulkWhy({ ...row, agreement: "agreed" }));
ok("P-121 fail (QA-176): a one-round item stored Ready is never ticked with others; the box says it needs a checker round", bulkWhy({ ...row, agreement: "one_round" }) === P121_WHY.oneRound, bulkWhy({ ...row, agreement: "one_round" }));
ok("P-121 fail: a Ready item whose readings differ is never ticked with others", bulkWhy({ ...row, agreement: "differ" }) === P121_WHY.differ);
ok("P-121 pass: a Decide one-round item keeps its own words (its source leaves it to a person)", /leaves it to a person/.test(bulkWhy({ ...row, confidence: "decide", agreement: "one_round" }) ?? ""), bulkWhy({ ...row, confidence: "decide", agreement: "one_round" }));

console.log(`\n${pass} PASS ${fail} FAIL`);
process.exit(fail ? 1 : 0);
