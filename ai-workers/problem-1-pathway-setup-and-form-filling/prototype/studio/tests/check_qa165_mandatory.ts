// QA-165 part 2 (runtime lane): engine/runtime/mandatory.ts mandatoryOpen — each mandatory field of IRCC's form that a
// copy would leave empty is listed with why, and nothing else. Examples on IMM 5257's real field list (prototype/p1/
// inventory, IRCC's form), each rule with a passing and a failing case, then fast-check properties over generated field
// lists (STANDARDS §7 [M]: the engine changed). The end-to-end case (the API on a real Visitor visa case) is in
// tests/check_c72_imm5257_fill.ts. No server, no database (US$0).
//   tsx studio/tests/check_qa165_mandatory.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import fc from "fast-check";
import { mandatoryOpen } from "../engine/runtime/mandatory.ts";
import { openLines } from "../engine/runtime/open-lines.ts";
import { solutionFile } from "../api/src/fill.ts";
import type { BoxResult, Inventory } from "../engine/form-values.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const inv = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "p1", "inventory", "imm5257e.inventory.json"), "utf8")) as Inventory;
const mandatory = inv.fields.filter((f) => f.required && f.data_path).map((f) => f.data_path!);
const box = (path: string, over: Partial<BoxResult> = {}) => ({ box: path, caption: "", fact: "person.x", meaning: null, about: "principal", about_label: "Client A", row: null, coverage: "client question", detail: "Personal details", result: "not written", ...over }) as BoxResult;
const all = Object.fromEntries(mandatory.map((p) => [p, "x"]));
const [a, b, c, d] = mandatory;

