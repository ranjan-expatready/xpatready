// The saved-reading helpers (C2.6, moved here for C4.11 step 2; forms lane, tech lead's ask on #282/#319): find the newest
// saved real AI reading of exactly one official checklist's text (checked by checksum) and read it, with the rules of
// P-121, into requirement lines. Pure (files only, no database, no AI, US$0). Used by the checklist panel's Replay
// (checklist.ts) and by "Draft questions and documents" step 2 (draft-qd.ts).
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { PROTOTYPE, SOLUTION } from "./core.ts";

/** What a checklist proposal carries in its payload (ProposalItem kind requirement_line; its review row says document_requirement). */
export type RequirementProposal = { document_type: string; who: string; base_or_conditional: "base" | "conditional"; condition_plain?: string | null; condition_tree?: unknown; provided_by?: string };

const RUNS_DIR = join(PROTOTYPE, "p2", "runs");
/** "imm5488e.pdf" → "prototype/p1/inventory/imm5488e.text.inventory.json": the checklist's text as the AI read it. */
export const inventoryOf = (officialFile: string) => `prototype/p1/inventory/${basename(officialFile).replace(/\.pdf$/i, "").toLowerCase()}.text.inventory.json`;
/** Quotes are compared on their words: case, spaces and the kind of quote mark do not count. */
export const wordsOf = (t: string) => t.toLowerCase().replace(/[\u2018\u2019\u201c\u201d'"`]/g, "").replace(/\s+/g, " ").trim();
type SavedDoc = { document_type?: unknown; who?: unknown; base_or_conditional?: unknown; condition_plain?: unknown; condition?: unknown; provided_by?: unknown; source_file?: unknown; source_quote?: unknown; confidence?: unknown; reason?: unknown; new_type?: unknown };
export type SavedReading = { runFile: string; runId: string; inventory: string; sha256: string; text: string; docs: SavedDoc[] };
/** The newest saved real (live, contract-valid) requirements run that read this checklist's text with the same checksum,
 *  or null. A stub run is never replayed (break R5-1); a run of another edition's text does not match its checksum. */
export function savedReading(officialFile: string | null, where: { runs?: string; root?: string } = {}): SavedReading | null {
  if (!officialFile) return null;
  const inventory = inventoryOf(officialFile), RUNS = where.runs ?? RUNS_DIR;
  let bytes: Buffer; try { bytes = readFileSync(join(where.root ?? SOLUTION, inventory)); } catch { return null; }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  let files: string[]; try { files = readdirSync(RUNS).filter((f) => /-requirements-live-.*\.json$/.test(f)).sort().reverse(); } catch { return null; }
  for (const f of files) {
    type SavedRun = { caller?: unknown; contract_valid?: unknown; raw_output?: unknown; drafting_run?: { kind?: unknown; run_id?: unknown; inputs?: { official_files?: { file?: unknown; sha256?: unknown }[] } } };
    let d: SavedRun; try { d = JSON.parse(readFileSync(join(RUNS, f), "utf8")) as SavedRun; } catch { continue; }
    if (d?.caller !== "live" || d?.contract_valid !== true || d?.drafting_run?.kind !== "requirements") continue;
    if (!(d.drafting_run.inputs?.official_files ?? []).some((x) => x?.file === inventory && x?.sha256 === sha256)) continue;
    let out: { documents?: unknown }; try { out = (typeof d.raw_output === "string" ? JSON.parse(d.raw_output) : d.raw_output) as { documents?: unknown }; } catch { continue; }
    if (!Array.isArray(out?.documents)) continue;
    let text = ""; try { text = String(JSON.parse(bytes.toString("utf8")).text ?? ""); } catch { /* no text: every quote is dropped */ }
    return { runFile: `prototype/p2/runs/${f}`, runId: String(d.drafting_run.run_id ?? f.replace(/\.json$/, "")), inventory, sha256, text, docs: out.documents as SavedDoc[] };
  }
  return null;
}
const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export type ReadLine = RequirementProposal & { condition_plain: string | null; condition_tree: unknown; provided_by: string; quote: string; reason: string | null };
/** The saved run's condition ({ subject_kind, tree_json: "…" }) as a condition-language root, as p2/assemble.ts toRoot
 *  makes it: the first live drafts named branch keys "conditions"/"condition", renamed to "args"/"arg" (discovery D18),
 *  and the subject kind goes on the root. Null when it has none or the text does not parse. */
const renameBranches = (n: unknown): unknown => {
  if (!n || typeof n !== "object" || Array.isArray(n)) return n;
  const o: Record<string, unknown> = {}, op = (n as { op?: unknown }).op;
  for (const [k, v] of Object.entries(n)) {
    if (k === "conditions" && (op === "and" || op === "or") && Array.isArray(v)) o.args = v.map(renameBranches);
    else if (k === "condition" && op === "not") o.arg = renameBranches(v);
    else o[k] = v;
  }
  return o;
};
export const treeOf = (c: unknown): unknown => {
  const x = c as { tree_json?: unknown; subject_kind?: unknown } | null;
  if (typeof x?.tree_json !== "string") return null;
  let t: unknown; try { t = JSON.parse(x.tree_json); } catch { return null; }
  if (!t || typeof t !== "object" || Array.isArray(t)) return null;
  return { subjectKind: String(x.subject_kind ?? "").toUpperCase().replace(/[^A-Z0-9_]/g, "_"), ...(renameBranches(t) as Record<string, unknown>) };
};
/** The rules on a saved reading (P-121), no database: only the lines read from this checklist itself; each complete
 *  (document type, person, kind, and a condition when conditional); its quote found in the checklist's text; no line
 *  twice for the same person. Everything else is dropped with its reason in words. */
export function linesOf(r: Pick<SavedReading, "inventory" | "text" | "docs">, label: string): { lines: ReadLine[]; dropped: string[] } {
  const text = wordsOf(r.text), lines: ReadLine[] = [], dropped: string[] = [], seen = new Set<string>();
  for (const d of r.docs.filter((x) => x.source_file === r.inventory)) {
    const type = str(d.document_type, 120), who = str(d.who, 60), quote = str(d.source_quote, 1000), cond = str(d.condition_plain, 300);
    const kind = d.base_or_conditional === "conditional" ? "conditional" : d.base_or_conditional === "base" ? "base" : null;
    if (!type || !who || !kind || (kind === "conditional" && (!cond || cond.length < 3))) { dropped.push(`${type ?? "a line"} (incomplete: no document type, person or condition)`); continue; }
    if (!quote || !text.includes(wordsOf(quote))) { dropped.push(`${type} (its quote is not in ${label})`); continue; }
    const id = `${wordsOf(type)}|${who}`;
    if (seen.has(id)) { dropped.push(`${type} for ${who.replace(/_/g, " ")} (the same line twice)`); continue; }
    seen.add(id);
    lines.push({ document_type: type, who, base_or_conditional: kind, condition_plain: kind === "conditional" ? cond : null, condition_tree: kind === "conditional" ? treeOf(d.condition) : null, provided_by: str(d.provided_by, 40) ?? "client", quote, reason: str(d.reason, 300) });
  }
  return { lines, dropped };
}
