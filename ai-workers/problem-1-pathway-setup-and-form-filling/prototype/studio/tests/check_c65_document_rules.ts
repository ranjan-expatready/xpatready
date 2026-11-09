// C6.5 part 2 (M3 plan row C7): the document rules of api/src/case-documents.ts that need no database, each with a
// passing and a failing check: which reader reads a document type (P-134: an identity document never goes to AI), how a
// typed answer and a read value compare, the release's words for a coded value, what Confirm & use leaves for a person,
// the cost card's price (p2/ledger.ts costUsd) and the saved-read lookup by checksum (FQ-10); QA-352: the reader and the
// facts each document proposes from the library's own data, and whom it is read for. No AI, US$0.
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/check_c65_document_rules.ts
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { documentCheckNote, pleaseCheckWords } from "../api/src/runtime.ts";
import { CASE_KINDS, inReleaseWords, letterReadUsd, notWritable, readerOf, readFor, sameValue, savedRead, type LibraryType } from "../api/src/case-documents.ts";
import { isIdentityName } from "../engine/identity-documents.ts";
import { costUsd, LETTER_READ_CARD } from "../../p2/ledger.ts";
import { MAX_ATTEMPTS } from "../../p2/policy.ts";
import { MRZ_FACTS } from "../engine/runtime/mrz.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();

// ---- readers (P-133, P-134)
ok("C6.5 R1: a passport's information page is read by its coded lines (mrz), giving the coded-line facts", readerOf({ key: "passport_information_page_copy", name: "Passport information page copy" })?.reader === "mrz" && readerOf({ key: "passport_or_travel_document", name: "Passport or travel document" })?.supplies === MRZ_FACTS);
ok("C6.5 R1 (fail): the absent parent's passport copy is not read as the line's person's (R11): a person reads it", readerOf({ key: "copy_of_the_absent_parent_s_signed_passport_or_national_id", name: "Copy of the absent parent's signed passport or national ID" }) === null);
ok("C6.5 R1 (fail): a passport-size photo is not the passport: not read", readerOf({ key: "visa_application_photos", name: "Passport size photos" }) === null);
ok("C6.5 R2 (P-134 fail): another identity document (a national ID, a birth certificate) is never sent to AI: a person reads it", readerOf({ key: "national_id", name: "National identity card" }) === null && readerOf({ key: "birth_certificate", name: "Birth certificate" }) === null);
ok("C6.5 R2: a letter of invitation with no checklist line is read by AI vision (replay only), giving the visit's facts (Sample)", readerOf({ key: "letter_of_invitation", name: "Letter of invitation (Sample)" })?.reader === "ai_vision" && CASE_KINDS.letter_of_invitation.supplies.includes("case.visit_contact_name"));
ok("C6.5 R2 (fail): a document the library says nothing about (no reader kind, no facts) is not read", readerOf({ key: "proof_of_financial_support", name: "Proof of financial support" }) === null);