ok("pass: IMM 5257 marks 46 form fields mandatory (the inventory, IRCC's form)", mandatory.length === 46, mandatory.length);
ok("pass: every mandatory field written → nothing listed", mandatoryOpen(inv, [], [], all).length === 0);
ok("fail: nothing written → all 46 listed, each once", (() => { const o = mandatoryOpen(inv, [], [], {}); return o.length === 46 && new Set(o.map((x) => x.box)).size === 46; })());
const one = { ...all, [a]: "" };
const o1 = mandatoryOpen(inv, [{ data_path: a, fact: "person.x", outcome: "mapped" }], [box(a)], one);
ok("fail: one mandatory field left empty by an unanswered question → exactly that one, \"needs an answer\", naming where it is asked", o1.length === 1 && o1[0].box === a && o1[0].reason === "needs an answer" && /Personal details/.test(o1[0].why), o1);
const o2 = mandatoryOpen(inv, [{ data_path: b, fact: null, outcome: "not_a_fact" }], [], { ...all, [b]: "" });
ok("pass: a field the configuration marks \"not a fact\" → \"fill it in Adobe\"", o2.length === 1 && o2[0].reason === "fill it in Adobe", o2);
const o3 = mandatoryOpen(inv, [], [], { ...all, [c]: "" });
ok("pass: a field nothing maps → \"no question asks it yet\"", o3.length === 1 && o3[0].reason === "no question asks it yet", o3);
const o4 = mandatoryOpen(inv, [{ data_path: d, fact: "person.x", outcome: "mapped" }], [box(d, { coverage: "unresolved", detail: "collected from a document, but no supported document type supplies it" })], { ...all, [d]: "" });
ok("fail (r1c screenshot): a mapped fact read from a document is still answerable → \"needs an answer\", never \"no question asks it yet\"", o4.length === 1 && o4[0].reason === "needs an answer" && o4[0].why === "not answered yet (Client A)", o4);
for (const detail of ["no question placement: nobody is asked for this value yet", "the form field reads a field that is not in the library", "that person is not part of this combination; the form field stays blank"]) {
  const o = mandatoryOpen(inv, [{ data_path: d, fact: "person.x", outcome: "mapped" }], [box(d, { coverage: "unresolved", detail })], { ...all, [d]: "" });
  ok(`fail (Devin on #592): a mapped field no answer can fill ("${detail.split(":")[0].split(";")[0]}") → "no question asks it yet", in render's words`, o[0]?.reason === "no question asks it yet" && o[0]?.why === detail, o);
}
const oFix = mandatoryOpen(inv, [{ data_path: a, fact: "person.x", outcome: "mapped" }], [box(a, { coverage: "answered on screen", fix: "confirmed with a problem, not written: Enter the street." } as Partial<BoxResult>)], one);
ok("fail (break M-2 on #592): a confirmed answer with a problem (QA-122) says that problem, as the copy does, never \"not confirmed yet\"", oFix[0]?.reason === "needs an answer" && oFix[0]?.why === "confirmed with a problem, not written: Enter the street.", oFix);
// Review M-1 on #592: a line a question fills is named by that question; derived Yes/No and not-a-fact keep the form's words.
const q1 = mandatoryOpen(inv, [{ data_path: a, fact: "person.residence_country", outcome: "mapped", evidence_quote: "* Date of birth" }], [box(a)], one, { labelOf: (f) => (f === "person.residence_country" ? "Country of residence" : undefined) });
ok("fail (review M-1 on #592): a mapped line is named by the case's own question, never by a wrong map quote (\"Date of birth\" on the country of residence)", q1[0]?.label === "Country of residence", q1[0]?.label);
const q2 = mandatoryOpen(inv, [{ data_path: b, fact: null, outcome: "not_a_fact", evidence_quote: "Taiwan personal identification number" }], [], { ...all, [b]: "" }, { labelOf: () => "never this" });
ok("pass: a not-a-fact line keeps the form's own words", q2[0]?.label === "Taiwan personal identification number", q2[0]?.label);
const q3 = mandatoryOpen(inv, [{ data_path: c, evidence_quote: "Education Section Question 1. Have you had any post-secondary education (including university, college or apprenticeship training)?" }], [], { ...all, [c]: "" });
ok("fail (review M-1 on #592): a question's number (\"Education Section Question 1.\") is not cut off as the sentence", /post-secondary education/.test(q3[0]?.label ?? ""), q3[0]?.label);
// Review M-2 on #592: a row field of a group settled as "none apply" has no answer to give.
const q4 = mandatoryOpen(inv, [{ data_path: d, fact: "person.employment_activity", outcome: "mapped" }], [box(d, { row: 0 })], { ...all, [d]: "" }, { noneApply: new Map([["principal|person.employment_activity", "\"Employment and activity history\""]]) });
const q5 = mandatoryOpen(inv, [{ data_path: d, fact: "person.employment_activity", outcome: "mapped" }], [box(d, { row: null })], { ...all, [d]: "" }, { noneApply: new Map([["principal|person.employment_activity", "\"Employment and activity history\""]]) });
ok("fail (review R2-m1 on #592): \"none apply\" covers only the group's row fields; a field asked outside the rows (\"Your present occupation\") still needs its answer", q5[0]?.reason === "needs an answer", q5);
ok("fail (review M-2 on #592): after a confirmed \"none apply\", a required row field says so and the way out, never \"not answered yet\"", q4[0]?.reason === "fill it in Adobe" && /"none apply" is answered for "Employment and activity history"/.test(q4[0]?.why ?? "") && /take back "none apply"/.test(q4[0]?.why ?? ""), q4);
const o5 = mandatoryOpen(inv, [{ data_path: a, fact: "person.x", outcome: "mapped" }], [box(a, { result: "by hand", why: "\"Z\" has no code" })], one);
ok("pass: a value with no code in the form → \"filled by hand\", with why", o5.length === 1 && o5[0].reason === "filled by hand" && /no code/.test(o5[0].why), o5);
const o6 = mandatoryOpen(inv, [{ data_path: a, fact: "person.x", outcome: "mapped" }], [box(a, { coverage: "answered on screen" })], one);
const o9 = mandatoryOpen(inv, [{ data_path: a, fact: "person.other_family_name", outcome: "mapped" }], [box(a, { transform: "derived:any(person.other_family_name, person.other_given_names) recorded -> yes_no_code:Y/N" })], one);
ok("fail: a derived \"recorded\" Yes/No is not \"needs an answer\" (an answer only makes it Yes) → \"no question asks it yet\"", o9[0]?.reason === "no question asks it yet" && /no question records a No/.test(o9[0]?.why ?? ""), o9);
// B52 review M1 on #967: the API always passes the case's question words (labelOf). A box still reading a detail keeps
// "no question asks it yet"; only a box asked as its own question (its fact is not among the facts its step names) needs
// that question's answer.
const REC = "derived:any(person.other_family_name, person.other_given_names) recorded -> yes_no_code:Y/N";
const o9b = mandatoryOpen(inv, [{ data_path: a, fact: "person.other_family_name", outcome: "mapped" }], [box(a, { transform: REC, coverage: "client question" })], one, { labelOf: (f) => (f === "person.other_family_name" ? "Other family name" : undefined) });
ok("B52 fail (review M1 on #967): a worked-out Yes/No still reading a detail, with the case's words given, is never \"needs an answer\" naming the detail", o9b[0]?.reason === "no question asks it yet" && /no question records a No/.test(o9b[0]?.why ?? ""), o9b);
const o9c = mandatoryOpen(inv, [{ data_path: a, fact: "person.has_used_other_name", outcome: "mapped" }], [box(a, { fact: "person.has_used_other_name", transform: REC, coverage: "client question" })], one, { labelOf: (f) => (f === "person.has_used_other_name" ? "Has used other name" : undefined) });
ok("B52 pass: a Yes/No asked as its own question needs that question's answer, naming it", o9c[0]?.reason === "needs an answer" && /^answer "Has used other name" and confirm it/.test(o9c[0]?.why ?? ""), o9c);
ok("pass: answered and not confirmed → \"needs an answer\", saying so", o6.length === 1 && /not confirmed/.test(o6[0].why), o6);
// Words: the map's evidence quote first (the inventory caption can be another question's: IMM 5257's US card box).
const us = mandatory.find((p) => /usCardIndicator/.test(p))!;
const o7 = mandatoryOpen(inv, [{ data_path: us, fact: "person.us_green_card_number", outcome: "mapped", evidence_quote: "Are you a lawful Permanent Resident of the United States with a valid alien registration card (green card)? Yes No" }], [], { ...all, [us]: "" });
ok("pass: the words are the map's evidence quote, cut at its first sentence (not the inventory's national ID caption)", o7[0]?.label === "Are you a lawful Permanent Resident of the United States with a valid alien registration card (green card)?", o7[0]?.label);
const o8 = mandatoryOpen(inv, [{ data_path: a, evidence_quote: "Question 1d. Have you taken a test form a designated testing agency?" }], [], one);
ok("fail: a question number alone (\"Question 1d.\") is not taken as the sentence", o8[0]?.label === "Question 1d. Have you taken a test form a designated testing agency?", o8[0]?.label);
const o10 = mandatoryOpen(inv, [{ data_path: a, evidence_quote: "* Date of birth" }], [], one);
ok("pass: the form's own \"*\" mark is left off the words", o10[0]?.label === "Date of birth", o10[0]?.label);
ok("fail: a field path never shows as the words", mandatoryOpen(inv, [], [], {}).every((x) => !/form1\[|\[0\]\./.test(x.label)));

// Devin on #592 (security): a release's inventory_file is data; only a .json file inside the solution folder is read.
ok("fail: an inventory_file that climbs out of the solution folder, or is not .json, is never read", solutionFile("../../../../etc/passwd.json") === null && solutionFile("/etc/hosts.json") === null && solutionFile("prototype/p1/inventory/imm5257e.inventory.pdf") === null && solutionFile(null) === null);
{ // Break m-5 on #592: a link inside the solution folder that points out is not followed out; node_modules is never read.
  const { symlinkSync, writeFileSync, rmSync, mkdtempSync } = await import("node:fs"); const { tmpdir } = await import("node:os");
  const out = join(mkdtempSync(join(tmpdir(), "xr-out-")), "outside.json"); writeFileSync(out, JSON.stringify({ fields: [] }));
  const link = join(import.meta.dirname, "..", "..", "p1", "inventory", `zz-link-${process.pid}.json`); symlinkSync(out, link);
  try { ok("fail (break m-5 on #592): a link inside the solution folder pointing outside it is never read", solutionFile(`prototype/p1/inventory/zz-link-${process.pid}.json`) === null); }
  finally { rmSync(link, { force: true }); rmSync(out, { force: true }); }
  ok("fail (break m-5 on #592): a file under node_modules is never read as a field list", solutionFile("prototype/studio/node_modules/typescript/package.json") === null);
}
ok("pass: the release's own field list resolves inside the solution folder", !!solutionFile("prototype/p1/inventory/imm5257e.inventory.json")?.endsWith("/prototype/p1/inventory/imm5257e.inventory.json"));

// Signatures and the oath are person steps (F2/F6), never listed here; buttons neither.
const sigInv: Inventory = { fields: [{ data_path: "form1[0].P[0].Signature[0].Sign[0]", caption: "Signature of applicant", required: true, ui: "signature" }, { data_path: "form1[0].P[0].Add[0]", caption: "Add", required: true, ui: "button" }, { data_path: "form1[0].P[0].Name[0]", caption: "Family name", required: true, ui: "textEdit" }] };
const os = mandatoryOpen(sigInv, [], [], {});
ok("fail: a signature box and a button are never listed; the text field is", os.length === 1 && os[0].box === "form1[0].P[0].Name[0]", os.map((x) => x.box));

// The lines a person reads (engine/runtime/open-lines.ts, used by the forms card).
const L = (box: string, label = "Sex", reason = "no question asks it yet", why = "nothing in this release fills it") => ({ box, label, reason, why });
const dob = openLines(["Year", "Month", "Day"].map((p) => L(`form1[0].Page1[0].PersonalDetails[0].DOB${p}[0]`, "Date of birth", "needs an answer", "not answered yet (Client A)")));
const dobTwice = openLines([...["Year", "Month", "Day"].map((p) => L(`form1[0].Page1[0].PersonalDetails[0].DOB${p}[0]`, "Date of birth", "needs an answer", "x")), ...["Year", "Month", "Day"].map((p) => L(`form1[0].Page1[0].PersonalDetails[0].DateOfMarriage${p}[0]`, "Date of birth", "needs an answer", "x"))]);
ok("pass (break m-2 on #592): a merged date line is named by its field, not its year box (\"DOB\", never \"DOB Year\")", dobTwice.length === 2 && dobTwice.some((x) => /form field: DOB\)$/.test(x.label)) && !dobTwice.some((x) => /DOB Year/.test(x.label)), dobTwice.map((x) => x.label));
const yyyy = openLines([L("form1[0].Page3[0].Occupation[0].OccupationRow1[0].FromYear[0]", "YYYY", "needs an answer", "x")]);
ok("pass (break m-2 on #592): a label that is only a date part says the field's name too", yyyy[0]?.label === "From (YYYY)", yyyy[0]?.label);
ok("pass: a date's year, month and day are one line, counting 3 form fields", dob.length === 1 && dob[0].n === 3 && dob[0].label === "Date of birth", dob);
const passport = openLines([L("form1[0].Page2[0].MaritalStatus[0].SectionA[0].Passport[0].TaiwanPIN[0]", "Question 1d. Have you taken a test?", "fill it in Adobe"), L("form1[0].Page2[0].MaritalStatus[0].SectionA[0].Passport[0].IsraelPassportIndicator[0]", "Question 1d. Have you taken a test?", "fill it in Adobe")]);
ok("fail (Devin on #592): two fields that share words are two lines, each named by its field", passport.length === 2 && passport[0].label.endsWith("(form field: Taiwan PIN)") && passport[1].label.endsWith("(form field: Israel Passport Indicator)"), passport.map((x) => x.label));
// IMM 0008's own paths: the principal's, the spouse's and a dependant's Sex (prototype/p1/inventory/imm0008e.inventory.json).
const sexes = openLines(["PersonalDetails[0]", "depPrime[0].personalDetails[0]", "dependants[0].personalDetails[0]"].map((b) => L(`form1[0].Page1[0].${b}.q3-4-5-6[0].Sex[0].Sex[0]`)));
ok("fail (Devin on #592): one field per person (IMM 0008) gives lines that each name their part of the form, never the same words twice", sexes.length === 3 && new Set(sexes.map((x) => x.label)).size === 3 && sexes.every((x) => !/form1\[|\[0\]/.test(x.label)), sexes.map((x) => x.label));
const deps = openLines([0, 1].map((i) => L(`form1[0].Page1[0].dependants[${i}].personalDetails[0].q3-4-5-6[0].Sex[0].Sex[0]`)));
ok("pass: the same block repeated is numbered in words (Dependant 1, Dependant 2)", deps.length === 2 && /Dependant 1\)$/.test(deps[0].label) && /Dependant 2\)$/.test(deps[1].label), deps.map((x) => x.label));

