// QA-285 (C10.1 row 12; founder ~10:05 IST 6 Nov: "Files stay on the Mac"): the checkpoint loader takes each validated
// PDF from one local folder outside git (STUDIO_VALIDATED_DIR), checks it against its saved checksum first, and sends it
// through the product's upload door; a file with another checksum is refused in words; where the folder or the file is
// absent, nothing is sent or written (a generated copy is never changed) and the copy's view says in words that its
// validated file is kept on the Mac (Sample), read from the saved read-back and the copy's own facts and values. No server, no
// database (the loader's reads and writes are answered here), US$0; small files under var/, removed at the end.
//   tsx studio/tests/check_qa285_validated_files.ts
import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT, type Db } from "../api/src/core.ts";
import { familyFactsHash, KEPT_ON_MAC, keptOnMacWords, localValidatedFile, replaySavedReadBacks, VALIDATED_DIR_ENV, validatedDir, valuesHash, type SavedReadBack } from "../api/src/sample-validated.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const base = join(import.meta.dirname, "..", "var", "check-qa285"); rmSync(base, { recursive: true, force: true });
const folder = join(base, "validated"), copies = join(base, "copies"); mkdirSync(folder, { recursive: true }); mkdirSync(copies, { recursive: true });
const validatedBytes = Buffer.from("%PDF-1.7 validated in Adobe (test bytes)"), name = "imm5257-client-a.adobe.pdf";
writeFileSync(join(folder, name), validatedBytes);
const entry = { person: "Client A (Sample)", file: name, validated_sha256: sha(validatedBytes) };

// ── The folder ──
ok("QA-285: the folder comes from STUDIO_VALIDATED_DIR, else a folder under .tools/solution-1-prototype/ in the working copy's root (outside git)", VALIDATED_DIR_ENV === "STUDIO_VALIDATED_DIR" && validatedDir({ STUDIO_VALIDATED_DIR: "/somewhere/else" }) === "/somewhere/else"
  && validatedDir({}) === join(ROOT, ".tools", "solution-1-prototype", "validated-imm5257") && validatedDir({ STUDIO_VALIDATED_DIR: "  " }) === validatedDir({}));

// ── One file: hash first ──
const found = localValidatedFile(folder, entry);
ok("QA-285 pass: the file named for the copy, with the saved checksum, is used (its bytes as they are on disk)", found.kind === "found" && found.name === name && found.bytes.equals(validatedBytes), found.kind);
writeFileSync(join(folder, "imm5257-partner.adobe.pdf"), Buffer.from("%PDF-1.7 another file"));
const wrong = localValidatedFile(folder, { person: "Partner (Sample)", file: "imm5257-partner.adobe.pdf", validated_sha256: sha("the file that was validated") });
ok("QA-285 fail: a file whose checksum differs from the saved one is refused in words naming the person and the file, never used", wrong.kind === "refused" && /Partner \(Sample\): the file imm5257-partner\.adobe\.pdf .* is not the file that was validated in Adobe .*not used and the copy is not counted as validated/.test(wrong.words), wrong);
ok("QA-285 absent: no folder, no file named, or no such file in the folder is absent (nothing to send), not an error",
  localValidatedFile(join(base, "no-such-folder"), entry).kind === "absent" && localValidatedFile(folder, { ...entry, file: undefined }).kind === "absent" && localValidatedFile(folder, { ...entry, file: "imm5257-child.adobe.pdf" }).kind === "absent");
writeFileSync(join(base, "outside.pdf"), validatedBytes);
ok("QA-285 fail: a file name that leaves the folder (a path) is never read", ["../outside.pdf", `${base}/outside.pdf`, "..\\outside.pdf", ".hidden.pdf"].every((f) => localValidatedFile(folder, { ...entry, file: f }).kind === "absent"));

