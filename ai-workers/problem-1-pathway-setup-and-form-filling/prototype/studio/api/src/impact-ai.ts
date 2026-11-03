// C9.1 (row C9.1-AI, P-138, P-175, P-121, P-227): AI on a held new edition, for its new and reworded boxes only. Pure but
// for reading the committed inventories and writing the regenerated part file, so a check and the paid runner's job tool
// (tools/c91-impact-job.ts) load it directly.
//  - The comparison box by box (no AI, US$0) is `compareBoxes`; impact.ts and the job tool both use it, so the boxes the
//    paid run reads are exactly the boxes the review offers.
//  - The AI step reads one inventory part (p2/guard.ts admitPart: an exact subset of the held edition's own inventory)
//    holding only the new and reworded boxes, with the existing part prompt (field-map-part.v1.md, made for a subset)
//    and the field map's blind checker prompt; no new prompt. The part names its boxes' hash, so a saved run replays
//    only against the same comparison (the guard and the replay both check the part's checksum).
//  - An answer is used only when it has the field map's shape, names this printed edition, and every box it answers is
//    one of the changed boxes (an answer about another box is never used).
// Which boxes a form has and what they mean are Sample until the immigration expert confirms (AGENTS rule 4).
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { PARTS_DIR } from "../../../p2/policy.ts";
import { costUsd, inputTokenBound } from "../../../p2/ledger.ts";
import { costWords } from "../../contracts/start-setup.ts";
import { costBesideLimit, isProviderLimit } from "../../engine/ai-run.ts";
import { partOutputTokens } from "../../engine/parts.ts";
import { editionContextKey, replayPattern, savedRunKey, type SavedRun } from "../../engine/rounds.ts";
import { SOLUTION } from "./core.ts";
import { fieldMapShapeOk, sameEdition, type FieldMapOutput } from "./field-drafts.ts";
import { MODEL, roundBudgetUsd, RUNS, type AiStep } from "./rounds.ts";

export type InvField = { data_path?: string; caption?: string; section?: string };
export type BoxRow = { dataPath: string; caption: string; section: string | null; change: "unchanged" | "reworded" | "new" | "removed"; was?: string; field?: string | null; outcome?: string };
type OldMap = { canonicalFieldKey: string | null; outcome: string };
const norm = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

/** BR-12: the new edition compared with the library's, box by box by data path and caption (no AI). */
export function compareBoxes(fresh: InvField[], oldFields: InvField[], oldMaps: Map<string, OldMap>): BoxRow[] {
  const before = new Map(oldFields.map((f) => [f.data_path!, f]));
  const rows: BoxRow[] = fresh.map((f) => {
    const o = before.get(f.data_path!), m = oldMaps.get(f.data_path!);
    const change = !o ? "new" : norm(o.caption) === norm(f.caption) ? "unchanged" : "reworded";
    return { dataPath: f.data_path!, caption: (f.caption || f.data_path!).slice(0, 300), section: f.section ?? null, change, ...(change === "reworded" ? { was: (o!.caption ?? "").slice(0, 300) } : {}), field: m?.canonicalFieldKey ?? null, outcome: m?.outcome };
  });
  const now = new Set(fresh.map((f) => f.data_path!));
  for (const o of oldFields) if (!now.has(o.data_path!)) { const m = oldMaps.get(o.data_path!); rows.push({ dataPath: o.data_path!, caption: (o.caption || o.data_path!).slice(0, 300), section: o.section ?? null, change: "removed", field: m?.canonicalFieldKey ?? null, outcome: m?.outcome }); }
  return rows;
}

/** The data-bound boxes of an inventory (path relative to the solution folder). */
export const inventoryFields = (rel: string) => (JSON.parse(readFileSync(join(SOLUTION, rel), "utf8")).fields as InvField[]).filter((f) => f.data_path);
/** The boxes AI drafts: the new and reworded ones, in the inventory's order. */
export const changedBoxes = (rows: BoxRow[]) => rows.filter((r) => r.change === "new" || r.change === "reworded").map((r) => r.dataPath);

