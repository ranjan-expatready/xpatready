// C3.8 [IRCC-F08] (QA-199): the Background information questions of a PDF edition, from the form's own reading (its
// inventory file), shared by the decision refusal (screen02.ts) and the release validator (studio.ts). The rule itself is
// engine/form-completeness.ts `backgroundQuestions`.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { backgroundQuestions, type ReadField } from "../../engine/form-completeness.ts";
import { SOLUTION } from "./core.ts";

// A reading is never overwritten (tools/read_form.py re-derives and compares), so one read per file is kept.
const read = new Map<string, Set<string>>();

/** The data paths of the edition's Background information questions. An edition with no reading on this computer has
 *  none it can name: its form fields came from no reading either, so nothing is drafted to refuse. */
export function backgroundPathsOf(inventoryFile: string | null | undefined): Set<string> {
  if (!inventoryFile) return new Set();
  let got = read.get(inventoryFile);
  if (!got) {
    try { got = backgroundQuestions((JSON.parse(readFileSync(join(SOLUTION, inventoryFile), "utf8")) as { fields?: ReadField[] }).fields ?? []); } catch { return new Set(); }
    read.set(inventoryFile, got);
  }
  return got;
}
