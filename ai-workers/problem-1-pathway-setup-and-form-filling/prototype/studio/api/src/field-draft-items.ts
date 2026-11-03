// C11.13 "Draft fields" (S6 plan slice 1b item 6, P-120, P-138; forms lane): the two readings of one form edition
// (field-drafts.ts draftEdition: a draft round and a blind checker round) turned into `field` proposals for the one
// review queue. Pure, no I/O and no decorators, so a check loads it directly (as form-row-action.ts).
//  - P-121: compareRounds per field id; the rules run on both readings; the readings agree on the value type or a
//    person decides; a field only one round named waits as Decide (no third round).
//  - P-120: each field is matched "reuse" or "new" against the library by the field comparison the field-map review
//    already uses (engine/normalize.ts); a near match never reads Ready and keeps its one-line reason.
//  - P-170: IRCC's words for the field are the box text the AI quoted; when that text is not on the form, it is Decide.
// Which boxes a form has and what they mean are Sample until the immigration expert confirms (AGENTS rule 4).
import { compareRounds, type RoundAnswer } from "../../engine/agreement.ts";
import { quoteOnForm, squashWords } from "../../engine/field-map-rounds.ts";
import { normalize, type Entry, type Item, type LibraryField, type ProposedField } from "../../engine/normalize.ts";
import { normalizeLabel } from "../../contracts/programs.ts";
import type { NewProposal, Work } from "./proposals.ts";
import type { FieldMapOutput } from "./field-drafts.ts";

export const DRAFT_FIELDS_STEP = "field_map_edition";
/** A field id the library can hold, as the step's prompt asks (p2/prompts/field-map.v2.md): an area and a name in lower
 *  case, at most 80 characters ("person.family_name"); the area at most 40 (the contract's subject holds 60). */
export const FIELD_ID = /^[a-z][a-z_]{0,39}\.[a-z][a-z0-9_]*$/;
export const FIELD_ID_MAX = 80;
/** A library field this close (engine/normalize.ts score) is a near match: the item is never Ready and says why. */
export const NEAR_SCORE = 0.35;

/** One reading as the queue keeps it (contracts/proposal-item.ts RoundReading), less the payload made per item. */
export type ReadingOf = { output: FieldMapOutput; from: "live" | "replay"; runFile: string; costUsd: number };
/** The form edition the readings are of: its printed edition, its official file and the words printed on it. */
export type EditionFacts = { printed: string; file: string; sha256: string; formText: string };

type One = { field: ProposedField; entries: FieldMapOutput["entries"] };

/** The rules every reading of a field passes, or the plain reason it fails (then that reading is never used). */
export function fieldRule(f: ProposedField): string | null {
  if (typeof f.id !== "string" || f.id.length > FIELD_ID_MAX || !FIELD_ID.test(f.id)) return `"${String(f.id ?? "").slice(0, 60)}" is not a field name the library can hold (an area and a name, such as person.family_name).`;
  if (typeof f.meaning !== "string" || f.meaning.trim().length < 3) return `${f.id} has no meaning in words.`;
  if (typeof f.value_type !== "string" || !f.value_type.trim() || f.value_type.length > 40) return `${f.id} has no value type.`;
  return null;
}

const areaWords = (id: string) => id.split(".")[0].replace(/_/g, " ");
/** "person.family_name" → "Family name"; an area other than the person or the case is named after it ("Family name (sponsor)").
 *  The label is what a person reads; the library key is the proposed id itself (proposals.ts field lander). */
export function labelOf(id: string): string {
  const [area, ...rest] = id.split(".");
  const w = rest.join(" ").replace(/_/g, " ").trim();
  const name = w ? w[0].toUpperCase() + w.slice(1) : id;
  return (["person", "case"].includes(area) ? name : `${name} (${areaWords(id)})`).slice(0, 120);
}
/** A name no other item of the batch has under the identity rule (normalizeLabel, so spaces and dots do not count):
 *  the plain name, then with its area, then numbered; always within the contract's 120 characters. Break M1. */
