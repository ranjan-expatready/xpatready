// B84 (QA-235, C7.7): the filler's own checks on a schedule and a dependants' form. IMM 0008 DEP's blank file holds an
// empty <xfa:data/>, which the read-back (p1/e5_roundtrip.py read_back) read as one data leaf at path "": once a value
// was written that root was no longer a leaf, so it counted as "other data changed" and every copy was refused as not
// intact. The data root is an ancestor of every written path, so it is never "other" data. A real change to another leaf
// is still caught. IRCC's blank files in official-sources, Sample values; no server, no database, US$0.
//   tsx studio/tests/check_b84_fill_intact.ts
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const STUDIO = join(import.meta.dirname, ".."), SOL = join(STUDIO, "..", ".."), ROOT = join(SOL, "..", "..");
const PY = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python");
const P1 = join(SOL, "prototype", "p1"), FILL = join(SOL, "prototype", "p5", "fill.py");
const dir = mkdtempSync(join(tmpdir(), "b84-fill-"));
type Report = { written: number; read_back_equal: number; other_data_leaves_changed: number; intact: boolean };

/** p5/fill.py, the filler a case's copy uses (api/src/fill.ts), on IRCC's blank file. */
function fill(file: string, values: Record<string, string>): Report {
  const req = join(dir, `${file}.request.json`);
  writeFileSync(req, JSON.stringify({ form_file: `${file}.pdf`, values, page_fields: {}, out: join(dir, `${file}.pdf`) }));
  const r = spawnSync(PY, ["-I", FILL, req], { encoding: "utf8", timeout: 120_000, maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(r.stderr.slice(-400));
  return JSON.parse(r.stdout.trim().split("\n").pop()!);
}
/** read_back on a copy that writes `values` plus `extra` (another leaf changed), checked against `values` alone. */
function tampered(file: string, values: Record<string, string>, extraEnd: string): { other: number; extra: string | null } {
  const code = `
import sys, json, xml.etree.ElementTree as ET
sys.path.insert(0, ${JSON.stringify(P1)})
import e5_roundtrip as E
b = E.official(${JSON.stringify(`${file}.pdf`)}).read_bytes(); values = json.loads(${JSON.stringify(JSON.stringify(values))})
parts = {k: v.get_object().get_data() for k, v in E.xfa_streams(E.open_reader(b)).items()}
extra = next((p for p, _ in E.leaves(E.data_root(ET.fromstring(parts["datasets"]))) if p.endswith(${JSON.stringify(extraEnd)}) and p not in values), None)
out, _ = E.write(b, E.new_datasets(parts["datasets"], {**values, **({extra: "SAMPLE-OTHER"} if extra else {})}), "append-only-encrypted-diagnostic" if E.open_reader(b).is_encrypted else "append-only")
print(json.dumps({"other": E.read_back(out, values, parts)["other_data_leaves_changed"], "extra": extra}))`;
  const r = spawnSync(PY, ["-I", "-c", code], { encoding: "utf8", timeout: 120_000, maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(r.stderr.slice(-400));
  return JSON.parse(r.stdout.trim().split("\n").pop()!);
}

try {
  const dep = fill("imm0008depe", { "form1[0].Page1[0].AddDependant[0].q1[0].FamilyName[0]": "SAMPLE", "form1[0].Page1[0].AddDependant[0].q1[0].GivenName[0]": "SAMPLE A" });
  ok("C7.7 B84 pass: IMM 0008 DEP (blank data root) filled with two values reads both back, counts no other data changed, and is intact", dep.written === 2 && dep.read_back_equal === 2 && dep.other_data_leaves_changed === 0 && dep.intact === true, dep);
  const sch = fill("imm5257_1e", { "Schedule1[0].FamilyName[0]": "SAMPLE", "Schedule1[0].GivenName[0]": "SAMPLE A" });
  ok("C7.7 B84 pass: IMM 5257 SCH1 filled with two values is intact", sch.written === 2 && sch.read_back_equal === 2 && sch.intact === true, sch);
  const other = tampered("imm5257e", { "form1[0].Page1[0].PersonalDetails[0].Name[0].FamilyName[0]": "SAMPLE" }, "GivenName[0]");
  ok("C7.7 B84 fail: another data leaf changed beside the written one is still counted (IMM 5257), so such a copy is not intact", !!other.extra && other.other >= 1, other);
  const empty = readFileSync(join(SOL, "official-sources", "ircc", "forms", "imm0008depe.pdf")).length > 0;
  ok("C7.7 B84 (setup): IRCC's blank IMM 0008 DEP is in official-sources", empty);
} finally { rmSync(dir, { recursive: true, force: true }); }
process.exit(summary() ? 1 : 0);
