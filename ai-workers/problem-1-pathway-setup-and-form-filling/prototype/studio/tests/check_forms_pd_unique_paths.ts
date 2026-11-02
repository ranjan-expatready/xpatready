// Row PD (forms, #528 reviewer M1): the P1 reader (p1/xfa_inventory.py) gives every box its own data path. Under XFA
// normal binding an unnamed subform is transparent: its children bind in the parent's data scope, so same-named boxes
// spread over several unnamed subforms take consecutive indices there (IMM 5532's shipped data has page1.yesNo[0..20]
// and Table2[0..1]). The reader used to restart the count inside each unnamed subform, so IMM 5532 gave 44 boxes only 20
// paths and Apply of its draft hit form_field_map's unique key (409). A pass and a fail case on small templates fed to
// the reader, then every committed XFA inventory re-derived from its official file: IMM 5532 has a path per box, all in
// its shipped data, and every other form's inventory is unchanged byte for byte (their saved AI runs stay valid).
// No server, no database, NO model call (US$0). Needs the prototype venv and the official PDFs (lane.sh setup).
//   tsx studio/tests/check_forms_pd_unique_paths.ts
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const STUDIO = join(import.meta.dirname, ".."), SOLUTION = join(STUDIO, "..", "..");
const P1 = join(SOLUTION, "prototype", "p1"), INV = join(P1, "inventory");
const PY = join(SOLUTION, "..", "..", ".tools", "solution-1-prototype", ".venv", "bin", "python");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
if (!existsSync(PY)) { console.error(`STOP  the prototype venv is missing (${PY}): run lane.sh setup`); process.exit(2); }

// The reader run on a template given as text (its PDF reading replaced, as read_form.py replaces the file lookup).
const READ = `
import json, sys
sys.path.insert(0, sys.argv[1])
import xfa_inventory as X
tpl = sys.stdin.read().encode()
X.official = lambda _n: X.OUT / "summary.json"   # any committed file: only its checksum is taken
X.xfa_parts = lambda _p: ({"template": tpl}, {"pages": 1})
print(json.dumps([[f["som"], f["data_path"]] for f in X.inventory("synthetic.pdf", "PD check")[1]["fields"]]))
`;
type Box = [som: string, path: string | null];
const read = (template: string): Box[] => JSON.parse(execFileSync(PY, ["-I", "-c", READ, P1], { input: template, encoding: "utf8" }));
const T = (body: string) => `<template xmlns="http://www.xfa.org/schema/xfa-template/3.3/"><subform name="F"><subform name="page1">${body}</subform></subform></template>`;
const field = (n: string, extra = "") => `<field name="${n}">${extra}<ui><textEdit/></ui></field>`;
const path = (boxes: Box[], som: string) => boxes.find((b) => b[0] === som)?.[1];
const repeated = (boxes: Box[]) => { const ps = boxes.map((b) => b[1]).filter(Boolean); return ps.length - new Set(ps).size; };

// Pass: same-named boxes in sibling unnamed subforms (and one directly in the page) share the page's data scope.
const a = read(T(`<subform>${field("yesNo")}${field("lastLive")}</subform>${field("lastLive")}<subform>${field("yesNo")}<subform name="Table2"><subform name="Row1">${field("Cell2")}</subform></subform></subform><subform><subform name="Table2"><subform name="Row1">${field("Cell2")}</subform></subform>${field("yesNo")}</subform>`));
ok("PD pass: boxes of one name in different unnamed subforms get consecutive paths in the parent scope, in document order",
  path(a, "F[0].page1[0].#subform[0].yesNo[0]") === "F[0].page1[0].yesNo[0]" && path(a, "F[0].page1[0].#subform[1].yesNo[0]") === "F[0].page1[0].yesNo[1]" && path(a, "F[0].page1[0].#subform[2].yesNo[0]") === "F[0].page1[0].yesNo[2]"
  && path(a, "F[0].page1[0].#subform[0].lastLive[0]") === "F[0].page1[0].lastLive[0]" && path(a, "F[0].page1[0].lastLive[0]") === "F[0].page1[0].lastLive[1]", a);
ok("PD pass: two same-named tables in unnamed subforms are Table2[0] and Table2[1], so their cells differ too",
  path(a, "F[0].page1[0].#subform[1].Table2[0].Row1[0].Cell2[0]") === "F[0].page1[0].Table2[0].Row1[0].Cell2[0]" && path(a, "F[0].page1[0].#subform[2].Table2[0].Row1[0].Cell2[0]") === "F[0].page1[0].Table2[1].Row1[0].Cell2[0]");
