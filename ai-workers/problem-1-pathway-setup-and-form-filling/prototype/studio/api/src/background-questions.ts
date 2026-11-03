// C3.8 [IRCC-F08] (QA-199): the Background information questions of a PDF edition, from the form's own reading (its
// inventory file), shared by the decision refusal (screen02.ts) and the release validator (studio.ts). The rule itself is
// engine/form-completeness.ts `backgroundQuestions`.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { backgroundQuestions, type ReadField } from "../../engine/form-completeness.ts";
import { SOLUTION } from "./core.ts";

// A reading is never overwritten (tools/read_form.py re-derives and compares), so one read per file is kept.
const read = new Map<string, Map<string, string | null>>();

/** The data paths of the edition's Background information questions, each with the form's words above it. An edition
 *  with no reading recorded has none it can name (its form fields came from no reading either). A reading recorded but
 *  missing or unreadable here is null: the callers fail closed (review Minor 1), never "no Background questions". */
export function backgroundPathsOf(inventoryFile: string | null | undefined): Map<string, string | null> | null {
  if (!inventoryFile) return new Map();
  let got = read.get(inventoryFile);
  if (!got) {
    try { got = backgroundQuestions((JSON.parse(readFileSync(join(SOLUTION, inventoryFile), "utf8")) as { fields?: ReadField[] }).fields ?? []); } catch { return null; }
    read.set(inventoryFile, got);
  }
  return got;
}
