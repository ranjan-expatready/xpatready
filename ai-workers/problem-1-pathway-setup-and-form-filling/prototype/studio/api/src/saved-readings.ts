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
/** B82: a fact the saved reading itself defined: its proposed_fields (a meaning and an answer type) and its derived_fields
 *  (worked out from others: its plain words, no answer type). */
export type SavedFact = { id: string; meaning: string; plain: string; valueType: string | null; derived: boolean };
export type SavedReading = { runFile: string; runId: string; inventory: string; sha256: string; text: string; docs: SavedDoc[]; facts: SavedFact[] };
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
    let out: { documents?: unknown; proposed_fields?: unknown; derived_fields?: unknown }; try { out = (typeof d.raw_output === "string" ? JSON.parse(d.raw_output) : d.raw_output) as typeof out; } catch { continue; }
    if (!Array.isArray(out?.documents)) continue;
    let text = ""; try { text = String(JSON.parse(bytes.toString("utf8")).text ?? ""); } catch { /* no text: every quote is dropped */ }
    return { runFile: `prototype/p2/runs/${f}`, runId: String(d.drafting_run.run_id ?? f.replace(/\.json$/, "")), inventory, sha256, text, docs: out.documents as SavedDoc[], facts: savedFacts(out) };
  }
  return null;
}
/** B82: the facts a saved reading defined. A derived one means its first sentence; the rest is the AI's working, kept in
 *  `plain` for the item's reading (it may say what a person must settle, such as an age the checklist does not state). */
function savedFacts(out: { proposed_fields?: unknown; derived_fields?: unknown }): SavedFact[] {
  const list = (v: unknown) => (Array.isArray(v) ? v : []) as { id?: unknown; meaning?: unknown; value_type?: unknown; plain?: unknown }[];
  const asked = list(out.proposed_fields).map((f) => ({ id: str(f.id, 120), meaning: str(f.meaning, 500), plain: str(f.meaning, 500), valueType: str(f.value_type, 40), derived: false }));
  const worked = list(out.derived_fields).map((f) => ({ id: str(f.id, 120), meaning: str(f.plain, 500)?.split(/(?<=\.)\s+/)[0] ?? null, plain: str(f.plain, 500), valueType: null, derived: true }));
  return [...asked, ...worked].filter((f): f is SavedFact => !!f.id && !!f.meaning && !!f.plain);
}
/** BR-10 (C4.11 part 4c): the newest saved real reading of this checklist FILE whose text checksum is no longer the
 *  file's (a newer edition replaced the text), or null. It is never replayed (savedReading matches checksums only); it
 *  is named so a plan can say the saved result is out of date instead of "none". */