/** P-32: the components a changed box touches, by kind, each saying why in words (which box changed, how its field is
 *  used) and in which combination. `uses` come from the where-used service (where-used.ts fieldComponentsOf). */
type Use = { kind: string; key: string; label: string; field: string; combinationId: string; how: "asks" | "condition" | "fact" };
const HOW = { asks: "this section asks it", condition: "its condition reads it", fact: "a fact of it is read from this document" } as const;
export function componentsView(uses: Use[], rows: BoxRow[], fieldLabel: Map<string, string>, comboLabel: Map<string, string>, edition: string) {
  const changedBy = (field: string) => rows.filter((r) => r.field === field && (r.change === "removed" || r.change === "reworded"));
  const of = (kind: string) => uses.filter((u) => u.kind === kind).map((u) => {
    const boxes = changedBy(u.field);
    const box = boxes.map((b) => b.change === "removed" ? `"${b.caption.slice(0, 80)}" (removed in ${edition})` : `"${(b.was ?? "").slice(0, 80)}" (reworded in ${edition} as "${b.caption.slice(0, 80)}")`).join(", ");
    return { key: u.key, label: u.label, field: u.field, combination: comboLabel.get(u.combinationId) ?? "A combination", combination_id: u.combinationId, boxes: boxes.map((b) => b.dataPath),
      why: `The box ${box || "(none)"} fills ${fieldLabel.get(u.field) ?? u.field}, and ${HOW[u.how]}.`.slice(0, 600) };
  }).filter((x) => x.boxes.length).sort((a, b) => `${a.combination}|${a.label}`.localeCompare(`${b.combination}|${b.label}`));
  return { sections: of("section"), document_types: of("document_type"), rules: of("rule"), checks: of("check") };
}

export const IMPACT_JOB_BASE = "studio-fieldmap-impact";
export const IMPACT_AI_WORDS = {
  noSaved: "No saved AI run for this comparison yet: Draft with AI runs it (about US$x · at most US$y), or a person maps each new and reworded box.",
  badSaved: "The saved AI run for this comparison could not be read, so it was not used.",
  nothingUsed: "Nothing of it was used: a person maps each new and reworded box.",
  offer: (n: number, cost: string) => `Draft with AI (${cost}): proposals for the ${n} new and reworded box${n === 1 ? "" : "es"} only; nothing runs until you click, and a person accepts each one.`,
  none: "No new or reworded boxes: nothing for AI to draft.",
  liveOff: (cost: string) => `Draft with AI (${cost}) is not open on this copy: live AI is off (only the founder turns it on). Nothing was sent and nothing was charged. Use a saved AI run (US$0), or a person maps each new and reworded box.`,
  stale: "The saved AI run was made for another comparison of this edition (its new and reworded boxes differ), so it is out of date and not used. Draft with AI again, or a person maps the boxes.",
  overCap: (worst: number, left: number) => `Not started: the worst case (US$${worst.toFixed(2)}) is above what is left of the AI spending cap (US$${left.toFixed(2)}). Nothing was started.`,
  savedFirst: "A saved AI run of this comparison is here: use it at US$0. A paid run is not started while a saved one exists.",
  paidOnce: (usd: number) => `This comparison already had a paid AI run (${usd > 0 ? `counted at US$${usd.toFixed(2)}` : "stopped before its cost was recorded, so it may have been sent"}) whose answer could not be used, so another is not started from here. A person maps each new and reworded box; another paid run needs the tech lead's Go.`,
  outside: (path: string) => `The AI answer named a box that is not new or reworded (${path.slice(0, 120)}), so it was not used.`,
};

