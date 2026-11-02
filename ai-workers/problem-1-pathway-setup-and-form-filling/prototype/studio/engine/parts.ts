// A4 (Lead check, accepted 23 Oct; F1 slice 2): a form's field map is drafted reuse first, in parts, and merged. Rules,
// no AI, no database:
//  1. reuse first: a form field a released earlier edition of the same form already maps (same data path, same caption,
//     same kind of box (QA-33), and for a choice field the same codes) takes that mapping, and the AI never sees it;
//  2. split: the form fields left are grouped by form section ("Part1.SponsorDetails") and packed into parts of at most
//     `maxFields`, so each AI call is small and the parts run side by side (the bounded queue); a repeating row group is
//     never split, so one person's row stays in one call;
//  3. merge: the parts' answers and the reused entries become one answer; the same meaning proposed under two names in
//     different parts is flagged as a near-duplicate for a person (never merged silently).
import { canonical } from "../../contracts/rules.ts";
import { normLabel } from "./twin.ts";
import { checkedOutput, type FieldMapAnswer, type FieldMapEntry, type RunEnvelope } from "./ai-run.ts";

export type InvField = { data_path?: string | null; caption?: string | null; section?: string | null; in_row?: string | null; [k: string]: unknown };
export type InvGroup = { data_path?: string | null; occur?: unknown; fixed_row?: boolean | null };
/** A mapping an earlier edition of the same form holds (its newest version). */
export type Prior = { data_path: string; caption: string | null; outcome: string; fact: string | null; person: string | null; transform: string | null; row: number | null; condition: string | null; confidence?: string | null; edition: string;
  /** The earlier edition's own choices for this form field (its inventory), so codes are reused only where they are the same. */
  options?: unknown;
  /** The earlier edition's kind of box (its inventory "ui": textEdit, dateTimeEdit, choiceList…): a date box that became a
   *  text box takes another transform, so it is not reused (QA-33). Left out by callers that do not know it. */
  ui?: string | null };
export type Reused = FieldMapEntry & { reused_from: string };
export type Part = { index: number; count: number; sections: string[]; fields: InvField[] };
export type DraftPlan = { total: number; reused: Reused[]; leftover: number; parts: Part[] };

export const MAX_PART_FIELDS = 60;
/** Output tokens a part may need: about 300 per form field (IMM 1295: 242 fields, 53–63 thousand), plus headroom. */
export const partOutputTokens = (fields: number) => Math.min(64_000, 4_000 + 300 * fields);

/** R-146 (2 Nov): a whole-form draft writes about 230 output tokens per form field (26 live runs), so a form of 240 fields
 *  or more needs 55k+ of the 64k limit (IMM 1344's 233 fields used 58-64k; IMM 0008 and 5532 need about 72k). Those forms
 *  get 128k (Opus 5.5's output limit; the runner streams) and a timeout for about 128k at ~140 tokens a second. Parts keep
 *  partOutputTokens. Anything that is not an inventory with a list of fields counts 0 fields (break m5). */
export const LARGE_FORM_FIELDS = 240;
export function wholeFormOutput(inv: unknown): { fields: number; max_output_tokens: number; timeout_ms: number } {
  const list = (inv as { fields?: unknown } | null)?.fields;
  const fields = Array.isArray(list) ? list.filter((f) => typeof (f as InvField | null)?.data_path === "string" && (f as InvField).data_path).length : 0;
  return fields >= LARGE_FORM_FIELDS ? { fields, max_output_tokens: 128_000, timeout_ms: 1_500_000 } : { fields, max_output_tokens: 64_000, timeout_ms: 900_000 };
}

/** The section group of a form field: the first two parts of its section ("Part1.CoSigner.CosignDetails" → "Part1.CoSigner"). */
export const sectionOf = (f: InvField) => ((f.section ?? "").split(".").slice(0, 2).join(".") || String(f.data_path ?? "").split(".").slice(0, 2).join(".") || "form");