// ---- QA-352 (P-437): the reader and its facts come from the library's own data (P-319, P-425/P-426)
const lib = (key: string, name: string, readerKind: string, supplies_facts: string[], extra: Partial<LibraryType> = {}): LibraryType => ({ key, name, supplies_facts, reader_profile: { readerKind, identityDocument: false }, ...extra });
const funds = lib("proof_of_financial_support", "Proof of financial support", "letter_or_record", ["case.funds_available_cad"]);
const marriage = lib("marriage_certificate_copy", "Marriage certificate copy", "letter_or_record", ["relationship.union_start_date"]);
ok("C6.5 R8 pass (QA-352): proof of funds, read by the library as a letter or record, is read by AI vision and proposes exactly the facts the library says it supplies", readerOf(funds)?.reader === "ai_vision" && JSON.stringify(readerOf(funds)?.supplies) === JSON.stringify(["case.funds_available_cad"]));
ok("C6.5 R8 fail (QA-352): proof of funds the library reads by a person, by its printed layout (Textract, not built) or with no facts is not read by AI", readerOf({ ...funds, reader_profile: { readerKind: "person_only" } }) === null && readerOf({ ...funds, reader_profile: { readerKind: "printed_layout" } }) === null && readerOf({ ...funds, supplies_facts: [] }) === null);
ok("C6.5 R9 pass (QA-352): a marriage certificate, read by the library as a letter or record, is read by AI vision and proposes the union start date", readerOf(marriage)?.reader === "ai_vision" && JSON.stringify(readerOf(marriage)?.supplies) === JSON.stringify(["relationship.union_start_date"]));
ok("C6.5 R9 fail (QA-352, R11): a fact the library says is about the holder's spouse is never proposed by AI vision (never attributed by guess); a type flagged identity, or of an identity category, never goes to AI (P-134)",
  JSON.stringify(readerOf({ ...marriage, supplies_facts: ["relationship.union_start_date", "person.family_name_at_birth"], supplies_about: { "person.family_name_at_birth": "holder.spouse" } })?.supplies) === JSON.stringify(["relationship.union_start_date"])
  && readerOf({ ...marriage, reader_profile: { readerKind: "letter_or_record", identityDocument: true } }) === null && readerOf({ ...marriage, category: "identity" }) === null);
ok("C6.5 R10 fail (QA-352, P-134): a minor's birth certificate is an identity document: never AI, even where the library reads it as a record and lists the date of birth (a person reads it)",
  readerOf(lib("copy_of_the_minor_s_birth_certificate", "Copy of the minor's birth certificate", "letter_or_record", ["person.date_of_birth"])) === null);
const placed = { placements: [{ fact: "case.funds_available_cad", section_id: "visit", repeats: "once_per_case" }, { fact: "relationship.union_start_date", section_id: "personal", repeats: "per_person" }, { fact: "case.visit_contact_name", section_id: "visit", repeats: "once_per_case" }] } as unknown as Snapshot;
ok("C6.5 R11 pass (QA-352, R5): a document whose every asked fact is the application's (proof of funds) is read for the application, wherever its line is", readFor(placed, ["case.funds_available_cad"], "client-a", "case-subject") === "case-subject");
ok("C6.5 R11 fail (QA-352): a document of a person's facts (marriage certificate), one that mixes a person's and the application's facts, or a fact the release does not ask stays its holder's", readFor(placed, ["relationship.union_start_date"], "client-a", "case-subject") === "client-a"
  && readFor(placed, ["relationship.union_start_date", "case.funds_available_cad"], "client-a", "case-subject") === "client-a" && readFor(placed, ["case.not_asked_here"], "client-a", "case-subject") === "client-a" && readFor(placed, ["case.funds_available_cad"], "client-a", null) === "client-a");
{
  // The library data the sample loader proposes (samples/document-supplies-read.json), as the readers read it.
  const data = JSON.parse(readFileSync(join(import.meta.dirname, "..", "samples", "document-supplies-read.json"), "utf8")) as { supplies: Record<string, { facts: { fact: string; about: string; source: string; quote: string; readOn: string }[] }> };
  ok("C6.5 R12 (QA-352, P-170): every set the loader proposes is cited (page, quote, date) and about the holder, and no identity document is in it (P-134)", Object.entries(data.supplies).every(([k, v]) => v.facts.length > 0 && v.facts.every((f) => /page \d/.test(f.source) && f.quote.length > 3 && /^\d{4}-\d{2}-\d{2}$/.test(f.readOn) && f.about === "holder") && !isIdentityName(k.replace(/_/g, " "))));
}

// ---- typed versus document (BR-7)
ok("C6.5 R3: a name compares without case and repeated spaces (the coded line is upper case)", sameValue("person.family_name", "Sampled ", "SAMPLED") && sameValue("person.given_names", "client  a", "CLIENT A"));
ok("C6.5 R3 (fail): a different name, or a date that differs, is a difference (a check), never equal", !sameValue("person.family_name", "SAMPLEDE", "SAMPLED") && !sameValue("person.date_of_birth", "1986-04-14", "1986-04-13") && !sameValue("person.passport_number", "sampleP12", "SAMPLEP12"));