/** The inventory part of the changed boxes, exactly as the guard admits it (copied unchanged from the parent). */
export function impactPart(invRel: string, changed: string[]) {
  const invBytes = readFileSync(join(SOLUTION, invRel)), inv = JSON.parse(invBytes.toString("utf8"));
  const want = new Set(changed);
  const fields = (inv.fields as InvField[]).filter((f) => f.data_path && want.has(f.data_path));
  const boxesSha = sha(JSON.stringify([...changed].sort()));
  const body = { contract: "inventory-part/v1", parent: { file: invRel, sha256: sha(invBytes) }, part: { index: 1, count: 1 }, summary: inv.summary, groups: inv.groups, presence_scripts: inv.presence_scripts, fields };
  const text = JSON.stringify(body, null, 1) + "\n";
  const file = `${basename(invRel).replace(/\.inventory\.json$/, "")}.impact-${boxesSha.slice(0, 12)}.part.json`;
  return { file, rel: `prototype/p2/parts/${file}`, text, sha256: sha(text), fields: fields.length, boxesSha, editionSha256: String(inv.summary?.sha256 ?? "") };
}
/** Writes the part (p2/parts is regenerated, never committed); unchanged bytes are not rewritten. */
export function writePart(p: ReturnType<typeof impactPart>) {
  mkdirSync(PARTS_DIR, { recursive: true });
  const f = join(PARTS_DIR, p.file);
  if (!existsSync(f) || readFileSync(f, "utf8") !== p.text) writeFileSync(f, p.text);
}

/** The step for one held edition's changed boxes: the field map's settings, the part prompt, its own job base and key. */
export function impactStep(printed: string, changed: string[]): AiStep {
  const inside = new Set(changed);
  return {
    kind: "field_map_edition", jobBase: IMPACT_JOB_BASE, configurationVersion: "c91-impact",
    template: "field-map-part.v1.md", check: "field-map-check.v1.md", schema: "field-map-output.v2.schema.json",
    effort: "high", max_output_tokens: partOutputTokens(changed.length), words: IMPACT_AI_WORDS,
    shapeOk: (o) => fieldMapShapeOk(o) && sameEdition(o, { printed }) && answersInside(o, inside) === null,
  };
}
/** The first answered box that is not one of the changed boxes, or null when every answer is about a changed box. */
export const answersInside = (o: FieldMapOutput, inside: Set<string>) => o.entries.find((e) => !inside.has(e.data_path))?.data_path ?? null;

/** The round context of the step: the edition's key (`edition:<code>:<edition>`, the launcher's known printed edition). */
export const impactContext = (printed: string, part: ReturnType<typeof impactPart>, batchId?: string) => {
  const m = /^(IMM [0-9A-Z ]+?) \(([0-9]{2}-[0-9]{4})\)$/.exec(printed);
  return { trail: part.file.replace(/\.part\.json$/, ""), contextKey: m ? editionContextKey(m[1], m[2]) : `edition:${printed}`, inputs: [{ file: part.rel, sha256: part.sha256 }], batchId };
};

/** Usual and worst cost of both rounds, before anything runs. Worst: what the launcher reserves for each round (both
 *  attempts at the output limit, sized as the job carries it). Usual: one attempt per round, input tokens bounded by
 *  characters, half the output limit (an estimate, labelled so; never a cap). The part file must be written first. */
export function impactCost(step: AiStep, part: ReturnType<typeof impactPart>) {
  const inputs = [{ file: part.rel }];
  const chars = (t: string) => part.text.length + readFileSync(join(SOLUTION, "prototype", "p2", "prompts", t), "utf8").length;
  const worst = roundBudgetUsd(step, false, inputs, chars(step.template)) + roundBudgetUsd(step, true, inputs, chars(step.check));
  const usual = costUsd(MODEL, inputTokenBound("x".repeat(chars(step.template))), Math.round(step.max_output_tokens / 2)) + costUsd(MODEL, inputTokenBound("x".repeat(chars(step.check))), Math.round(step.max_output_tokens / 2));
  const r = (n: number) => Math.round(n * 100) / 100;
  return { about_usd: r(usual), at_most_usd: r(worst), words: costWords(r(usual), r(worst)) };
}