// ── The loader, with its database answered here ──
const facts = [{ box: "form1[0].Page1[0].PersonalDetails[0].Name[0].FamilyName[0]", fact: "person.family_name", about: "s1", row: null, value: "EXAMPLE" }];
const copyPath = relative(ROOT, join(copies, "c1.pdf"));
writeFileSync(join(copies, "c1.request.json"), JSON.stringify({ values: { "form1[0].X[0]": "EXAMPLE" } }));
const saved = (over: Partial<SavedReadBack> = {}, top: { case_reference?: string; form?: string } = { case_reference: "SAMPLE-CASE-1", form: "IMM 5257" }) => ({ label: "test", basis: "test", ...top, copies: [{ person: "Client A (Sample)", family_facts_hash: familyFactsHash(facts, (a) => (a === "s1" ? "Client A (Sample)" : a)), values_sha256: valuesHash(copyPath)!, copy_sha256: "c", validated_sha256: sha(validatedBytes), file: name,
  read_back: { ok: true, validation: { passed: true, flag: "Yes", date_last_validated: "2026-11-6" } }, read_at: "2026-11-06T00:00:00.000Z", source: "Validate in Adobe by the tech lead (test).", ...over } as SavedReadBack] });
function fakeDb() {
  return {
    caseParticipant: { findMany: async () => [{ subjectId: "s1", subject: { label: "Client A (Sample)" } }] },
    // C6.17 (BR-7): the copies read are the current stage's (its combination's pinned releases).
    case: { findUnique: async () => ({ combinationId: "c1", pins: [{ configReleaseId: "r1", combinationId: "c1" }] }) },
    formInstance: {
      findMany: async () => [{ id: "copy-1", workspaceId: "w1", subjectId: "s1", sha256: "c", path: copyPath, snapshot: { inputHash: "facts-now", factsJson: { facts } } }],
      // As the database guard: a generated copy is never changed.
      update: async () => { throw new Error("runtime_form_instance_guard: a generated copy is never overwritten"); },
    },
    validatedCopy: { create: async () => { throw new Error("a direct validated_copy write (P-322)"); } },
  } as unknown as Db;
}
const sent: { copyId: string; name: string; sha: string }[] = [];
const door = async (copyId: string, f: { originalname: string; buffer: Buffer }) => { sent.push({ copyId, name: f.originalname, sha: sha(f.buffer) }); return { id: "v1" }; };

const r1 = await replaySavedReadBacks(fakeDb(), "case-1", door, folder, saved());
ok("QA-285 pass (file here): the checked file goes through the upload door for its copy, once, with the saved checksum; no note, no direct validated_copy write", r1.written === 1 && r1.keptOnMac === 0 && !r1.why.length && sent.length === 1 && sent[0].copyId === "copy-1" && sent[0].name === name && sent[0].sha === sha(validatedBytes), { r1, sent });

// BK-19 (review m7 on #1679): a file the door keeps but does not count as validated (its barcodes not read) is not counted
// as read back; the reason is given in the door's words.
const notCounted = async () => ({ id: "v2", copy: { validated: { current: false, words: "0 of the 5 barcodes are in this file: press Validate." } } });
const counted = async () => ({ id: "v3", copy: { validated: { current: true, words: "Validated copy read back" } } });
const rNo = await replaySavedReadBacks(fakeDb(), "case-1", notCounted, folder, saved());
ok("C7.2 BK-19 fail (Mac sample loader): a file the door keeps but does not count is not counted as read back; the words say why", rNo.written === 0 && rNo.why.length === 1 && /does not count as validated: 0 of the 5 barcodes/.test(rNo.why[0]), rNo);
const rYes = await replaySavedReadBacks(fakeDb(), "case-1", counted, folder, saved());
ok("C7.2 BK-19 pass (Mac sample loader): a file the door counts as validated is counted as read back", rYes.written === 1 && !rYes.why.length, rYes);

sent.length = 0;
const r2 = await replaySavedReadBacks(fakeDb(), "case-1", door, folder, saved({ validated_sha256: sha("the file that was validated") }));
ok("QA-285 fail (wrong file): a changed file is refused in words and never sent or counted; nothing is written", r2.written === 0 && r2.keptOnMac === 0 && sent.length === 0 && r2.why.length === 1 && /not the file that was validated in Adobe/.test(r2.why[0]), r2);