// ---- the release's words, and what Confirm & use leaves for a person
const snap = (sexChoices: string[] | null) => ({
  canonical_fields: [{ id: "person.sex", value_type: "code", item_version: 1 }, { id: "person.citizenship", value_type: "country", item_version: 1 }, { id: "person.passport_number", value_type: "text", item_version: 1 }, { id: "person.date_of_birth", value_type: "date", item_version: 1 }],
  placements: [{ fact: "person.sex", section_id: "p", repeats: "per_person", collected_from: "client_questionnaire" }, { fact: "person.citizenship", section_id: "p", repeats: "per_person", collected_from: "client_questionnaire" }, { fact: "person.passport_number", section_id: "p", repeats: "per_person", collected_from: "client_questionnaire" }, { fact: "person.date_of_birth", section_id: "p", repeats: "per_person", collected_from: "client_questionnaire" }],
  field_maps: sexChoices ? [{ entries: [{ fact: "person.sex", outcome: "mapped", caption: "Sex", dataPath: "form.page1.sex", transform: `code_list:imm5257.sex (${sexChoices.join(", ")})` }] }] : [], forms: [], sections: [], document_types: [],
}) as unknown as Snapshot;
const words = inReleaseWords(snap(["Female", "Male", "Unknown", "Unspecified"]), "person.sex", "X");
ok("C6.5 R4: the coded sex X is proposed in the release's own word (Unspecified, ICAO Doc 9303), noting what the line reads", words.value === "Unspecified" && /reads "X"/.test(words.note ?? ""), words);
ok("C6.5 R4 (fail): with no such word offered, the code stays as read (never a guessed word)", inReleaseWords(snap(null), "person.sex", "X").value === "X" && inReleaseWords(snap(["Female"]), "person.passport_number", "F").value === "F");
ok("C6.5 R5: a passport number or a real date is written by Confirm & use", notWritable(snap(null), "person.passport_number", "SAMPLEP12") === null && notWritable(snap(null), "person.date_of_birth", "1986-04-13") === null);
ok("C6.5 R5 (fail): a country given only as a coded-line code is left for a person (no code table is sourced)", /country code "IND"/.test(notWritable(snap(null), "person.citizenship", "IND") ?? ""));
ok("C6.5 R5 (fail): a value its own question refuses (not a real date) is left for a person, with the question's words", /real date/.test(notWritable(snap(null), "person.date_of_birth", "1986-02-30") ?? ""));

// ---- the cost card (P-110, P-295), priced by the spend ledger
const one = letterReadUsd(1), two = letterReadUsd(2), m = LETTER_READ_CARD.model;
ok("C6.5 R6: a letter read's usual and worst cost come from the ledger's price table (costUsd), worst on every allowed attempt", one.usual_usd > 0 && one.worst_usd > one.usual_usd && one.attempts === MAX_ATTEMPTS
  && one.usual_usd === Math.ceil(costUsd(m, LETTER_READ_CARD.usual.input, LETTER_READ_CARD.usual.output) * 100) / 100 && one.worst_usd === Math.ceil(MAX_ATTEMPTS * costUsd(m, LETTER_READ_CARD.worst.input, LETTER_READ_CARD.worst.output) * 100) / 100, one);
ok("C6.5 R6 (fail): two letters cost more than one, and no letter costs nothing", two.worst_usd > one.worst_usd && letterReadUsd(0).worst_usd === 0, { one, two });