/** Break B1, M1, M2: every live run the launcher made for this part (p2/runs keeps a record of each live call, whatever
 *  its outcome, and survives a demo reset): a record means money may have been spent on this comparison. */
export function liveRunsOf(partSha256: string): { file: string; costUsd: number; usable: boolean }[] {
  if (!existsSync(RUNS)) return [];
  const out: { file: string; costUsd: number; usable: boolean }[] = [];
  for (const f of readdirSync(RUNS).filter((x) => x.startsWith(`${IMPACT_JOB_BASE}-`) && /-live-\d{8}t\d{9}z-[a-z0-9]+\.json$/.test(x))) {
    let r: SavedRun; try { r = JSON.parse(readFileSync(join(RUNS, f), "utf8")); } catch { continue; }
    const inputs = (r.drafting_run?.inputs?.official_files ?? []) as { sha256?: string }[];
    if (r.caller !== "live" || !inputs.some((i) => i.sha256 === partSha256)) continue;
    // Round 2 Major B: only a call that cost money counts (as rounds.ts charges it: a provider-limit refusal counts only
    // an earlier attempt beside it); a refusal at US$0 may be started again.
    const env = r as unknown as Parameters<typeof costBesideLimit>[0];
    const cost = isProviderLimit(env) ? costBesideLimit(env) : Number(r.drafting_run?.usage?.cost_usd ?? 0);
    if (cost > 0) out.push({ file: f, costUsd: cost, usable: r.contract_valid === true && typeof r.raw_output === "string" });
  }
  return out;
}

/** A saved run of this step for this edition but another comparison: it exists, and is out of date (never replayed). */
export function staleRun(contextKey: string, partSha256: string): string | null {
  if (!existsSync(RUNS)) return null;
  const mine = replayPattern(IMPACT_JOB_BASE, false);
  for (const f of readdirSync(RUNS).filter((x) => mine.test(x))) {
    let r: SavedRun; try { r = JSON.parse(readFileSync(join(RUNS, f), "utf8")); } catch { continue; }
    const inputs = (r.drafting_run?.inputs?.official_files ?? []) as { sha256?: string }[];
    if (savedRunKey(r, {}) === contextKey && !inputs.some((i) => i.sha256 === partSha256)) return f;
  }
  return null;
}

/** P-151 (1): IRCC's accepted-until date for a form's previous edition, read from the form's own IRCC page in the official
 *  library (official-sources/ircc/web-pages/page-<code>.html, with its address and the day it was saved), quoted; null
 *  when the page is not in the library or says no such date. */
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
export function previousAcceptedUntil(code: string, today = new Date()) {
  const name = `page-${code.toLowerCase().replace(/\s+/g, "")}.html`;
  const dir = join(SOLUTION, "official-sources", "ircc");
  let item: { path?: string; url?: string; downloaded_utc?: string } | undefined;
  try { item = (JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")).items as { file?: string; path?: string; url?: string; downloaded_utc?: string }[]).find((i) => i.file === name); } catch { return null; }
  if (!item?.path) return null;
  let html: string; try { html = readFileSync(join(dir, item.path), "utf8"); } catch { return null; }
  const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ");
  const m = /We will continue to accept the previous versions? of (?:the|this) form until ([A-Z][a-z]+) (\d{1,2}), (\d{4})\./.exec(text);
  if (!m || !MONTHS.includes(m[1].toLowerCase())) return null;
  const until = `${m[3]}-${String(MONTHS.indexOf(m[1].toLowerCase()) + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  const passed = until < today.toISOString().slice(0, 10);
  return { until, passed, quote: m[0], url: item.url ?? null, saved: item.downloaded_utc?.slice(0, 10) ?? null,
    words: passed ? `IRCC accepted the previous edition until ${m[1]} ${m[2]}, ${m[3]}; that date has passed, so a case still on the previous edition cannot be ready to file.`
      : `IRCC accepts the previous edition until ${m[1]} ${m[2]}, ${m[3]}; after that date a case on the previous edition cannot be ready to file.` };
}
