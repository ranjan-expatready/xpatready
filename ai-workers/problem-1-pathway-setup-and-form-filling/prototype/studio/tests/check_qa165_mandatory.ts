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
const o5 = mandatoryOpen(inv, [{ data_path: a, fact: "person.x", outcome: "mapped" }], [box(a, { result: "by hand", why: "\"Z\" has no code" })], one);
ok("pass: a value with no code in the form → \"filled by hand\", with why", o5.length === 1 && o5[0].reason === "filled by hand" && /no code/.test(o5[0].why), o5);
const o6 = mandatoryOpen(inv, [{ data_path: a, fact: "person.x", outcome: "mapped" }], [box(a, { coverage: "answered on screen" })], one);
const o9 = mandatoryOpen(inv, [{ data_path: a, fact: "person.other_family_name", outcome: "mapped" }], [box(a, { transform: "derived:any(person.other_family_name, person.other_given_names) recorded -> yes_no_code:Y/N" })], one);
ok("fail: a derived \"recorded\" Yes/No is not \"needs an answer\" (an answer only makes it Yes) → \"no question asks it yet\"", o9[0]?.reason === "no question asks it yet" && /no question records a No/.test(o9[0]?.why ?? ""), o9);
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
ok("pass: the release's own field list resolves inside the solution folder", !!solutionFile("prototype/p1/inventory/imm5257e.inventory.json")?.endsWith("/prototype/p1/inventory/imm5257e.inventory.json"));

// Signatures and the oath are person steps (F2/F6), never listed here; buttons neither.
const sigInv: Inventory = { fields: [{ data_path: "form1[0].P[0].Signature[0].Sign[0]", caption: "Signature of applicant", required: true, ui: "signature" }, { data_path: "form1[0].P[0].Add[0]", caption: "Add", required: true, ui: "button" }, { data_path: "form1[0].P[0].Name[0]", caption: "Family name", required: true, ui: "textEdit" }] };
const os = mandatoryOpen(sigInv, [], [], {});
ok("fail: a signature box and a button are never listed; the text field is", os.length === 1 && os[0].box === "form1[0].P[0].Name[0]", os.map((x) => x.box));

// Properties over generated field lists.
const field = fc.record({ name: fc.stringMatching(/^[A-Z][a-z]{2,8}$/), required: fc.boolean(), written: fc.boolean(), mapped: fc.constantFrom("none", "mapped", "not_a_fact", "unresolved") });
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
summary();
