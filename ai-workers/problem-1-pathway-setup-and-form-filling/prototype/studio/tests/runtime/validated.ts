// QA-165 (TEST ONLY): a "validated" copy as Adobe's Validate leaves it, without Acrobat: the form's own validated flag and
// date last validated written into the copy (tools/simulate_validate.py), never a barcode. Before QA-165 the checks
// appended bytes to the copy, and the server took any changed file as validated; now it reads the form's own result.
//   asValidated(copy)                      → Validate passed (flag Yes, today's date)
//   asValidated(copy, "No")                → Validate ran and found the form incomplete
//   asValidated(copy, "none")              → only the bytes changed (what qa's golden journey 1 uploaded)
// BK-19 (P-46): with no barcode the upload is kept but never counts as validated (the barcode check reads 0 of N). As Adobe
// leaves it, with the barcodes written where a saved form keeps them (tools/simulate_validate.py `barcodes`):
//   asValidated(copy, "Yes", true, "barcodes")        → Validate passed and its barcodes agree with the form's answers
//   asValidated(copy, "Yes", true, "barcodes-stale")  → barcodes of other answers (the form changed after Validate)
//   adobeValidated(copy)                              → the first, for checks that need a copy that counts as validated
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const STUDIO = join(import.meta.dirname, "..", ".."), ROOT = join(STUDIO, "..", "..", "..", "..");
const PY = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python");

export function asValidated(copy: Buffer, flag: "Yes" | "Oui" | "No" | "none" = "Yes", withDate = true, barcodes: "" | "barcodes" | "barcodes-stale" = ""): Buffer {
  const dir = mkdtempSync(join(tmpdir(), "xr-validate-"));
  try {
    const src = join(dir, "copy.pdf"), out = join(dir, "validated.pdf");
    writeFileSync(src, copy);
    const r = spawnSync(PY, ["-I", join(STUDIO, "tools", "simulate_validate.py"), src, out, flag, ...(withDate ? [] : ["nodate"]), ...(barcodes ? [barcodes] : [])], { encoding: "utf8", timeout: 120_000 });
    if (r.status !== 0) throw new Error(`simulate_validate.py failed: ${(r.stderr || r.stdout).slice(-300)}`);
    return readFileSync(out);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

/** BK-19: a copy as Adobe's Validate leaves it when Validate passed, barcodes included (SYNTHETIC: BK-20 proves Adobe's). */
export const adobeValidated = (copy: Buffer): Buffer => asValidated(copy, "Yes", true, "barcodes");