ok("PD pass: no data path repeats in that template", repeated(a) === 0, repeated(a));

// Fail: what must NOT be renumbered. Named subforms open their own scope (each keeps [0]); a box bound "none" has no
// data; two boxes bound by dataRef to one node share it on purpose (one value shown twice). The uniqueness count used
// above is not blind: it finds the shared dataRef path.
const b = read(T(`<subform name="sponsor">${field("yesNo")}</subform><subform name="applicant">${field("yesNo")}</subform><subform>${field("note", '<bind match="none"/>')}</subform>${field("name1", '<bind match="dataRef" ref="$.Name"/>')}<subform>${field("name2", '<bind match="dataRef" ref="$.Name"/>')}</subform>`));
ok("PD fail: boxes of one name in differently named subforms are not renumbered (each scope starts at [0])",
  path(b, "F[0].page1[0].sponsor[0].yesNo[0]") === "F[0].page1[0].sponsor[0].yesNo[0]" && path(b, "F[0].page1[0].applicant[0].yesNo[0]") === "F[0].page1[0].applicant[0].yesNo[0]", b);
ok("PD fail: a box bound \"none\" gets no data path, and an explicit dataRef keeps its one node (shared on purpose, counted as a repeat)",
  path(b, "F[0].page1[0].#subform[0].note[0]") === null && path(b, "F[0].page1[0].name1[0]") === "F[0].page1[0].Name[0]" && path(b, "F[0].page1[0].#subform[1].name2[0]") === "F[0].page1[0].Name[0]" && repeated(b) === 1, b);

// Every committed XFA inventory re-derived from its official file with today's reader.
const REDERIVE = `
import json, sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
import xfa_inventory as X
out = {}
for f in sorted(X.OUT.glob("imm*.inventory.json")):
    if ".text." in f.name: continue
    old = json.loads(f.read_text())
    s, full = X.inventory(old["summary"]["file"].split("/")[-1], old["summary"]["reason_read"])
    fields = [x for x in full["fields"] if x["data_path"]]
    entry = [x for x in fields if x["ui"] not in ("button", "picture", "barcode", "signature")]
    out[f.name] = {"same_file": json.dumps(full, indent=1, ensure_ascii=False) == f.read_text(), "boxes": len(fields), "unique": len({x["data_path"] for x in fields}),
                   "entry": len(entry), "in_shipped": sum(1 for x in entry if x["in_shipped_data"])}
print(json.dumps(out))
`;
const forms = JSON.parse(execFileSync(PY, ["-I", "-c", REDERIVE, P1], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })) as Record<string, { same_file: boolean; boxes: number; unique: number; entry: number; in_shipped: number }>;
const names = readdirSync(INV).filter((n) => /^imm.*\.inventory\.json$/.test(n) && !n.includes(".text."));
ok("PD: every committed XFA inventory was re-derived from its official file", names.length >= 19 && names.every((n) => n in forms), { committed: names.length, read: Object.keys(forms).length });
const f5532 = forms["imm5532e.inventory.json"];
ok("PD pass: IMM 5532 gives each of its 314 boxes its own path (was 44 boxes on 20 paths), each one in the form's shipped data",
  f5532?.boxes === 314 && f5532.unique === 314 && f5532.entry === 314 && f5532.in_shipped === 314, f5532);
const dup = Object.entries(forms).filter(([, f]) => f.unique !== f.boxes).map(([n]) => n);
ok("PD pass: no committed XFA inventory repeats a data path", dup.length === 0, dup);
const changed = Object.entries(forms).filter(([, f]) => !f.same_file).map(([n]) => n);
ok("PD: every committed inventory is exactly what today's reader writes (the others are unchanged, so their saved AI runs stay valid)", changed.length === 0, changed);
const job = JSON.parse(readFileSync(join(SOLUTION, "prototype", "p2", "jobs", "studio-fieldmap-imm5532e.json"), "utf8"));
const sha = createHash("sha256").update(readFileSync(join(INV, "imm5532e.inventory.json"))).digest("hex");
ok("PD: IMM 5532's drafting job names the new inventory by its checksum (its old saved run no longer replays; a re-run is due)", job.inputs?.[0]?.sha256 === sha, { job: job.inputs?.[0]?.sha256, file: sha });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