// ---- saved reads (FQ-10): by the document's checksum, never trusted otherwise
const dir = mkdtempSync(join(tmpdir(), "c65-reads-")), sha = "a".repeat(64), other = "b".repeat(64);
try {
  writeFileSync(join(dir, `studio-document-read-${sha}-live-1.json`), JSON.stringify({ document_sha256: sha, reader: "ai_vision", cost_usd: 0.03, proposals: [{ fact: "case.visit_contact_name", value: "SAMPLE HOST B", page: 1, confidence: 0.9 }] }));
  writeFileSync(join(dir, `studio-document-read-${other}-live-1.json`), JSON.stringify({ document_sha256: sha, reader: "ai_vision", proposals: [] }));
  writeFileSync(join(dir, `studio-document-read-${"c".repeat(64)}.json`), JSON.stringify({ document_sha256: "c".repeat(64), reader: "ai_vision", proposals: [{ fact: "not a fact", value: 1 }] }));
  ok("C6.5 R7: a saved read of these bytes (its checksum in the name and in the file) replays", savedRead(sha, dir)?.proposals[0]?.value === "SAMPLE HOST B");
  ok("C6.5 R7 (fail): a file naming one checksum but holding another's read, a malformed fact, a bad checksum or no folder: nothing replays", savedRead(other, dir) === null && savedRead("c".repeat(64), dir) === null && savedRead("../x", dir) === null && savedRead(sha, join(dir, "none")) === null);
} finally { rmSync(dir, { recursive: true, force: true }); }

// QA-322 (P-142 D6), review m1-m3 on a5eb5a9da, M1 and m7 on 673f0794d: the client's "please check" words.
{
  const LONG = "Passport or travel document information page photocopy"; // the release's longest name the coded-line reader reads
  const notes = [pleaseCheckWords(LONG, false), pleaseCheckWords(LONG, true), pleaseCheckWords("Letter of invitation (Sample)", false), pleaseCheckWords("Letter of invitation (Sample)", true)];
  const sentences = (t: string) => t.split(/(?<=\.)\s+/).map((x) => x.split(/\s+/).filter(Boolean).length);
  ok("QA-322 m2, m7: every sentence of either note is under 20 words, even with the release's longest document name (BIC-20)", notes.every((t) => sentences(t).every((n) => n < 20)), notes.map(sentences));
  ok("QA-322 m3: the document keeps its own name, only its first letter in lower case", notes[0].includes("the passport or travel document information page photocopy on file") && notes[2].includes("the letter of invitation (Sample) on file"));
  ok("QA-322 m1: once the answer holds another value, the note says it changed and no longer asks for a change", /It has changed since it was compared/.test(notes[1]) && !/change it here/.test(notes[1]) && /change it here/.test(notes[0]));
  ok("QA-322 M1 (673f0794d): the words never say who changed it (staff may have)", notes.every((t) => !/\byou changed\b/i.test(t)));
  const P = "Passport information page copy", fam = "person.family_name", changedWords = /It has changed since/;
  ok("QA-322 M1 (673f0794d): the compared answer saved again, or changed back to it, keeps the \"did not match\" words", !changedWords.test(documentCheckNote(fam, P, "SAMPLEDE", "SAMPLEDE")) && !changedWords.test(documentCheckNote(fam, P, "SAMPLEDE", "SAMPLEDE ")) && !changedWords.test(documentCheckNote(fam, P, "SAMPLEDE", undefined)) && /change it here/.test(documentCheckNote(fam, P, "SAMPLEDE", "SAMPLEDE")));
  ok("QA-322 M1 (673f0794d): another value, whoever saved it (the client or staff), gets the neutral \"has changed\" words", changedWords.test(documentCheckNote(fam, P, "SAMPLEDE", "SAMPLED")) && changedWords.test(documentCheckNote("person.passport_number", P, "SAMPLEP12", "SAMPLEP13")));
  ok("QA-322: a name compares as the server does (case and repeated spaces), a number exactly", !changedWords.test(documentCheckNote(fam, P, "SAMPLEDE", " sampledE ")) && changedWords.test(documentCheckNote("person.passport_number", P, "SAMPLEP12", "sampleP12")));
  ok("QA-322: every note starts \"Please check this answer\" and says the case officer settles it; none carries a value", notes.every((t) => /^Please check this answer\./.test(t) && /case officer/.test(t)));
}
process.exitCode = summary() ? 1 : 0; // B160: a red line fails the suite (run-suites.sh judges the exit code)