// Devin on #592 (0ac437c0): collisions by the caption alone, and a qualifier unique across the whole group.
const reasons = openLines([L("form1[0].Page1[0].PersonalDetails[0].Sex[0]", "Sex", "needs an answer", "a"), L("form1[0].Page1[0].depPrime[0].Sex[0]", "Sex", "no question asks it yet", "b")]);
ok("fail (Devin on #592): two lines with the same caption but different reasons are still told apart", new Set(reasons.map((x) => x.label)).size === 2, reasons.map((x) => x.label));
const cities = openLines(["Page2[0].contact[0].AddressRow2[0]", "Page3[0].DetailsOfStudy[0].PurposeRow1[0]", "Page3[0].Occupation[0].OccupationRow1[0]"].map((b) => L(`form1[0].${b}.CityTown[0]`, "City/Town")));
ok("fail (Devin on #592): three lines sharing a caption and a field name each get a different qualifier (never two \"Page3\")", new Set(cities.map((x) => x.label)).size === 3 && cities.every((x) => !/Page3\)$/.test(x.label)), cities.map((x) => x.label));
fc.assert(fc.property(fc.uniqueArray(fc.array(fc.constantFrom("A[0]", "A[1]", "B[0]", "C[0]", "Row1[0]", "Row2[0]"), { minLength: 1, maxLength: 4 }), { selector: (p) => p.join("."), minLength: 2, maxLength: 6 }), (parents) => {
  const ls = openLines(parents.map((p) => L(`form1[0].${p.join(".")}.City[0]`, "City/Town")));
  return new Set(ls.map((x) => x.label)).size === ls.length;
}), { numRuns: 500 });
ok("property (500 runs): lines that share a caption always end with different words, whatever their places on the form", true);

