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

// ---- C10.2 (Adobe Validate on the finished story's Paper copy, 9 Nov): IMM 5257 (09-2023)'s own scripts, as gates, for
// every status the form lists. validateCOR empties the status for a date beside Citizen, Permanent resident, Protected
// Person or Refugee Claimant, and (with validateCWA) for "Other" details beside any status but Other. The statuses are the
// form's own list of values, read from its committed inventory (p1/inventory/imm5257e.inventory.json), never typed here.
const i5257 = data.editions.find((e) => e.form === "IMM 5257")!;
const PD = "form1[0].Page1[0].PersonalDetails[0].";
const inv5257 = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "p1", "inventory", "imm5257e.inventory.json"), "utf8")) as { fields: { data_path: string | null; options_resolved: [string, string][] | null }[] };
const statusList = (path: string) => (inv5257.fields.find((f) => f.data_path === path)?.options_resolved ?? []).filter(([label]) => label);
const current = statusList(`${PD}CurrentCOR[0].Row2[0].Status[0]`), applying = statusList(`${PD}CountryWhereApplying[0].Row2[0].Status[0]`);
const gate5257 = (box: string) => i5257.gates!.find((x) => x.box === PD + box)!.gate;
const at = (box: string, fact: string, label: string) => evaluate(gate5257(box), { [fact]: label }, []).result;
const NO_DATES = ["01", "02", "07", "08"]; // validateCOR's "negative case" statuses, by the form's own codes
const CUR = "person.current_residence_status", APP = "person.applying_from_status";
// The status gates are page 1's (questions 7 and 9 B); C10.2's 10 Nov gates (Details of visit, Background Information) follow.
const statusGates = i5257.gates!.filter((x) => x.box.startsWith(PD));
ok("B107-27 setup: the form lists 9 statuses for questions 7 and 9 B, and the data gates 4 of its page 1 form fields", current.length === 9 && applying.length === 9 && statusGates.length === 4, { current: current.length, applying: applying.length, page1: statusGates.length });
const dates = current.map(([label, code]) => ({ label, code, from: at("CurrentCOR[0].Row2[0].FromDate[0]", CUR, label), to: at("CurrentCOR[0].Row2[0].ToDate[0]", CUR, label) }));
ok("B107-28 pass: question 7's From and To are written for Visitor, Worker, Student, Other and Foreign National (03, 04, 05, 06, 09)", dates.filter((x) => !NO_DATES.includes(x.code)).every((x) => x.from === true && x.to === true), dates);
ok("B107-29 fail: and never beside Citizen, Permanent resident, Protected Person or Refugee Claimant (01, 02, 07, 08)", dates.filter((x) => NO_DATES.includes(x.code)).length === 4 && dates.filter((x) => NO_DATES.includes(x.code)).every((x) => x.from === false && x.to === false), dates);
const other = [...current.map(([label, code]) => ({ q: "7", label, code, holds: at("CurrentCOR[0].Row2[0].Other[0]", CUR, label) })), ...applying.map(([label, code]) => ({ q: "9 B", label, code, holds: at("CountryWhereApplying[0].Row2[0].Other[0]", APP, label) }))];
ok("B107-30 pass: the \"Other\" details of questions 7 and 9 B are written when the status is Other (06)", other.filter((x) => x.code === "06").length === 2 && other.filter((x) => x.code === "06").every((x) => x.holds === true), other.filter((x) => x.code === "06"));
ok("B107-31 fail: and beside no other status (8 each)", other.filter((x) => x.code !== "06").length === 16 && other.filter((x) => x.code !== "06").every((x) => x.holds === false), other.filter((x) => x.holds !== false && x.code !== "06"));
ok("B107-32 pass: before the status is answered a gate cannot tell, so the question stays asked and nothing is written", ["CurrentCOR[0].Row2[0].FromDate[0]", "CurrentCOR[0].Row2[0].Other[0]"].every((b) => evaluate(gate5257(b), {}, []).result === "cannot_tell"));
const named = JSON.stringify(statusGates.map((x) => x.gate)).match(/"value":(\[[^\]]*\]|"[^"]*")/g)!.flatMap((m) => [JSON.parse(m.slice(8))].flat() as string[]);
ok("B107-33 fail: every status a gate names is a label of the form's own list, letter for letter (a gate compares exactly)", new Set(named).size === 5 && named.every((v) => current.some(([label]) => label === v)), named);
ok("B107-34 fail (review B1): no IMM 5257 source shows an escaped quote, and each quotes the form's own script", statusGates.every((x) => !x.cite.includes("\\") && /IMM 5257 \(09-2023\) p\. 1/.test(x.cite) && /oStatus\.rawValue = null/.test(x.cite)));

