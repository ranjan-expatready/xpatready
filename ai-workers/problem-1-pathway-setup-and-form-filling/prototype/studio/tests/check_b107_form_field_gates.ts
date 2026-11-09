// B107 (QA-296, QA-299, QA-300; C6.11, C7.7): offline checks of a form field's gate (engine/form-field-condition.ts boxGate,
// gateProblems, rulesInForce), of its release words (engine/validate.ts) and of the cited data the configured checkpoint
// proposes (samples/form-field-gates.json). Each rule with a passing and a failing case. No server, no database, no model
// call (US$0). The filled copies on the checkpoint: tests/forms/check_b107_representative_copies.ts.
//   tsx studio/tests/check_b107_form_field_gates.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { evaluate, type PredicateNode } from "../../contracts/rules.ts";
import { boxGate, gateProblems, rulesInForce } from "../engine/form-field-condition.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { runTransform } from "../../p5/transforms.ts";

let failed = 0;
const ok = (label: string, cond: boolean, detail: unknown = "") => { if (!cond) failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${label}${cond ? "" : ` — ${JSON.stringify(detail).slice(0, 400)}`}`); };

type Gate = { box: string; gate: PredicateNode; words: string; cite: string };
const data = JSON.parse(readFileSync(join(import.meta.dirname, "..", "samples", "form-field-gates.json"), "utf8")) as { editions: { form: string; edition: string; gates?: Gate[]; byHand?: { under: string; words: string; cite: string }[] }[] };
const i5476 = data.editions.find((e) => e.form === "IMM 5476")!, i5475 = data.editions.find((e) => e.form === "IMM 5475")!;
const gateOn = (suffix: string) => i5476.gates!.find((g) => g.box.endsWith(suffix))!.gate;
/** A gate as the copy reads it: on the representative's own facts (the firm record's, or none). */
const holds = (suffix: string, facts: Record<string, unknown>) => evaluate(gateOn(suffix), facts, []).result;

// ---- The rule: what a gate is.
const g = { gate: { op: "eq", field: "representative.licensing_body", value: "cicc" }, words: "the representative is a CICC member", cite: "IMM 5476 p. 1, question 6 (ii), quoted" };
ok("B107-1 pass: a form field's gate is read from { gate, words }", JSON.stringify(boxGate(g)) === JSON.stringify(g.gate));
ok("B107-2 fail: B86's own rule (a bare condition), the AI's words, nothing, or a gate with no words is no gate", boxGate(g.gate) === null && boxGate("Only when the compensated representative is a CICC member") === null && boxGate(null) === null && boxGate({ gate: g.gate }) === null);

const known = (f: string) => ["representative.licensing_body", "representative.uncompensated_category", "person.fax_number"].includes(f);
ok("B107-3 pass: a cited gate on library facts has no problem", gateProblems(g, known).length === 0, gateProblems(g, known));
ok("B107-4 fail: a gate on a fact the library does not hold is refused, naming it", gateProblems({ ...g, gate: { op: "eq", field: "representative.is_paid", value: true } }, known).some((p) => /"representative\.is_paid", which is not in the shared library/.test(p)));
ok("B107-5 fail: a gate with no source quoted, or without the form's own words, is refused (P-170)", gateProblems({ ...g, cite: "" }, known).some((p) => /no source is quoted/.test(p)) && gateProblems({ ...g, words: "x" }, known).some((p) => /form's own words/.test(p)));
ok("B107-6 fail: a gate that is not a condition the rules can run is refused", gateProblems({ ...g, gate: { op: "matches", field: "representative.licensing_body", value: "c.*" } }, known).some((p) => /not a condition the rules can run/.test(p)));
ok("B107-7 fail: a gate naming its own subject is refused (it is read about its form field's person)", gateProblems({ ...g, gate: { subjectKind: "CASE", ...g.gate } }, known).some((p) => /carries no subjectKind/.test(p)));
ok("B107-8 fail: a gate and filled by hand together, or neither, is refused", gateProblems({ ...g, byHand: true }, known).some((p) => /not both/.test(p)) && gateProblems({ words: g.words, cite: g.cite }, known).some((p) => /not both/.test(p)));
ok("B107-9 pass: filled by hand with the form's words and a source has no problem", gateProblems({ byHand: true, words: i5475.byHand![0].words, cite: i5475.byHand![0].cite }, () => true).length === 0);

// ---- In force: a gate counts on its form field whatever its question's condition; B86's rule still needs its question's.
const snap = (entries: unknown[], placements: unknown[] = []) => ({ field_maps: [{ form_number: "F", form_edition: "F (1)", entries }], placements } as unknown as Snapshot);
const gated = { data_path: "a", fact: "representative.membership_id", outcome: "mapped", condition_rule: g };
const b86 = { data_path: "b", fact: "person.x", outcome: "mapped", condition_rule: { op: "eq", field: "person.y", value: true } };
const inForce = rulesInForce(snap([gated, b86, { ...gated, data_path: "c", outcome: "by_hand" }]), "F", "F (1)");
ok("B107-10 pass: a gate is in force on its mapped form field, as its condition (not the stored wrapper)", JSON.stringify(inForce.get("a")) === JSON.stringify(g.gate));
ok("B107-11 fail: a B86 rule whose question holds no such condition is not in force (unchanged), nor a gate on an unmapped form field", !inForce.has("b") && !inForce.has("c"), [...inForce.keys()]);
const asked = rulesInForce(snap([b86], [{ fact: "person.x", condition: b86.condition_rule }]), "F", "F (1)");
ok("B107-12 pass: B86's rule equal to its question's SHOW condition is still in force", asked.has("b"));

// ---- The data: IMM 5476 (11-2021)'s own scripts, as gates (QA-299, QA-300).
const CICC = { "representative.licensing_body": "cicc", "representative.membership_id": "R000000" };
const LAW = { "representative.licensing_body": "law_society" }, NOTAIRE = { "representative.licensing_body": "chambre_notaires_quebec" };
const UNPAID = { "representative.uncompensated_category": "licensed_member" };
ok("B107-13 pass (QA-299): a CICC representative's number goes in the CICC box only", holds("questionII[0].ICCRCMember[0]", CICC) === true && holds("questionII[0].membership[0]", CICC) === false && holds("questionII[0].quebecLaw[0]", CICC) === false && holds("questionI[0].membership[0]", CICC) === false);
ok("B107-14 pass: a law society member's number and province go in the law society's boxes only", holds("questionII[0].membership[0]", LAW) === true && holds("questionII[0].province[0]", LAW) === true && holds("questionII[0].ICCRCMember[0]", LAW) === false && holds("questionII[0].quebecLaw[0]", LAW) === false);
ok("B107-15 pass: a notary's number goes in the Chambre des notaires' box only", holds("questionII[0].quebecLaw[0]", NOTAIRE) === true && holds("questionII[0].ICCRCMember[0]", NOTAIRE) === false && holds("questionII[0].membership[0]", NOTAIRE) === false);
ok("B107-16 pass: an uncompensated licensed member's number goes in part (i), never part (ii)", holds("questionI[0].membership[0]", UNPAID) === true && holds("questionI[0].province[0]", UNPAID) === true && holds("questionII[0].compensated[0]", UNPAID) === false);
ok("B107-17 fail (QA-300): for a compensated representative part (i) is not needed: its category, other and province are never asked", holds("questionI[0].uncompensated[0]", CICC) === false && holds("questionI[0].otherRep[0]", CICC) === false && holds("questionI[0].province[0]", CICC) === false);
ok("B107-18 fail (QA-300): the student-at-law boxes only for a law society member; fax only when the office has one", holds("question7[0].lawyer[0]", CICC) === false && holds("question7[0].membershipID[0]", CICC) === false && holds("question7[0].lawyer[0]", LAW) === true
  && holds("question7[0].faxNumber[0]", CICC) === false && holds("question7[0].faxCountryCode[0]", { ...CICC, "person.fax_number": "4165550199" }) === true);
const membership = i5476.gates!.filter((x) => /question6\[0\]\.question(I|II)\[0\]\.(ICCRCMember|membership|quebecLaw)\[0\]$/.test(x.box));
ok("B107-19 pass: every membership box of question 6 has a gate (4), each cited with the form's words and its own script", membership.length === 4 && membership.every((x) => gateProblems(x, () => true).length === 0 && /IMM 5476 \(11-2021\) p\. 1/.test(x.cite) && /script/.test(x.cite)), membership.map((x) => x.box));
ok("B107-20 pass: every entry of the data passes the guard (words, a source, a runnable gate)", data.editions.every((e) => [...(e.gates ?? []), ...(e.byHand ?? []).map((b) => ({ ...b, byHand: true }))].every((x) => gateProblems(x, () => true).length === 0)));
// QA-296: IMM 5475's designated individual is written by hand, from IRCC's own words.
ok("B107-21 pass (QA-296): IMM 5475's part 5 is filled by hand, quoting IRCC (\"someone who will not act as your representative\")", i5475.byHand?.[0]?.under === "IMM_5475[0].Page1[0].Five[0]." && /someone who will not act as your representative/.test(i5475.byHand[0].cite));

// ---- The filler runs the 11-2021 map's own steps for question 7 (review m2): a length check and digits only.
const run = (t: string, v: unknown) => runTransform(t, v, {}) as { ok: boolean; value?: unknown; hand?: boolean; reason?: string };
ok("B107-22 pass: \"as_is; max 30 characters\" writes a value of 30 characters or fewer as it is", run("as_is; max 30 characters", "Toronto").value === "Toronto");
ok("B107-23 fail: a longer value is written by hand, never cut", run("as_is; max 10 characters", "Example Street 12345").hand === true && /never truncated/.test(run("as_is; max 10 characters", "Example Street 12345").reason ?? ""));
ok("B107-24 pass: \"digits_only\" writes the digits (\"+1\" → \"1\")", run("digits_only", "+1").value === "1" && run("digits_only", "1").value === "1");
ok("B107-25 fail: a value with no digits is written by hand", run("digits_only", "abc").hand === true);
ok("B107-26 pass: a step that ran before still runs the same (as_is with its own max, a date)", run("as_is (max 5 chars)", "abcdef").hand === true && run("date:YYYY-MM-DD", "1990-04-12").value === "1990-04-12");

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
