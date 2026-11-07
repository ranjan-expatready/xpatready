// C8.1 signed PDFs (runtime lane, M3-F): the pure rules of engine/runtime/signing.ts, each with a passing and a failing
// case: who signs in words (from SH3's R7, never a copy of it), the order of the steps, and an item's state after
// signing. The routes are proved by acceptance/C8.1.test.ts on an isolated copy. No database (US$0).
//   tsx studio/tests/check_c81_signing.ts
import { readFileSync } from "node:fs";
import { minorFromAnswers, SIGN_STEPS, signedState, signersOf, stepRefusal } from "../engine/runtime/signing.ts";
import type { Person } from "../engine/resolver.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const P = (id: string, role: string): Person => ({ id, role, label: id, applies: true });
const fam = [P("A", "principal"), P("B", "spouse_or_partner"), P("K", "child")];
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

ok("C8.1 signers: a child's form signed by a parent names \"parent\"; an adult's names \"person\"", same(signersOf(fam, "K", "each_applicant", "parent_for_minor"), ["parent"]) && same(signersOf(fam, "B", "each_applicant", "parent_for_minor"), ["person"]));
ok("C8.1 signers: \"the person and the representative\" names both, though the representative is on the case team", same(signersOf(fam, "A", "each_applicant", "person_and_representative"), ["person", "representative"]));
ok("C8.1 signers: \"the principal, for the family\" names the principal for the spouse and \"person\" for the principal", same(signersOf(fam, "B", "each_applicant", "principal_for_family"), ["principal"]) && same(signersOf(fam, "A", "each_applicant", "principal_for_family"), ["person"]));
ok("C8.1 signers (fail): \"no signature\" names nobody; a person the line is not about names nobody", signersOf(fam, "A", "each_applicant", "none").length === 0 && signersOf(fam, "K", "principal_applicant", "person_and_representative").length === 0);
ok("C8.1 signers: unset means \"the person\" (R7)", same(signersOf(fam, "B", "each_applicant", null), ["person"]));

ok("C8.1 steps: print → signed → scan received → uploaded to IRCC", same(SIGN_STEPS, ["print", "signed", "scan_received", "uploaded_to_ircc"]));
ok("C8.1 steps: print first is allowed; signed after print is allowed", stepRefusal("print", {}, "F") === null && stepRefusal("signed", { print: { at: "t", by: "o" } }, "F") === null);
ok("C8.1 steps (fail): signed before print is refused in words naming print", /print F first/.test(stepRefusal("signed", {}, "F") ?? ""));
ok("C8.1 steps (fail): a step done already is refused", /already done/.test(stepRefusal("print", { print: { at: "t", by: "o" } }, "F") ?? ""));
const signed = { print: { at: "t", by: "o" }, signed: { at: "t", by: "o" } };
ok("C8.1 steps: the scan is received only by uploading it", stepRefusal("scan_received", signed, "F", { viaUpload: true }) === null && /Upload the signed scan/.test(stepRefusal("scan_received", signed, "F") ?? ""));
const scanned = { ...signed, scan_received: { at: "t", by: "o" } };
ok("C8.1 steps (BR-21): uploaded to IRCC only once the filing is Ready to file", stepRefusal("uploaded_to_ircc", scanned, "F", { filingReady: true }) === null && /Ready to file/.test(stepRefusal("uploaded_to_ircc", scanned, "F", { filingReady: false }) ?? ""));
ok("C8.1 steps (fail): uploaded to IRCC before the scan is in is refused, ready or not", /signed scan/.test(stepRefusal("uploaded_to_ircc", signed, "F", { filingReady: true }) ?? ""));

ok("C8.1 state: the scan in → Ready; uploaded → Done", signedState(scanned, "F")?.state === "ready" && signedState({ ...scanned, uploaded_to_ircc: { at: "t", by: "o" } }, "F")?.state === "done");
ok("C8.1 state (fail): printed or signed only leaves the state worked out from the facts", signedState({}, "F") === null && signedState(signed, "F") === null);

ok("C8.1 (SH3): signing.ts reads who signs from the resolver and keeps no copy of R7", /from "\.\.\/resolver\.ts"/.test(readFileSync(new URL("../engine/runtime/signing.ts", import.meta.url), "utf8")) && !/parent_for_minor/.test(readFileSync(new URL("../engine/runtime/signing.ts", import.meta.url), "utf8")));
// Devin on #617: whether a child is a minor comes from the case's own validated age; an impossible or future date is no age.
{
  const today = new Date(Date.UTC(2026, 10, 2));
  const dob = (id: string, v: unknown) => ({ subjectId: id, field: "person.date_of_birth", rowKey: null, value: v });
  const m = minorFromAnswers([dob("a", "2006-01-01"), dob("b", "2017-05-05"), dob("c", "2000-01-99"), dob("d", "2030-01-01"), dob("e", "not a date")], today);
  ok("pass (Devin on #617): a 20-year-old is not a minor; a 9-year-old is", m("a") === false && m("b") === true, [m("a"), m("b")]);
  ok("fail (Devin on #617, a31b1dfe): an impossible date (2000-01-99), a future date or no date is no age: unknown, so R7 keeps the child a minor (\"parent\")", m("c") === undefined && m("d") === undefined && m("e") === undefined && m("z") === undefined, [m("c"), m("d"), m("e"), m("z")]);
  const fam: Person[] = [{ id: "principal", role: "principal", label: "P", applies: true }, { id: "child-1", role: "child", label: "C", applies: true }];
  ok("pass: with an impossible date the child's IMM 5257 is still signed by a parent", JSON.stringify(signersOf(fam, "child-1", "each_applicant", "parent_for_minor", minorFromAnswers([dob("child-1", "2000-01-99")], today))) === JSON.stringify(["parent"]));
}
process.exit(summary() ? 1 : 0); // B129: a red line fails the suite (run-suites.sh judges the exit code)
