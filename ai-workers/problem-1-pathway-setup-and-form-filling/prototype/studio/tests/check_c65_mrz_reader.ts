// C6.5 part 1: the passport reader by rules (engine/runtime/mrz.ts, rules M1–M5), each with a passing and a failing
// check, on synthetic Sample passports made in the test (acceptance/lib/fixtures.ts: no real person, no real document).
// Collapse and review per P-243 and P-242 (they amend P-142 D5's field-by-field rule). No database, no AI (US$0).
//   tsx studio/tests/check_c65_mrz_reader.ts
import { readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { CHECKED_BY, MRZ_FACTS, compareWithAnswers, findZones, pdfTextPages, readPassport, type MrzRead } from "../engine/runtime/mrz.ts";
import { checkDigit } from "../../p5/reader/mrz.ts";
import { letterPdf, mrz, passportPdf, textPdf, type Passport } from "../acceptance/lib/fixtures.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const A: Passport = { surname: "SAMPLED", given: "CLIENT A", number: "SAMPLEP12", nationality: "IND", dob: "1986-04-13", sex: "F", expiry: "2035-06-30" };
const B: Passport = { ...A, surname: "SAMPLES", given: "SPOUSE A", number: "SAMPLES34", dob: "1988-02-01", sex: "M" };
const val = (r: MrzRead, f: string) => r.proposals.find((p) => p.fact === f);
const unread = (r: MrzRead) => r.unreadable.map((u) => u.fact);

// ---- M1 text layer only
const good = readPassport("doc-1", passportPdf(A));
ok("C6.5 M1: a synthetic passport's text layer is read: the coded lines are found on page 1", good.zones === 1 && good.people === 1 && same(pdfTextPages(passportPdf(A))[0].slice(-2), mrz(A)));
ok("C6.5 M1 (fail): not a PDF, or a PDF with no text, proposes nothing and lists every fact unreadable (no text layer)", [readPassport("x", Buffer.from("not a pdf")), readPassport("x", textPdf([]))].every((r) => r.proposals.length === 0 && same(unread(r), MRZ_FACTS) && /No text layer/.test(r.unreadable[0].reason)));
ok("C6.5 M1 (fail): a document with text but no coded lines (a letter of invitation) proposes nothing", (() => { const r = readPassport("x", letterPdf()); return r.proposals.length === 0 && r.zones === 0 && /No passport coded lines/.test(r.unreadable[0].reason); })());
ok("C6.5 M1: a Flate-compressed text layer is read as the plain one", (() => {
  const [l1, l2] = mrz(A), content = deflateSync(Buffer.from(`BT\n/F1 10 Tf\n40 760 Td\n12 TL\n(${l1}) '\n(${l2}) '\nET`, "latin1"));
  const pdf = Buffer.concat([Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Length ${content.length} /Filter /FlateDecode >>\nstream\n`, "latin1"), content, Buffer.from("\nendstream\nendobj\n%%EOF\n", "latin1")]);
  return same(readPassport("z", pdf).proposals.map((p) => [p.fact, p.value]), good.proposals.map((p) => [p.fact, p.value]));
})());
ok("C6.5 M1 (fail): a stream with another filter (an image) is not read as text", readPassport("x", Buffer.from("%PDF-1.4\n1 0 obj\n<< /Length 9 /Filter /DCTDecode >>\nstream\nBT (x) Tj\nendstream\nendobj\n", "latin1")).zones === 0);

// ---- Values, provenance, M3 collapse, M4 one review
ok("C6.5 pass: the coded-line values are proposed about the holder: names, sex, date of birth, nationality, issuing state, number, expiry", same(good.proposals.map((p) => [p.fact, p.value]), [["person.family_name", "SAMPLED"], ["person.given_names", "CLIENT A"], ["person.sex", "F"], ["person.date_of_birth", "1986-04-13"], ["person.citizenship", "IND"], ["person.passport_country_of_issue", "IND"], ["person.passport_number", "SAMPLEP12"], ["person.passport_expiry_date", "2035-06-30"]]) && good.unreadable.length === 0);
ok("C6.5 pass (AG11-D4 shape): every proposal carries the document, page 1, reader \"mrz\", a confidence, about the holder, and is a proposal (never an answer)", good.proposals.every((p) => p.source.document === "doc-1" && p.source.page === 1 && p.source.reader === "mrz" && p.confidence > 0 && p.confidence < 1 && p.about === "holder" && p.state === "proposed"));
ok("C6.5 M3 (P-243) pass: number, date of birth and expiry, backed by passed check digits, are collapsed", same(good.review.collapsed, ["person.date_of_birth", "person.passport_number", "person.passport_expiry_date"]) && good.review.collapsed.every((f) => val(good, f)?.checked === true));
ok("C6.5 M3 (P-243) fail: names, sex, nationality and issuing state stay expanded (no check digit of their own; no one-click confirm)", same(good.review.expanded, ["person.family_name", "person.given_names", "person.sex", "person.citizenship", "person.passport_country_of_issue"]) && good.review.expanded.every((f) => val(good, f)?.checked === false && val(good, f)?.review === "expanded") && (val(good, "person.family_name")?.confidence ?? 1) < (val(good, "person.passport_number")?.confidence ?? 0));
ok("C6.5 M4 (P-242): one \"Confirm & use\" for the whole document, never one per field", good.review.confirm === "one_per_document" && !("confirm" in (good.proposals[0] as object)));

// ---- M2 bad check digit: flagged, never guessed
const bad = readPassport("doc-2", passportPdf(A, true));
ok("C6.5 M2 fail: the passport number's check digit fails: no number is proposed; it is listed unreadable with the reason", !val(bad, "person.passport_number") && same(unread(bad), ["person.passport_number"]) && /check digit/.test(bad.unreadable[0].reason));
ok("C6.5 M2/M3 fail (P-243): one failed check digit in the zone: date of birth and expiry are proposed but not collapsed", bad.review.collapsed.length === 0 && val(bad, "person.date_of_birth")?.review === "expanded" && val(bad, "person.passport_expiry_date")?.checked === false);
ok("C6.5 M2 pass: the values that need no check digit are still proposed, as read", val(bad, "person.family_name")?.value === "SAMPLED" && val(bad, "person.given_names")?.value === "CLIENT A");
const swap = (l2: string, at: number, ch: string) => l2.slice(0, at) + ch + l2.slice(at + 1);
ok("C6.5 M2 fail: an OCR look-alike (O for 0 in the number) is never corrected: the check fails and the number is unreadable", (() => {
  const [l1, l2] = mrz({ ...A, number: "SAMPLE012" });
  const r = readPassport("x", textPdf([l1, swap(l2, 6, "O")]));
  return !val(r, "person.passport_number") && unread(r).includes("person.passport_number");
})());
ok("C6.5 M2 fail: a date of birth whose check digit fails is unreadable, its digits never guessed", (() => {
  const [l1, l2] = mrz(A); const r = readPassport("x", textPdf([l1, swap(l2, 19, String((Number(l2[19]) + 1) % 10))]));
  return !val(r, "person.date_of_birth") && unread(r).includes("person.date_of_birth") && !!val(r, "person.passport_number") && val(r, "person.passport_number")?.review === "expanded";
})());
ok("C6.5 M2 fail: a date that passes its check digit but is no calendar date (13th month) is unreadable", (() => { const r = readPassport("x", passportPdf({ ...A, expiry: "2035-13-30" })); return !val(r, "person.passport_expiry_date") && unread(r).includes("person.passport_expiry_date"); })());
ok("C6.5 M2: the check digit is ICAO's 7-3-1 rule (the standard's specimen L898902C3 → 6, reused from p5/reader)", checkDigit("L898902C3") === 6 && Object.keys(CHECKED_BY).length === 3);

// ---- M5 two people on one document
const two = readPassport("doc-3", textPdf(["SYNTHETIC SPECIMEN", ...mrz(A), "", ...mrz(B)]));
ok("C6.5 M5 fail: two people's coded lines on one document: nothing is proposed, every fact unreadable, the reason names two people", two.zones === 2 && two.people === 2 && two.proposals.length === 0 && same(unread(two), MRZ_FACTS) && /2 people/.test(two.unreadable[0].reason));
ok("C6.5 M5 fail: two passports on two pages of one PDF are two people too", (() => {
  const pages = [mrz(A), mrz(B)].map((z) => `BT\n40 760 Td\n12 TL\n(${z[0]}) '\n(${z[1]}) '\nET`);
  let pdf = "%PDF-1.4\n"; pages.forEach((c, i) => { pdf += `${i + 1} 0 obj\n<< /Length ${c.length} >>\nstream\n${c}\nendstream\nendobj\n`; });
  const r = readPassport("x", Buffer.from(pdf, "latin1")); return r.people === 2 && r.proposals.length === 0;
})());
ok("C6.5 M5 pass: the same person's zone printed twice is one person: proposed as usual", (() => { const r = readPassport("x", textPdf([...mrz(A), ...mrz(A)])); return r.zones === 2 && r.people === 1 && val(r, "person.passport_number")?.value === "SAMPLEP12"; })());
ok("C6.5 findZones: spaces inside a coded line and the « look-alike are read as the filler; a 43-character line is no zone", (() => {
  const [l1, l2] = mrz(A);
  return same(findZones([l1.replace("<<", "«<").replace("SAMPLED", "SAMP LED"), l2])[0]?.l1, l1) && findZones([l1.slice(0, 43), l2]).length === 0;
})());

// ---- M4 against the client's own answers (Declared, fills at once): conflicts are never settled silently
const cmp = (answers: Record<string, unknown>) => new Map(compareWithAnswers(good, answers).map((x) => [x.fact, x.outcome]));
ok("C6.5 M4 fail (BR-7): the client typed SAMPLEDE, the passport reads SAMPLED: a conflict for a person, not an overwrite", cmp({ "person.family_name": "SAMPLEDE" }).get("person.family_name") === "conflict");
ok("C6.5 M4 pass: the same name typed in lower case agrees; an unanswered fact is new", cmp({ "person.family_name": "sampled", "person.given_names": "Client  A" }).get("person.family_name") === "agrees" && cmp({ "person.family_name": "sampled", "person.given_names": "Client  A" }).get("person.given_names") === "agrees" && cmp({}).get("person.passport_number") === "new" && cmp({ "person.passport_number": "" }).get("person.passport_number") === "new");
ok("C6.5 M4 fail: a passport number differing only in case is a conflict (only names fold case)", cmp({ "person.passport_number": "samplep12" }).get("person.passport_number") === "conflict");

// ---- Lift-ready (P-249) and no AI
const src = readFileSync(new URL("../engine/runtime/mrz.ts", import.meta.url), "utf8");
const imports = [...src.matchAll(/\bfrom\s+["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']/g)].map((m) => m[1] ?? m[2]);
ok("C6.5 (P-249, no AI): the reader imports only Node's zlib, p5's check-digit rules and the resolver contract", same(imports, ["node:zlib", "../../../p5/reader/mrz.ts", "../../contracts/resolver.ts"]));

summary();