export function planDraft(inv: { fields: InvField[]; groups?: InvGroup[] }, prior: Prior[], opts: { maxFields?: number; redirect?: (key: string) => string | null } = {}): DraftPlan {
  const max = opts.maxFields ?? MAX_PART_FIELDS;
  const fields = inv.fields.filter((f) => f.data_path);
  const byPath = new Map(prior.map((p) => [p.data_path, p]));
  const reused: Reused[] = [], left: InvField[] = [];
  for (const f of fields) {
    const p = byPath.get(f.data_path!);
    const fact = p?.fact ? (opts.redirect ? opts.redirect(p.fact) : p.fact) : null; // null: retired or gone, never reused
    // A choice field keeps its mapping only when its codes are the earlier edition's own (an inline code list in the
    // transform would otherwise copy old codes onto a new list; review 4).
    const sameChoices = canonical((f.options_resolved ?? f.options ?? null) as never) === canonical((p?.options ?? null) as never);
    const sameKind = p?.ui === undefined || (p.ui ?? null) === ((f.ui as string | null | undefined) ?? null);
    if (p && ["mapped", "not_a_fact", "never_filled"].includes(p.outcome) && normLabel(p.caption) === normLabel(f.caption) && sameChoices && sameKind && (p.outcome !== "mapped" || fact)) {
      reused.push({ data_path: f.data_path!, outcome: p.outcome, person: p.person, row: p.row, fact, transform: p.transform, condition: p.condition, confidence: p.confidence ?? "medium",
        unresolved_reason: p.outcome === "mapped" ? null : `as in ${p.edition}`, evidence_quote: f.caption ?? f.data_path!, reused_from: p.edition });
    } else left.push(f);
  }
  // Units that must stay together: the form fields of one repeating row (a group with an occurrence rule), else one field.
  const repeating = new Set((inv.groups ?? []).filter((g) => g.data_path && g.occur != null && !g.fixed_row).map((g) => g.data_path!));
  const units: { section: string; fields: InvField[] }[] = [];
  for (const f of left) {
    const row = f.in_row && repeating.has(f.in_row) ? f.in_row : null;
    const last = units.at(-1);
    if (row && last && last.fields[0].in_row === row) last.fields.push(f);
    else units.push({ section: sectionOf(f), fields: [f] });
  }
  // Pack units into parts in form order, a new part when the next unit would pass the limit or a new section group
  // starts once the part is at least half full.
  const parts: Omit<Part, "count">[] = [];
  let cur: Omit<Part, "count"> | null = null;
  for (const u of units) {
    const size = cur?.fields.length ?? 0;
    const newSection = !!cur && !cur.sections.includes(u.section);
    if (!cur || size + u.fields.length > max || (newSection && size >= max / 2)) { cur = { index: parts.length + 1, sections: [], fields: [] }; parts.push(cur); }
    if (!cur.sections.includes(u.section)) cur.sections.push(u.section);
    cur.fields.push(...u.fields);
  }
  return { total: fields.length, reused, leftover: left.length, parts: parts.map((p) => ({ ...p, count: parts.length })) };
}

export type NearDuplicate = { a: string; b: string; parts: [number, number]; why: string };
const words = (id: string) => id.split(".").slice(1).join("_").split("_").filter((w) => w && !["of", "the", "a", "an"].includes(w));
const normMeaning = (m: string) => m.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** One answer from the parts' answers (in part order) and the reused entries, with near-duplicate proposals flagged. A
 *  part's answer counts only for that part's own form fields (an entry for another part's field is set aside and
 *  listed); a form field its part did not answer stays open with the reason, never silently dropped. */
export function mergeParts(answers: { part: number; answer: FieldMapAnswer; fields: string[] }[], reused: Reused[]): { answer: FieldMapAnswer & { entries: (FieldMapEntry & { reused_from?: string; part?: number })[] }; near_duplicates: NearDuplicate[]; set_aside: { part: number; data_path: string }[]; unanswered: string[] } {
  const fields = new Map<string, { id: string; meaning: string; value_type: string; part: number }>();
  const near: NearDuplicate[] = [];
  for (const { part, answer } of answers) for (const c of answer.canonical_fields ?? []) {
    const had = fields.get(c.id);
    if (had) { if (normMeaning(had.meaning) !== normMeaning(c.meaning) || had.value_type !== c.value_type) near.push({ a: c.id, b: c.id, parts: [had.part, part], why: `the same name with another meaning or type in part ${part} ("${c.meaning}", ${c.value_type})` }); continue; }
    for (const o of fields.values()) {
      if (o.part === part || o.id.split(".")[0] !== c.id.split(".")[0]) continue;
      const wa = new Set(words(o.id)), wb = new Set(words(c.id));
      const shared = [...wa].filter((w) => wb.has(w)).length;
      const sameWords = shared === wa.size && shared === wb.size;
      const contained = shared >= 2 && (shared === wa.size || shared === wb.size);
      const sameMeaning = normMeaning(o.meaning) === normMeaning(c.meaning);
      if (sameWords || contained || sameMeaning) near.push({ a: o.id, b: c.id, parts: [o.part, part], why: sameMeaning ? "the same meaning under two names" : sameWords ? "the same words in another order" : "one name holds the other" });
    }
    fields.set(c.id, { ...c, part });
  }
  const seen = new Set<string>();
  const entries: (FieldMapEntry & { reused_from?: string; part?: number })[] = [];
  const setAside: { part: number; data_path: string }[] = [], unanswered: string[] = [];
  for (const e of reused) { seen.add(e.data_path); entries.push(e); }
  for (const { part, answer, fields: own } of answers) {
    const mine = new Set(own);
    for (const e of answer.entries ?? []) {
      if (!mine.has(e.data_path) || seen.has(e.data_path)) { setAside.push({ part, data_path: e.data_path }); continue; }
      seen.add(e.data_path); entries.push({ ...e, part });
    }
    for (const d of own) if (!seen.has(d)) {
      seen.add(d); unanswered.push(d);
      entries.push({ data_path: d, outcome: "unresolved", person: "none", row: null, fact: null, transform: null, condition: null, confidence: "low", unresolved_reason: `Part ${part} gave no answer for this form field: a person maps it.`, evidence_quote: d, part });
    }
  }
  return { answer: { form_edition: answers[0]?.answer.form_edition, canonical_fields: [...fields.values()].map(({ part: _p, ...c }) => c), entries }, near_duplicates: near, set_aside: setAside, unanswered };
}

