// BK-19 (C7.2, P-46, QA-315): the barcode check of a validated copy (tools/barcode_check.py), with no server.
// (1) Against the evidence lane's Adobe runs (evidence-lane/E1/*/evidence/*-barcode-positions.json: barcodes Adobe drew
// after Validate, decoded from page captures, compared with the data Adobe saved): for each of the four barcode forms
// (IMM 5257, IMM 1295, IMM 0008, IMM 1344) the check's own pairing and binding, read from the form's template alone,
// give the same positions and data paths, and every Adobe barcode value agrees with the saved value under its rule;
// a changed Adobe value is caught. (2) On each form's blank (official-sources), SYNTHETIC files (tools/simulate_validate.py):
// Validate's flag with no barcode reads 0 of N and is not matched (the QA-315 case); with the barcodes as the form's
// script makes them, N of N, matched; with one position of other answers ("stale"), not matched; with one barcode
// missing, N-1 of N, not matched. No server, no database, US$0.
//   tsx studio/tests/check_bk19_barcode_check.ts
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { asValidated } from "./runtime/validated.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const STUDIO = join(import.meta.dirname, ".."), SOL = join(STUDIO, "..", ".."), ROOT = join(SOL, "..", "..");
const PY = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python");
const FORMS = join(SOL, "official-sources", "ircc", "forms"), E1 = join(SOL, "prototype", "evidence-lane", "E1");
const py = (code: string, input?: Buffer) => {
  const r = spawnSync(PY, ["-I", "-c", `import sys, json; sys.path.insert(0, ${JSON.stringify(join(STUDIO, "tools"))}); import barcode_check as B\n${code}`], { input, encoding: "utf8", timeout: 300_000, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error((r.stderr || r.stdout).slice(-600));
  return JSON.parse(r.stdout.trim().split("\n").pop()!);
};
const check = (pdf: Buffer, form: string) => py(`print(json.dumps(B.check(sys.stdin.buffer.read(), ${JSON.stringify(join(FORMS, `${form}.pdf`))})))`, pdf);

for (const form of ["imm5257e", "imm1295e", "imm0008e", "imm1344e"]) {
  const dir = join(E1, form.replace(/e$/, ""), "evidence"), evf = readdirSync(dir).find((f) => f.endsWith("-barcode-positions.json"))!;
  const r = py(`
import re
ev = json.load(open(${JSON.stringify(join(dir, evf))}))["slots"]
E = {(int(re.sub(r"\\D", "", s["barcode"])), s["position"]): s for s in ev}
mine = [(int(re.sub(r"\\D", "", b["manifest"])), k + 1, path, num) for b in B.spec(${JSON.stringify(join(FORMS, `${form}.pdf`))}) for k, (_, path, num) in enumerate(b["slots"])]
bind = [m for m in mine if (m[0], m[1]) not in E or E[(m[0], m[1])]["data_path"] != m[2]]
agree = sum(1 for bc, k, path, num in mine if (bc, k) in E and B.same(E[(bc, k)]["barcode_value"], E[(bc, k)]["saved_value"], num))
bc, k, path, num = next(m for m in mine if E[(m[0], m[1])]["saved_value"])
caught = not B.same(E[(bc, k)]["barcode_value"] + "X", E[(bc, k)]["saved_value"], num)
print(json.dumps({"evidence": len(ev), "mine": len(mine), "binding_differs": len(bind), "agree": agree, "caught": caught}))`);
  ok(`C7.2 BK-19 pass (P-46): ${form}: the check's pairing and binding, from the template alone, give the evidence lane's ${r.evidence} Adobe barcode positions with the same data paths, and every Adobe barcode value agrees with the saved value`, r.mine === r.evidence && r.binding_differs === 0 && r.agree === r.evidence, r);
  ok(`C7.2 BK-19 fail (P-46): ${form}: an Adobe barcode value changed by one character no longer agrees with the saved value`, r.caught === true, r);
}

const tmp = mkdtempSync(join(tmpdir(), "xr-bk19-"));
try {
  for (const form of ["imm5257e", "imm1295e", "imm0008e", "imm1344e"]) {
    const blank = readFileSync(join(FORMS, `${form}.pdf`));
    const none = check(asValidated(blank), form), full = check(asValidated(blank, "Yes", true, "barcodes"), form), stale = check(asValidated(blank, "Yes", true, "barcodes-stale"), form);
    ok(`C7.2 BK-19 fail (QA-315): ${form}: Validate's flag with no barcode in the file reads 0 of ${none.expected} barcodes, not matched, and the words say to press Validate in Adobe Reader`, none.checked === true && none.expected >= 5 && none.decoded === 0 && none.matched === false && /press Validate/.test(none.words), none);
    ok(`C7.2 BK-19 pass (P-46): ${form}: with its barcodes as the form's own script makes them, ${full.expected} of ${full.expected} read and every position agrees`, full.checked === true && full.decoded === full.expected && full.matched === true && full.slots > 0 && full.agree === full.slots, { ...full, problems: undefined });
    ok(`C7.2 BK-19 fail (P-46): ${form}: barcodes of other answers (the form changed after Validate) are not matched, in words`, stale.decoded === stale.expected && stale.matched === false && stale.problems_total === 1 && /changed after Validate/.test(stale.words), stale);
  }
  // One barcode missing: drop the last barcode field's value from the form packet of a full file.
  const full = asValidated(readFileSync(join(FORMS, "imm5257e.pdf")), "Yes", true, "barcodes");
  const src = join(tmp, "full.pdf"); writeFileSync(src, full);
  const missing = py(`
import xml.etree.ElementTree as ET, importlib.util
sys.path.insert(0, ${JSON.stringify(join(SOL, "prototype", "p1"))})
import e5_roundtrip as E
spec = importlib.util.spec_from_file_location("sv", ${JSON.stringify(join(STUDIO, "tools", "simulate_validate.py"))})
src = open(${JSON.stringify(src)}, "rb").read()
parts = {k: v.get_object().get_data() for k, v in E.xfa_streams(E.open_reader(src)).items()}
root = ET.fromstring(parts["form"])
last = [f for f in root.iter() if B.local(f.tag) == "field" and f.get("name") == "PaperFormsBarcode5"][0]
for c in list(last): last.remove(c)
sv = importlib.util.module_from_spec(spec); sys.argv = ["x"]
src_code = open(${JSON.stringify(join(STUDIO, "tools", "simulate_validate.py"))}).read().replace("\\nmain()\\n", "\\n")
exec(compile(src_code, "simulate_validate.py", "exec"), sv.__dict__)
out = sv.set_packet(src, "form", ET.tostring(root, encoding="utf-8"))
print(json.dumps(B.check(out, ${JSON.stringify(join(FORMS, "imm5257e.pdf"))})))`);
  ok("C7.2 BK-19 fail (P-46): one barcode missing from the file (a page lost) reads 4 of 5, not matched, and asks for Validate", missing.decoded === 4 && missing.expected === 5 && missing.matched === false && /press Validate/.test(missing.words), missing);
} finally { rmSync(tmp, { recursive: true, force: true }); }
process.exit(summary() ? 1 : 0);