export function staleReading(officialFile: string | null, where: { runs?: string; root?: string } = {}): { runFile: string; sha256: string } | null {
  if (!officialFile) return null;
  const inventory = inventoryOf(officialFile), RUNS = where.runs ?? RUNS_DIR;
  let now = ""; try { now = createHash("sha256").update(readFileSync(join(where.root ?? SOLUTION, inventory))).digest("hex"); } catch { return null; /* #397 m1: the text is not on this computer, so nothing can be said to be of an earlier text */ }
  let files: string[]; try { files = readdirSync(RUNS).filter((f) => /-requirements-live-.*\.json$/.test(f)).sort().reverse(); } catch { return null; }
  let stale: { runFile: string; sha256: string } | null = null;
  for (const f of files) {
    let d: { caller?: unknown; contract_valid?: unknown; drafting_run?: { kind?: unknown; inputs?: { official_files?: { file?: unknown; sha256?: unknown }[] } } };
    try { d = JSON.parse(readFileSync(join(RUNS, f), "utf8")); } catch { continue; }
    if (d?.caller !== "live" || d?.contract_valid !== true || d?.drafting_run?.kind !== "requirements") continue;
    const read = (d.drafting_run.inputs?.official_files ?? []).find((x) => x?.file === inventory);
    if (!read || typeof read.sha256 !== "string") continue;
    if (read.sha256 === now) return null; // a reading of the current text exists: nothing is out of date
    stale ??= { runFile: `prototype/p2/runs/${f}`, sha256: read.sha256 };
  }
  return stale;
}
const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** QA-157 (C2.6): `office` is set when the checklist itself sends the line to the visa office ("Refer to the responsible
 *  visa office for your region"): the checklist does not settle when it is needed, so a person decides. `part` is the
 *  checklist part the line sits under when that part is another program's (see PROGRAM_PARTS). */
export type ReadLine = RequirementProposal & { condition_plain: string | null; condition_tree: unknown; provided_by: string; quote: string; reason: string | null; note: string | null; office: boolean; part: string | null };

/** QA-157 (C2.6): parts of a checklist that belong to another program than the checklist's own. IMM 5484 (05-2026)
 *  page 2 is headed "PARENTS AND GRANDPARENTS SUPER VISA" (official-sources/ircc/checklists/imm5484e.pdf, page 2, read
 *  2 Nov 2026): its documents are the Super visa's, never a Visitor visa's. A line under such a heading is proposed only
 *  for a combination whose trail names every word of `program`. */
export const PROGRAM_PARTS: { heading: string; program: string[] }[] = [
  { heading: "PARENTS AND GRANDPARENTS SUPER VISA", program: ["super", "visa"] },
];
/** Whether a combination (its trail, Pathway › … › Combination, in words) is the program a checklist part is for. */
export const partFits = (part: string, trail: string) => {
  const p = PROGRAM_PARTS.find((x) => x.heading === part), words = new Set(wordsOf(trail).split(/[^a-z0-9]+/));
  return !!p && p.program.every((w) => words.has(w));
};
/** A document type key in words, as a person reads it ("us_nonimmigrant_visa_copy" → "US nonimmigrant visa copy"). */
const said = (t: string) => { const w = t.replace(/[_\s]+/g, " ").trim(); return w ? (w[0].toUpperCase() + w.slice(1)).replace(/\bUs\b/, "US") : t; };
/** An office line's draft condition without the AI's own commentary ("Draft condition: …", "The checklist states no
 *  condition…"): only its sentences that say when, as the line will read (review Major 2 on #574). */
const conditionWords = (c: string) => { const keep = c.replace(/^draft condition:\s*/i, "").split(/(?<=\.)\s+/).filter((x) => !/checklist|visa office|defers|not among the inputs/i.test(x)).join(" ").trim(); return keep ? keep[0].toUpperCase() + keep.slice(1) : null; };
/** The checklist says the visa office decides (P-149: a person decides what the source does not settle). */
const OFFICE = /refer to the (responsible )?visa office|visa specific instructions/i;
/** A line that names no document ("Any additional documents required by the responsible visa office"). */
const NAMES_NO_DOCUMENT = /^any (other |additional )+documents?\b/i;
/** The text a saved quote and the PDF share: the inventory glues a line to the "Note:" under it ("...guardians.Note: Refer
 *  to..."), which the PDF prints on its own line. The document line is the words before the note; the note is kept apart. */
export function splitNote(quote: string): { quote: string; note: string | null } {
  const m = /^(.*?\S)\s*Note:\s*(.+)$/s.exec(quote);
  return m ? { quote: m[1].trim(), note: m[2].trim() } : { quote, note: null };
}
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
  // Where each other program's part starts in the checklist's text (words compared, as quotes are).
  const parts = PROGRAM_PARTS.map((p) => ({ heading: p.heading, at: r.text.split("\n").some((l) => l.trim() === p.heading) ? text.indexOf(wordsOf(p.heading)) : -1 })).filter((p) => p.at >= 0).sort((a, b) => a.at - b.at);
  for (const d of r.docs.filter((x) => x.source_file === r.inventory)) {
    const type = str(d.document_type, 120), who = str(d.who, 60), whole = str(d.source_quote, 1000);
    const office = !!whole && OFFICE.test(splitNote(whole).note ?? "");
    // An office line keeps what the AI read as its condition only as a draft for the person who decides it.
    const cond = str(d.condition_plain, 300);
    const kind = d.base_or_conditional === "conditional" ? "conditional" : d.base_or_conditional === "base" ? "base" : null;
    if (!type || !who || !kind || (kind === "conditional" && !office && (!cond || cond.length < 3))) { dropped.push(`${type ? said(type) : "a line"} (incomplete: no document type, person or condition)`); continue; }
    if (!whole || !text.includes(wordsOf(whole))) { dropped.push(`${said(type)} (its quote is not in ${label})`); continue; }
    const { quote, note } = splitNote(whole);
    if (NAMES_NO_DOCUMENT.test(quote)) { dropped.push(`${said(type)} (it names no document: "${quote.slice(0, 80)}"; the visa office's own instructions say which, and a person adds them)`); continue; }
    const at = text.indexOf(wordsOf(quote)), part = [...parts].reverse().find((p) => p.at <= at)?.heading ?? null;
    const id = `${wordsOf(type)}|${who}`;
    if (seen.has(id)) { dropped.push(`${said(type)} for ${who.replace(/_/g, " ")} (the same line twice)`); continue; }
    seen.add(id);
    const c = kind === "conditional" && cond && cond.length >= 3 ? (office ? conditionWords(cond) : cond) : null;
    lines.push({ document_type: type, who, base_or_conditional: office ? "conditional" : kind, condition_plain: office ? c : kind === "conditional" ? cond : null, condition_tree: c ? treeOf(d.condition) : null, provided_by: str(d.provided_by, 40) ?? "client", quote, reason: str(d.reason, 300), note, office, part });
  }
  return { lines, dropped };
}
