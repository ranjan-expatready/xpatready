// QA-165 part 1 (runtime lane): the form's own Validate result, read from the file (tools/read_validated.py
// form_validation), on every barcode form that needs a validated copy (contracts/forms.ts BARCODE_FORMS: IMM 5257,
// IMM 0008, IMM 1344, IMM 1295). They keep the result in two shapes (read_validated.py validation_leaves), so each form
// is checked: blank, Validate passed, Validate found it incomplete, a flag with no date, only the bytes changed, and the
// two flags of IMM 0008 / IMM 1344 disagreeing. A form with no flag (IMM 5707) never counts as validated. The forms are
// IRCC's blank files in official-sources (no case values); the "validated" files are SYNTHETIC (tools/simulate_validate.py,
// no barcode). No server, no database, US$0.
//   tsx studio/tests/check_qa165_form_validation.ts
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { asValidated } from "./runtime/validated.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const STUDIO = join(import.meta.dirname, ".."), SOL = join(STUDIO, "..", ".."), ROOT = join(SOL, "..", "..");
const PY = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python");
type V = { kept_by_form: boolean; flag: string | null; date_last_validated: string | null; passed: boolean };
/** form_validation on bytes, optionally after setting data leaves (by the end of their path) to values first. */
function read(pdf: Buffer, set: Record<string, string> = {}): V {
  const code = `
import sys, json, xml.etree.ElementTree as ET
sys.path.insert(0, ${JSON.stringify(join(STUDIO, "tools"))}); sys.path.insert(0, ${JSON.stringify(join(SOL, "prototype", "p1"))})
import e5_roundtrip as E
from read_validated import form_validation
b = sys.stdin.buffer.read(); want = json.loads(${JSON.stringify(JSON.stringify(set))})
if want:
    parts = {k: v.get_object().get_data() for k, v in E.xfa_streams(E.open_reader(b)).items()}
    paths = [p for p, _ in E.leaves(E.data_root(ET.fromstring(parts["datasets"])))]
    values = {p: v for end, v in want.items() for p in paths if p.endswith(end)}
    b, _ = E.write(b, E.new_datasets(parts["datasets"], values), "append-only-encrypted-diagnostic" if E.open_reader(b).is_encrypted else "append-only")
print(json.dumps(form_validation(b)))`;
  const r = spawnSync(PY, ["-I", "-c", code], { input: pdf, encoding: "buffer", timeout: 120_000, maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(String(r.stderr).slice(-400));
  return JSON.parse(String(r.stdout));
}
const blank = (f: string) => readFileSync(join(SOL, "official-sources", "ircc", "forms", `${f}.pdf`));

for (const [form, file] of [["IMM 5257", "imm5257e"], ["IMM 1295", "imm1295e"], ["IMM 0008", "imm0008e"], ["IMM 1344", "imm1344e"]] as const) {
  const b = blank(file);
  const empty = read(b);
  ok(`${form}: the form keeps its own Validate result; a blank file has not passed`, empty.kept_by_form && !empty.passed, empty);
  const yes = read(asValidated(b));
  ok(`${form} pass: Validate passed (flag Yes, date filled, in this form's own shape) counts as validated`, yes.passed && yes.flag === "Yes" && !!yes.date_last_validated, yes);
  const no = read(asValidated(b, "No"));
  ok(`${form} fail: Validate found the form incomplete (flag No) is not validated`, !no.passed && no.flag === "No", no);
  const noDate = read(asValidated(b, "Yes", false));
  ok(`${form} fail: flag Yes with no date last validated (the script sets both) is not validated`, !noDate.passed && noDate.flag === "Yes" && noDate.date_last_validated === null, noDate);
  const bytes = read(Buffer.concat([b, Buffer.from("\n% Saved after Validate (simulated in this check)\n")]));
  ok(`${form} fail: only the bytes changed (no result of the form's own) is not validated`, !bytes.passed && bytes.flag === null, bytes);
}
for (const [form, file] of [["IMM 0008", "imm0008e"], ["IMM 1344", "imm1344e"]] as const) {
  const mixed = read(asValidated(blank(file)), { "ApplicationValidatedFlagMirror[0]": "No" });
  ok(`${form} fail: its two flags disagree (Yes and No) is not validated`, !mixed.passed, mixed);
  const mixedWords = read(asValidated(blank(file)), { "ApplicationValidatedFlag[0]": "Oui" });
  ok(`${form} fail (break m3 on #572): its flags say Yes and Oui (each a passed word, but not the same) is not validated`, !mixedWords.passed, mixedWords);
  const mirrorOnly = read(asValidated(blank(file)), { "ApplicationValidatedFlag[0]": "" });
  ok(`${form} pass: the flag set by its Validate script (the mirror) says Yes and the copied flag is empty: validated`, mirrorOnly.passed, mirrorOnly);
}
const barcodesDate = read(blank("imm1344e"), { "ApplicationValidatedFlagMirror[0]": "Yes", "ApplicationValidatedFlag[0]": "Yes", "Barcodes[0].DateLastValidated[0]": "2026-11-02" });
ok("IMM 1344 fail (review m-3 on #572): a date only in Barcodes.DateLastValidated (no script sets it) is not the date last validated", !barcodesDate.passed && barcodesDate.date_last_validated === null, barcodesDate);
const noDate = read(asValidated(blank("imm1344e")), { "Header[0].titleSF[0].DateLastValidated[0]": "not a date" });
ok("IMM 1344 fail (break m-7 on #592): a date last validated with no year in it (\"not a date\") is not a date", !noDate.passed && noDate.date_last_validated === null, noDate);
const oui = read(asValidated(blank("imm5257e")), { "ApplicationValidatedFlag[0]": "Oui" });
ok("IMM 5257 pass: the French flag (Oui) counts as passed", oui.passed && oui.flag === "Oui", oui);
const none = read(blank("imm5707e"));
ok("IMM 5707 fail: a form that keeps no Validate result never counts as validated from its file", !none.kept_by_form && !none.passed, none);
process.exitCode = summary() ? 1 : 0; // B160: a red line fails the suite (run-suites.sh judges the exit code; before, it always exited 0)