export function uniqueLabel(id: string, taken: Set<string>, base = labelOf(id)): string {
  const tries = [base, /\(/.test(base) ? null : `${base.slice(0, 100)} (${areaWords(id).slice(0, 16)})`].filter((x): x is string => !!x);
  for (const t of tries) if (!taken.has(normalizeLabel(t))) return t;
  for (let n = 2; ; n++) { const t = `${tries[tries.length - 1].slice(0, 112)} ${n}`; if (!taken.has(normalizeLabel(t))) return t; }
}

const answersOf = (o: FieldMapOutput | null): RoundAnswer<One>[] => (o?.canonical_fields ?? []).map((f) => ({ key: String(f.id), reading: String(f.value_type ?? "").trim().toLowerCase(), item: { field: f, entries: o!.entries.filter((e) => e.fact === f.id) } }));
const squash = squashWords;
/** The first words of the form a reading quoted for a field, and whether they are printed on the form (the one matcher,
 *  engine/field-map-rounds.ts quoteOnForm, shared with the field-map step: QA-191). */
const quoteIn = (o: FieldMapOutput, id: string, formText: string) => {
  const q = o.entries.filter((e) => e.fact === id).map((e) => String(e.evidence_quote ?? "").trim()).find(Boolean) ?? null;
  return { quote: q, found: quoteOnForm(q, formText) };
};

/** The two readings → field proposals (runId is the caller's), plus the readings dropped by the rules with their reason. */
export function fieldItems(draft: ReadingOf, check: ReadingOf | null, ed: EditionFacts, library: LibraryField[], redirects: Map<string, string> = new Map()): { items: (Omit<NewProposal, "runId"> & Work)[]; dropped: { key: string; why: string }[] } {
  const rule = (a: RoundAnswer<One>) => fieldRule(a.item.field);
  const cmp = compareRounds(answersOf(draft.output), answersOf(check?.output ?? null), rule);
  const chosen = [
    ...cmp.agreed.map((a) => ({ key: a.key, one: a.item, inDraft: true, inCheck: true, agreement: "agreed" as const, why: null as string | null })),
    ...cmp.decide.map((d) => ({ key: d.key, one: (d.draft ?? d.check)!, inDraft: !!d.draft, inCheck: !!d.check, agreement: d.draft && d.check ? "differ" as const : "one_round" as const, why: check ? d.why : "Only the draft round has a saved reading of this form edition: a person decides (the checker round has not been recorded)." })),
  ];
  const entries: Entry[] = chosen.flatMap((c) => c.one.entries);
  const compared = new Map<string, Item>(normalize(chosen.map((c) => c.one.field), entries, library, redirects).map((i) => [i.proposedKey, i]));
  const libKeys = new Set(library.map((l) => l.key));
  const formText = squash(ed.formText);
  const labels = new Set<string>();
  const items: (Omit<NewProposal, "runId"> & Work)[] = [];
  const readingOf = (r: ReadingOf | null, id: string) => {
    const f = r?.output.canonical_fields.find((x) => x.id === id);
    return f ? `${f.id} (${f.value_type}): ${f.meaning}`.slice(0, 300) : null;
  };
  for (const c of chosen) {
    const i = compared.get(c.key);
    if (!i) continue;
    const f = c.one.field;
    const reuses = !!i.recommendation.key && (i.recommendation.action === "reuse" || (i.recommendation.action === "decide" && libKeys.has(i.recommendation.key)));
    const lib = reuses ? library.find((l) => l.key === i.recommendation.key) : undefined;
    // One item per name in a batch (break M1): a second field under the same name gets its area, then a number.
    const label = uniqueLabel(f.id, labels);
    labels.add(normalizeLabel(label));
    const payload = { kind: "field" as const, label, aliases: [], meaning: f.meaning.trim().slice(0, 500), valueType: f.value_type.trim(), subject: f.id.split(".")[0], formBox: null };
    // P-170, both rounds: each reading that names the field must quote words printed on the form (review of #427).
    // Only the readings that passed the rules count (a reading compareRounds dropped never fails a good one; Devin #427).
    const inDraft = c.inDraft ? quoteIn(draft.output, f.id, formText) : null, inCheck = check && c.inCheck ? quoteIn(check.output, f.id, formText) : null;
    const quoted = [inDraft, inCheck].filter((x): x is { quote: string | null; found: boolean } => !!x);
    const found = quoted.length > 0 && quoted.every((x) => x.found);
    const bad = quoted.find((x) => !x.found);
    // The quote shown is the one the rule judged: a failing one when the rule fails, so "not found" is said of it (Devin #427).
    const quote = (found ? quoted[0]?.quote : bad?.quote ?? quoted.find((x) => x.quote)?.quote) ?? null;
    const near = i.candidates.filter((x) => x.score >= NEAR_SCORE && x.key !== lib?.key).map((x) => x.key).slice(0, 10);
    const rules = [
      { rule: "field_name_and_type", passed: true, why: null },
      { rule: "quote_on_the_form", passed: found, why: found ? null : bad?.quote ? `The words ${bad === inCheck ? "the checker round" : "the AI"} quoted ("${bad.quote.slice(0, 120)}") are not printed on this form edition.`.slice(0, 300) : "The AI quoted no words of the form for this field." },
    ];
    const plain = i.outcome === "REUSE" || (i.outcome === "NEW" && !near.length);
    const confidence = c.agreement === "agreed" && found && plain ? "ready" as const : c.agreement === "agreed" && found && i.outcome === "NEW" ? "check" as const : "decide" as const;
    const whyParts = { round: c.why, quote: found ? null : rules[1].why, match: plain ? null : i.reason };
    const reason = confidence === "ready" ? null : [whyParts.round, whyParts.quote, whyParts.match].filter(Boolean).join(" ").slice(0, 500) || null;
    const reading = (r: ReadingOf | null) => { const t = readingOf(r, f.id); return t && r ? { reading: t, payload, from: r.from, runFile: r.runFile.slice(0, 300), costUsd: r.costUsd } : null; };
    items.push({
      kind: "field", step: DRAFT_FIELDS_STEP, scope: { formEdition: ed.printed.slice(0, 60), combinationId: null }, landsOn: "library",
      reuse: lib ? { match: "reuse", existingKey: lib.key } : { match: "new", existingKey: null }, payload,
      source: quote ? { file: ed.file.slice(0, 300), sha256: ed.sha256, edition: ed.printed.slice(0, 60), page: null, quote: quote.slice(0, 1000), quoteFound: found, rule: null } : null,
      rounds: { draft: reading(draft), check: reading(check) }, rules, agreement: c.agreement, confidence, reason, origin: "ai",
      identity: { key: normalizeLabel(label), near, nearReason: near.length ? i.reason.slice(0, 300) : null }, relatesTo: null, revision: null, basis: "SAMPLE",
      work: { proposedKey: f.id, whyParts, outcome: i.outcome, matchedKey: i.matchedKey, candidates: i.candidates.slice(0, 5), boxes: i.boxes.slice(0, 50) },
    });
  }
  return { items, dropped: cmp.dropped };
}
