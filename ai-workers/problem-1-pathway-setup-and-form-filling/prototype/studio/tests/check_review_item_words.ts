// QA-73 (F8, review of #389): the Item words on a combination's Review and release tab, for every kind of change the
// release diff lists (engine/validate.ts diff()). Only a calculated answer swaps its long label for a short name; every
// other kind keeps its own words (never its key). No server, no database, no model call (US$0).
//   tsx studio/tests/check_review_item_words.ts
import { itemCell, ITEM_MAX } from "../web/src/lib/item-words.ts";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail?: unknown) => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`); };
const words = (s: string) => s.replace(/\bsubject_spouse_or_partner\b/g, "spouse or partner");
const short = (key: string) => { const w = (key.split(".").pop() ?? key).replace(/_/g, " "); return w.charAt(0).toUpperCase() + w.slice(1); };
const DEF = "True when the country or territory from which the person applies is not a country of their citizenship.";

const calc = itemCell({ kind: "Derived definition", key: "person.applies_from_outside_citizenship_country", label: DEF }, words, short);
ok("QA-73 pass: a calculated answer's long definition shows its short name, the definition in the tip", calc.text === "Applies from outside citizenship country" && calc.tip === DEF && calc.text.length <= ITEM_MAX, calc);

const ROW = "name, path, portal, source basis or allowed locations (no line changed)";
const row = itemCell({ kind: "Row details", key: "vv.single", label: ROW }, words, short);
ok("QA-73 fail (review of #389): a long Row details label keeps its words, never the combination key (\"Single\")", row.text === ROW && row.clamp && row.tip === ROW, row);
const rule = itemCell({ kind: "Rule", key: "R-01", label: "When the applicant has a valid study permit and applies from inside Canada, the extension form is required" }, words, short);
ok("QA-73 fail: a long Rule keeps its plain words, never the rule id (\"R-01\")", !/^R-\d+$/.test(rule.text) && rule.clamp, rule);
const doc = itemCell({ kind: "Document requirement", key: "passport_copy:subject_principal", label: "Passport copy for the principal applicant, every page with a stamp, a visa or a note, in colour, both sides" }, words, short);
ok("QA-73 fail: a long document requirement keeps its words, never the key's parts", !/:/.test(doc.text) && doc.clamp, doc);
const fills = itemCell({ kind: "Who fills a question", key: "person.marital_status", label: "Marital status: filled by the subject_spouse_or_partner, was filled by the principal applicant" }, words, short);
ok("QA-73 fail: a long \"who fills\" change keeps the change itself, with role keys in words", /filled by the spouse or partner, was filled/.test(fills.text), fills);

const shortLabel = itemCell({ kind: "Form", key: "IMM 5257", label: "Application for Visitor Visa" }, words, short);
ok("QA-73 pass: a short label is shown as it is, the key in the tip", shortLabel.text === "Application for Visitor Visa" && shortLabel.tip === "IMM 5257" && !shortLabel.clamp, shortLabel);
const none = itemCell({ kind: "Form", key: "IMM 5257", label: null }, words, short);
ok("QA-73 pass: no label shows the key", none.text === "IMM 5257", none);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
