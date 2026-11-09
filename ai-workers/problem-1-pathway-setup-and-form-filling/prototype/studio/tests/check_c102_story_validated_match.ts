// C10.2 (review M1 on #1394, 9 Nov): the finished story uses a validated file for its Paper IMM 5257 copy only when every
// check of api/src/sample-validated.ts matchStoryValidated holds: the saved file is the Sample case's and this form's,
// the read-back passed the form's own Validate, the copy reads the same family facts and writes the same values as the
// copy validated, and the file's checksum is the saved one. A pass and a fail per check, so removing any one turns this
// red. No server, no database, no Adobe (the "file" is a few bytes in a temporary folder).
//   tsx studio/tests/check_c102_story_validated_match.ts
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { matchStoryValidated, type SavedFile } from "../api/src/sample-validated.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined && !c ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const dir = mkdtempSync(join(tmpdir(), "xr-c102m-")), bytes = Buffer.from("%PDF-1.4\n% a validated copy (test bytes)\n%%EOF\n");
writeFileSync(join(dir, "paper.pdf"), bytes);
const sha = createHash("sha256").update(bytes).digest("hex"), person = "Child 18 or over (Sample)";
const entry = { person, family_facts_hash: "F", values_sha256: "V", copy_sha256: "C", validated_sha256: sha, file: "paper.pdf", read_back: { ok: true, validation: { passed: true } }, read_at: "", source: "" };
const saved = (over: Partial<typeof entry> = {}, file: Partial<SavedFile> = {}): SavedFile => ({ label: "", basis: "", case_reference: "SAMPLE-VV-FAMILY-1", form: "IMM 5257", copies: [{ ...entry, ...over }], ...file });
const copy = { id: "copy-1", familyHash: "F", valuesHash: "V" as string | null };
const m = (c: typeof copy | null, s: SavedFile | null, d = dir) => matchStoryValidated(c, person, s, d);

try {
  const found = m(copy, saved());
  ok("pass: every check holds → the file is found, for this copy, with its bytes", found.kind === "found" && found.copyId === "copy-1" && found.bytes.equals(bytes), found);
  ok("fail: no copy yet → none", m(null, saved()).kind === "none");
  ok("fail: nothing saved → none, in words naming the saved file", (() => { const r = m(copy, null); return r.kind === "none" && /validated-imm5257-paper\.json/.test(r.words); })());
  ok("fail (review m5): a saved file of another case → none", m(copy, saved({}, { case_reference: "OTHER-CASE" })).kind === "none");
  ok("fail (review m5): a saved file of another form → none", m(copy, saved({}, { form: "IMM 1295" })).kind === "none");
  ok("fail: no saved read-back for this person → none", m(copy, saved({ person: "Client A (Sample)" })).kind === "none");
  ok("fail (passed check): a read-back that is not ok → differs", m(copy, saved({ read_back: { ok: false, validation: { passed: true } } })).kind === "differs");
  ok("fail (passed check): the form's own Validate did not pass → differs", m(copy, saved({ read_back: { ok: true, validation: { passed: false } } })).kind === "differs");
  ok("fail (facts check): the copy reads other answers (same values) → differs, \"different answers\"", (() => { const r = m({ ...copy, familyHash: "OTHER" }, saved()); return r.kind === "differs" && /different answers/.test(r.words); })());
  ok("fail (values check): the copy writes other values → differs, \"different values\"", (() => { const r = m({ ...copy, valuesHash: "OTHER" }, saved()); return r.kind === "differs" && /different values/.test(r.words); })());
  ok("fail (values check): the copy's values cannot be read → differs", m({ ...copy, valuesHash: null }, saved()).kind === "differs");
  ok("fail (checksum): a file under the saved name that is not the file validated → refused, never used", m(copy, saved({ validated_sha256: "0".repeat(64) })).kind === "refused");
  ok("fail: the file is not in the folder → kept on the Mac (QA-285), nothing used", m(copy, saved({ file: "elsewhere.pdf" })).kind === "kept_on_mac");
  ok("fail: no such folder → kept on the Mac", m(copy, saved(), join(dir, "missing")).kind === "kept_on_mac");
  ok("fail: a file name with a path (../) → never read, kept on the Mac", m(copy, saved({ file: "../paper.pdf" })).kind === "kept_on_mac");
} catch (e) { ok(`the check ran to its end (crashed: ${(e as Error).message})`, false); }
finally { rmSync(dir, { recursive: true, force: true }); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