// Properties over generated field lists.
// Review R2-M1 on #592: a generated name that ends like a signature box ("…sig", "…sign"; engine/form-steps.ts
// isSignatureBox) is rightly never listed, so the names here keep clear of that rule (it failed ~7 % of runs before).
const notSignature = (n: string) => !/(sig(nature)?(lbl|label)?|sign)$/i.test(n);
const field = fc.record({ name: fc.stringMatching(/^[A-Z][a-z]{2,8}$/).filter(notSignature), required: fc.boolean(), written: fc.boolean(), mapped: fc.constantFrom("none", "mapped", "not_a_fact", "unresolved") });
fc.assert(fc.property(fc.uniqueArray(field, { selector: (f) => f.name, maxLength: 30 }), (fs) => {
  const i: Inventory = { fields: fs.map((f) => ({ data_path: `form1[0].P[0].${f.name}[0]`, caption: `${f.name} of the person`, required: f.required, ui: "textEdit" })) };
  const values = Object.fromEntries(fs.filter((f) => f.written).map((f) => [`form1[0].P[0].${f.name}[0]`, "v"]));
  const entries = fs.filter((f) => f.mapped !== "none").map((f) => ({ data_path: `form1[0].P[0].${f.name}[0]`, fact: f.mapped === "not_a_fact" ? null : "person.x", outcome: f.mapped === "not_a_fact" ? "not_a_fact" : "mapped" }));
  const boxes = fs.filter((f) => f.mapped === "mapped" || f.mapped === "unresolved").map((f) => box(`form1[0].P[0].${f.name}[0]`, f.mapped === "unresolved" ? { coverage: "unresolved" } : {}));
  const out = mandatoryOpen(i, entries, boxes, values);
  const expect = fs.filter((f) => f.required && !f.written).map((f) => `form1[0].P[0].${f.name}[0]`);
  // Exactly the mandatory, unwritten fields; each reason follows its field's decision.
  return out.length === expect.length && out.every((o, k) => o.box === expect[k])
    && out.every((o) => { const f = fs.find((x) => o.box.endsWith(`.${x.name}[0]`))!; return o.reason === ({ none: "no question asks it yet", unresolved: "needs an answer", not_a_fact: "fill it in Adobe", mapped: "needs an answer" } as const)[f.mapped]; });
}), { numRuns: 500 });
ok("property (500 runs): exactly the mandatory fields left empty are listed, in the form's order, each with the reason its field's decision gives", true);
process.exitCode = summary() ? 1 : 0; // B160: a red line fails the suite (run-suites.sh judges the exit code; before, it always exited 0)