// ---- C10.2 (the tech lead's Adobe Validate on the story's Paper copy, 10 Nov): "-Details Of Visit- … 1a) Purpose of my
// visit" after "not required". IMM 5257 (09-2023)'s validateDetailsOfVisit empties the purpose for "Other" details beside
// any purpose but Other (03); validateBackGroundInformation empties question 2's, 3's and 4's Yes/No boxes for details
// beside No. Each Validate shows only its first such message, so every box the script empties is gated, both sides tested.
const P3 = "form1[0].Page3[0].";
const g10 = (box: string) => i5257.gates!.find((x) => x.box === P3 + box);
const OTHER_BOX = "DetailsOfVisit[0].PurposeRow1[0].Other[0].Other[0]", Q2D = "BackgroundInfo2[0].Details[0].refusedDetails[0]", Q3B = "PageWrapper[0].BackgroundInfo3[0].details[0]", Q4B = "PageWrapper[0].Military[0].militaryServiceDetails[0]";
const purposes = (inv5257.fields.find((f) => f.data_path === `${P3}DetailsOfVisit[0].PurposeRow1[0].PurposeOfVisit[0].PurposeOfVisit[0]`)?.options_resolved ?? []).filter(([label]) => label);
const PURPOSE = "case.visit_purpose";
ok("B107-35 setup: the form lists 9 purposes of visit, Other among them as 03, and the data gates the four boxes the script empties beside them", purposes.length === 9 && purposes.some(([l, c]) => l === "Other" && c === "03") && [OTHER_BOX, Q2D, Q3B, Q4B].every((b) => !!g10(b)), { purposes: purposes.length });
const byPurpose = purposes.map(([label, code]) => ({ label, code, holds: evaluate(g10(OTHER_BOX)!.gate, { [PURPOSE]: label }, []).result }));
ok("B107-36 pass: question 1 b) \"Other\" details are written when the purpose is Other (03)", byPurpose.filter((x) => x.code === "03").length === 1 && byPurpose.filter((x) => x.code === "03").every((x) => x.holds === true), byPurpose);
ok("B107-37 fail: and beside none of the 8 other purposes (Family Visit, the story's, among them)", byPurpose.filter((x) => x.code !== "03").length === 8 && byPurpose.filter((x) => x.code !== "03").every((x) => x.holds === false) && byPurpose.some((x) => x.label === "Family Visit" && x.holds === false), byPurpose.filter((x) => x.holds !== false && x.code !== "03"));
const Q2 = ["person.overstayed_or_unauthorized_in_canada", "person.refused_visa_entry_or_removed", "person.previously_applied_to_canada"];
const allNo = Object.fromEntries(Q2.map((f) => [f, false]));
const q2 = (facts: Record<string, unknown>) => evaluate(g10(Q2D)!.gate, facts, []).result;
ok("B107-38 pass: question 2 d) details are written when any one of 2 a), 2 b), 2 c) is Yes", Q2.every((f) => q2({ ...allNo, [f]: true }) === true));
ok("B107-39 fail: and not beside three No answers (the story's)", q2(allNo) === false);
const one = (box: string, fact: string, v: unknown) => evaluate(g10(box)!.gate, { [fact]: v }, []).result;
ok("B107-40 pass: question 3 b) and 4 b) details are written after a Yes to 3 a) and 4 a)", one(Q3B, "person.criminal_history", true) === true && one(Q4B, "person.military_service", true) === true);
ok("B107-41 fail: and not after a No", one(Q3B, "person.criminal_history", false) === false && one(Q4B, "person.military_service", false) === false);
ok("B107-42 pass: before the deciding answer a gate cannot tell, so the question stays asked and nothing is written", [OTHER_BOX, Q2D, Q3B, Q4B].every((b) => evaluate(g10(b)!.gate, {}, []).result === "cannot_tell"));
ok("B107-43 fail: each 10 Nov source quotes the form's own script that empties the box beside it, read 10 Nov 2026, with no escaped quote", [OTHER_BOX, Q2D, Q3B, Q4B].every((b) => { const c = g10(b)!.cite; return !c.includes("\\") && /^IMM 5257 \(09-2023\)/.test(c) && /Read 10 Nov 2026\.$/.test(c) && /rawValue = null/.test(c) && /negative/i.test(c); }));

// ---- C10.2 (the founder's Adobe Validate of the story's Paper copy, 10 Nov: the read-back found Languages c) empty where
// the product wrote 01). IMM 5257 (09-2023)'s validateLanguageSection calls util.enableField(c, false) for any answer to b)
// but Both, and the form's util.enableField empties a field it disables (rawValue = null), without a message.
const LANG = `form1[0].Page2[0].MaritalStatus[0].SectionA[0].Languages[0].languages[0].`;
const cGate = i5257.gates!.find((x) => x.box === `${LANG}lov[0]`);
const ability = (inv5257.fields.find((f) => f.data_path === `${LANG}ableToCommunicate[0].ableToCommunicate[0]`)?.options_resolved ?? []).filter(([label]) => label);
const byAbility = ability.map(([label]) => ({ label, holds: cGate ? evaluate(cGate.gate, { "person.official_language_ability": label }, []).result : "no gate" }));
ok("B107-44 setup: the form lists 4 answers to Languages b) (English, French, Both, Neither) and the data gates c)", ability.length === 4 && ability.some(([l]) => l === "Both") && !!cGate, { ability: ability.map(([l]) => l), gate: !!cGate });
ok("B107-45 pass: Languages c) is written when b) is Both", byAbility.filter((x) => x.label === "Both").every((x) => x.holds === true) && byAbility.some((x) => x.label === "Both"), byAbility);
ok("B107-46 fail: and not beside English, French or Neither (the story's Paper person answers English)", byAbility.filter((x) => x.label !== "Both").length === 3 && byAbility.filter((x) => x.label !== "Both").every((x) => x.holds === false), byAbility);
ok("B107-47 pass: before b) is answered the gate cannot tell, so c) stays asked and is not written", !!cGate && evaluate(cGate.gate, {}, []).result === "cannot_tell");
ok("B107-48 fail: its source quotes the script that disables c) and the form's own enableField that empties it, read 10 Nov 2026, with no escaped quote", !!cGate && !cGate.cite.includes("\\") && /validateLanguageSection/.test(cGate.cite) && /oField\.rawValue = null/.test(cGate.cite) && /Read 10 Nov 2026\.$/.test(cGate.cite));

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
