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
import { normalize, type Entry, type Item, type LibraryField, type ProposedField } from "../../engine/normalize.ts";
import { normalizeLabel } from "../../contracts/programs.ts";
import type { NewProposal, Work } from "./proposals.ts";
import type { FieldMapOutput } from "./field-drafts.ts";

export const DRAFT_FIELDS_STEP = "field_map_edition";
/** A field id the library can hold: an area and a name in lower case ("person.family_name"). */
const FIELD_ID = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/;

/** One reading as the queue keeps it (contracts/proposal-item.ts RoundReading), less the payload made per item. */
export type ReadingOf = { output: FieldMapOutput; from: "live" | "replay"; runFile: string; costUsd: number };
/** The form edition the readings are of: its printed edition, its official file and the words printed on it. */
export type EditionFacts = { printed: string; file: string; sha256: string; formText: string };

type One = { field: ProposedField; entries: FieldMapOutput["entries"] };

/** The rules every reading of a field passes, or the plain reason it fails (then that reading is never used). */
export function fieldRule(f: ProposedField): string | null {
  if (!FIELD_ID.test(f.id ?? "")) return `"${String(f.id ?? "").slice(0, 60)}" is not a field name the library can hold (an area and a name, such as person.family_name).`;
  if (typeof f.meaning !== "string" || f.meaning.trim().length < 3) return `${f.id} has no meaning in words.`;
  if (typeof f.value_type !== "string" || !f.value_type.trim() || f.value_type.length > 40) return `${f.id} has no value type.`;
  return null;
}

/** "person.family_name" → "Family name"; an area other than the person or the case is named after it ("Family name (sponsor)"). */
export function labelOf(id: string): string {
  const [area, ...rest] = id.split(".");
  const w = rest.join(" ").replace(/_/g, " ").trim();
  const name = w ? w[0].toUpperCase() + w.slice(1) : id;
  return (["person", "case"].includes(area) ? name : `${name} (${area.replace(/_/g, " ")})`).slice(0, 120);
}

const answersOf = (o: FieldMapOutput | null): RoundAnswer<One>[] => (o?.canonical_fields ?? []).map((f) => ({ key: String(f.id), reading: String(f.value_type ?? "").trim().toLowerCase(), item: { field: f, entries: o!.entries.filter((e) => e.fact === f.id) } }));
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** The two readings → field proposals (runId is the caller's), plus the readings dropped by the rules with their reason. */
export function fieldItems(draft: ReadingOf, check: ReadingOf | null, ed: EditionFacts, library: LibraryField[], redirects: Map<string, string> = new Map()): { items: (Omit<NewProposal, "runId"> & Work)[]; dropped: { key: string; why: string }[] } {
  const rule = (a: RoundAnswer<One>) => fieldRule(a.item.field);
  const cmp = compareRounds(answersOf(draft.output), answersOf(check?.output ?? null), rule);
  const chosen = [
    ...cmp.agreed.map((a) => ({ key: a.key, one: a.item, agreement: "agreed" as const, why: null as string | null })),
    ...cmp.decide.map((d) => ({ key: d.key, one: (d.draft ?? d.check)!, agreement: d.draft && d.check ? "differ" as const : "one_round" as const, why: check ? d.why : "Only the draft round has a saved reading of this form edition: a person decides (the checker round has not been recorded)." })),
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
    // One item per name in a batch: a second field under the same name keeps its own id in its name.
    let label = labelOf(f.id);
    if (labels.has(normalizeLabel(label))) label = `${label} · ${f.id}`.slice(0, 120);
    labels.add(normalizeLabel(label));
    const payload = { kind: "field" as const, label, aliases: [], meaning: f.meaning.trim().slice(0, 500), valueType: f.value_type.trim(), subject: f.id.split(".")[0], formBox: null };
    const quote = c.one.entries.map((e) => String(e.evidence_quote ?? "").trim()).find(Boolean) ?? null;
    const found = !!quote && squash(quote).length > 0 && formText.includes(squash(quote));
    const near = i.candidates.filter((x) => x.score >= 0.55 && x.key !== lib?.key).map((x) => x.key).slice(0, 10);
    const rules = [
      { rule: "field_name_and_type", passed: true, why: null },
      { rule: "quote_on_the_form", passed: found, why: found ? null : quote ? "The words the AI quoted are not printed on this form edition." : "The AI quoted no words of the form for this field." },
    ];
    const plain = (i.outcome === "REUSE" || (i.outcome === "NEW" && !near.length));
    const confidence = c.agreement === "agreed" && found && plain ? "ready" as const : c.agreement === "agreed" && found && i.outcome === "NEW" ? "check" as const : "decide" as const;
    const reason = confidence === "ready" ? null : [c.why, found ? null : rules[1].why, i.outcome === "NEW" && !near.length ? null : i.reason].filter(Boolean).join(" ").slice(0, 500) || null;
    const reading = (r: ReadingOf | null) => { const t = readingOf(r, f.id); return t && r ? { reading: t, payload, from: r.from, runFile: r.runFile.slice(0, 300), costUsd: r.costUsd } : null; };
    items.push({
      kind: "field", step: DRAFT_FIELDS_STEP, scope: { formEdition: ed.printed.slice(0, 60), combinationId: null }, landsOn: "library",
      reuse: lib ? { match: "reuse", existingKey: lib.key } : { match: "new", existingKey: null }, payload,
      source: quote ? { file: ed.file.slice(0, 300), sha256: ed.sha256, edition: ed.printed.slice(0, 60), page: null, quote: quote.slice(0, 1000), quoteFound: found, rule: null } : null,
      rounds: { draft: reading(draft), check: reading(check) }, rules, agreement: c.agreement, confidence, reason, origin: "ai",
      identity: { key: normalizeLabel(label), near, nearReason: near.length ? i.reason.slice(0, 300) : null }, relatesTo: null, revision: null, basis: "SAMPLE",
      work: { proposedKey: f.id, outcome: i.outcome, matchedKey: i.matchedKey, candidates: i.candidates.slice(0, 5), boxes: i.boxes.slice(0, 50) },
    });
  }
  return { items, dropped: cmp.dropped };
}