type PartRun = { part: number; sections: string[]; fields: string[]; run_file: string | null; rec: RunEnvelope };
/** The one record a draft in parts leaves for review (written beside the parts' own run records, which only the
 *  launcher writes): the merged answer, every part's needs-person entries (re-numbered to the merged answer), the
 *  entries set aside or left unanswered, usage summed (duration: the longest part, as they run side by side), and a
 *  label that says when no AI was used at all. Pure, so it is tested at US$0 with saved answers (review 6). */
export function assembleMerged(runs: PartRun[], reused: Reused[], meta: { runId: string; reusedFrom: string[]; inventoryFile: string; inventorySha: string; label: string; library: Map<string, { meaning: string; valueType: string }> }) {
  const merged = mergeParts(runs.map((r) => ({ part: r.part, answer: checkedOutput(r.rec), fields: r.fields })), reused);
  for (const f of new Set(reused.map((r) => r.fact).filter(Boolean) as string[])) {
    const d = meta.library.get(f);
    if (d && !merged.answer.canonical_fields.some((c) => c.id === f)) merged.answer.canonical_fields.push({ id: f, meaning: d.meaning, value_type: d.valueType });
  }
  const index = new Map(merged.answer.entries.map((e, i) => [e.data_path, i]));
  const needs = runs.flatMap((r) => (r.rec.conversion?.needs_person ?? []).filter((n) => r.fields.includes(n.data_path) && index.has(n.data_path)).map((n) => ({ ...n, entry: index.get(n.data_path)!, part: r.part })));
  const u = runs.map((r) => r.rec.drafting_run?.usage ?? {});
  const usage = { input_tokens: 0, output_tokens: 0, cost_usd: u.reduce((x, y) => x + (y.cost_usd ?? 0), 0), duration_ms: Math.max(0, ...u.map((y) => y.duration_ms ?? 0)) };
  for (const r of runs) { const x = r.rec.drafting_run?.usage as { input_tokens?: number; output_tokens?: number } | undefined; usage.input_tokens += x?.input_tokens ?? 0; usage.output_tokens += x?.output_tokens ?? 0; }
  const ai = runs.length > 0;
  return {
    label: ai ? meta.label : "Reused from earlier editions of the same form in the library; no AI was used", caller: ai ? "live" : "reuse", contract_valid: true, raw_output: JSON.stringify(merged.answer),
    conversion: { needs_person: needs },
    merged: { parts: runs.map((r) => ({ index: r.part, sections: r.sections, fields: r.fields.length, run_file: r.run_file })), reused: reused.length, reused_from: meta.reusedFrom, near_duplicates: merged.near_duplicates, set_aside: merged.set_aside, unanswered: merged.unanswered },
    drafting_run: { run_id: meta.runId, status: "completed", usage, settings: { ...(runs[0]?.rec.drafting_run?.settings ?? {}), prompt_version: ai ? "field-map-part.v1.md" : null }, inputs: { official_files: [{ file: meta.inventoryFile, sha256: meta.inventorySha }] }, ended_at: new Date().toISOString() },
  };
}

/** The proposals of a merged draft that are flagged near-duplicates of a name another part proposed: the reason says
 *  so and the evidence names the other one; nothing is merged (review 6: this was inline and untested). */
export function flagNearDuplicates<T extends { proposedKey: string; outcome: string; reason: string; evidence: object }>(items: T[], near: NearDuplicate[]): T[] {
  for (const n of near) for (const it of items.filter((x) => (x.proposedKey === n.b || x.proposedKey === n.a) && x.outcome !== "REUSE")) {
    const other = it.proposedKey === n.a ? n.b : n.a;
    it.reason = other === it.proposedKey ? `Proposed twice with different meanings or types by different parts of this form (${n.why}): decide the one meaning. ${it.reason}` : `Near-duplicate of ${other}, proposed by another part of this form (${n.why}): decide whether they are one field. ${it.reason}`;
    (it.evidence as Record<string, unknown>).near_duplicate_of = other;
  }
  return items;
}