const r3 = await replaySavedReadBacks(fakeDb(), "case-1", door, join(base, "no-such-folder"), saved());
ok("QA-285 absent (GitHub, a fresh machine): nothing is sent, nothing is recorded as validated and nothing is written to the copy (a generated copy is never changed); it is counted as kept on the Mac", r3.written === 0 && r3.keptOnMac === 1 && !r3.why.length && sent.length === 0, r3);
const theCopy = { subjectId: "s1", formNumber: "IMM 5257", path: copyPath, snapshot: { factsJson: { facts } } }, SAMPLE = "SAMPLE-CASE-1", nameOf = (x: string) => (x === "s1" ? "Client A (Sample)" : x);
const words = keptOnMacWords(theCopy, SAMPLE, nameOf, join(base, "no-such-folder"), saved());
ok("QA-285 absent pass: the copy's view says its validated file is kept on the Mac (Sample), never \"validate again\"", words === KEPT_ON_MAC && /kept on the Mac/.test(words) && /Sample/.test(words) && !/validate (the copy )?again/i.test(words), words);
ok("QA-285 absent fail: no such words when the file is here (it is read back instead), for other answers, other values, another person or a read-back that did not pass", keptOnMacWords(theCopy, SAMPLE, nameOf, folder, saved()) === null
  && keptOnMacWords(theCopy, SAMPLE, nameOf, join(base, "no-such-folder"), saved({ family_facts_hash: "other answers" })) === null && keptOnMacWords(theCopy, SAMPLE, nameOf, join(base, "no-such-folder"), saved({ values_sha256: "other values" })) === null
  && keptOnMacWords({ ...theCopy, subjectId: "s2" }, SAMPLE, (x) => (x === "s2" ? "Partner (Sample)" : x), join(base, "no-such-folder"), saved()) === null && keptOnMacWords(theCopy, SAMPLE, nameOf, join(base, "no-such-folder"), saved({ read_back: { ok: true, validation: { passed: false } } })) === null
  && keptOnMacWords(theCopy, SAMPLE, nameOf, join(base, "no-such-folder"), null) === null);

const r4 = await replaySavedReadBacks(fakeDb(), "case-1", door, join(base, "no-such-folder"), saved({ family_facts_hash: "other answers" }));
ok("QA-285 fail (other answers): a copy with other answers is never counted as validated on the Mac, file or no file: its words say validate this copy again", r4.keptOnMac === 0 && r4.written === 0 && /reads different answers/.test(r4.why[0] ?? ""), r4);

const r5 = await replaySavedReadBacks(fakeDb(), "case-1", async () => { throw Object.assign(new Error("x"), { getResponse: () => ({ detail: "This validated file is already read back and kept for this copy of IMM 5257; nothing was added." }) }); }, folder, saved());
ok("QA-285 fail (door refuses): the upload door's own refusal is kept in its words and not counted", r5.written === 0 && r5.keptOnMac === 0 && /the upload door refused imm5257-client-a\.adobe\.pdf: This validated file is already read back/.test(r5.why[0] ?? ""), r5);

// Tech lead on QA-285 (Minor 1): only the Sample case the saved file names, and only its form. A real case with the very
// same people and answers (another reference), or another form, never gets "kept on the Mac (Sample)".
ok("QA-285 fail (not the Sample case): a case with another reference, the same people and answers, gets no kept-on-the-Mac words; nor another form, nor a saved file that names no case or form",
  keptOnMacWords(theCopy, "CASE-2026-0042", nameOf, join(base, "no-such-folder"), saved()) === null && keptOnMacWords({ ...theCopy, formNumber: "IMM 5707" }, SAMPLE, nameOf, join(base, "no-such-folder"), saved()) === null
  && keptOnMacWords(theCopy, SAMPLE, nameOf, join(base, "no-such-folder"), saved({}, {})) === null && keptOnMacWords(theCopy, SAMPLE, nameOf, join(base, "no-such-folder"), saved({}, { case_reference: "SAMPLE-CASE-1" })) === null
  && keptOnMacWords(theCopy, SAMPLE, nameOf, join(base, "no-such-folder"), saved()) === KEPT_ON_MAC);
rmSync(base, { recursive: true, force: true });
process.exit(summary() ? 1 : 0);
