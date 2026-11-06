// B120 (P-376 (3)): the guard scans that read api/src read its subfolders too. Code moved into a subfolder
// (api/src/features/checkpoint/, features/placement/) must stay in their sight: a scan that silently stops seeing it is
// a weaker guard, not a refactor. Each scan also plants a file in a subfolder of a throwaway folder (planted) and checks
// that it is caught.
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/** Every .ts file under `dir`, subfolders included, as a path relative to it ("demo.ts", "features/checkpoint/…"), sorted. */
export function tsFiles(dir: string): string[] {
  return (readdirSync(dir, { recursive: true, encoding: "utf8" }) as string[]).map((f) => f.split("\\").join("/")).filter((f) => f.endsWith(".ts")).sort();
}

/** A throwaway folder holding `files` (relative path → text), for a scan's fail test. */
export function planted(files: Record<string, string>): string {
  const d = mkdtempSync(join(tmpdir(), "b120-scan-"));
  for (const [p, text] of Object.entries(files)) { mkdirSync(dirname(join(d, p)), { recursive: true }); writeFileSync(join(d, p), text); }
  return d;
}
