// C9.5 Adopt a published update on an open case (B145; concept screens/B145/concept.md, challenge.md B1, M3-M6): pure
// rules, no database, no route. What a newer release of a case's own combination would change for that case, per
// person and filing, and what it would do to the work already done, before anyone moves the case (SA-1B-254 rule 2:
// "computed without writing"). The API (api/src/release-update.ts) gathers the inputs from the case and the two
// releases; the prepare view (api/src/case-prepare.ts) and readiness (api/src/readiness-inputs.ts) read the same rules
// after a move, so a copy made on an earlier release is out of date because of the release, never because of a fact.
//   BR-3  the difference of two snapshots: forms added, removed, filed another way (channel or signing), on a new map
//         or edition; document lines added or removed; questions added or removed; an answer's type changed; eligibility.
//   BR-4  each piece of work in one group: to fill again · filed another way now · no longer required · approval
//         withdrawn · stays as it is, marked out of date · no change (SA-1B-254 rules 5, 6; P-65).
//   BR-6  a review counts after a move only if it was made after the move, or the move touched nothing on its filing.
//   BR-7  refused, nothing changed, with the reason named: a recorded filing, a fill job waiting, an answer that no
//         longer fits its field's type (SA-1B-254 rule 7).
//   BR-8  only filings the difference touches carry a "newer release" warning (SA-1B-253 rule 11).
import { CHANNEL_WORDS, SIGNATURE_WORDS, type Channel, type Signature } from "../../contracts/forms.ts";
import { lineOf } from "../channels.ts";
import { pdfMapInUse } from "../programs.ts";

/** The parts of a released snapshot (engine/snapshot.ts) these rules read. */
export type FormLineIn = { form_number: string; title?: string | null; channel?: string | null; signature?: string | null; signed_by?: string | null; who?: string | null; min_age?: number | null; condition?: unknown; status?: string | null };
type MapIn = { form_number: string; form_edition?: string | null; channel?: string | null; entries?: unknown[] };
export type SnapshotIn = { forms: FormLineIn[]; field_maps?: MapIn[]; document_requirements?: { lineage?: string; document_type_key?: string; document_type?: string; who?: string; condition?: unknown }[];
  canonical_fields?: { id: string; meaning?: string; value_type?: string }[]; eligibility?: { gates?: { key: string; label: string; condition?: unknown }[]; judgement?: string[] } | null };

/** What changed for one form line between two releases (never about a person: see `whatChanges`). */
export type FormKind = "added" | "removed" | "channel" | "signing" | "map" | "edition" | "rule";
export type FormDiff = { form: string; title: string; kinds: FormKind[]; before: string; after: string };
export type ReleaseDiff = { forms: Map<string, FormDiff>; types: Map<string, { label: string; before: string; after: string }>;
  eligibility: { key: string; label: string; kind: "added" | "removed" | "changed" }[]; documents: { added: Set<string>; removed: Set<string> } };

/** Bookkeeping that changes when a release publishes an item without changing what it does (as engine/snapshot.ts). */
const strip = (x: unknown): unknown => Array.isArray(x) ? x.map(strip) : x && typeof x === "object"
  ? Object.fromEntries(Object.entries(x as Record<string, unknown>).filter(([k]) => k !== "item_version" && k !== "status" && k !== "origin").map(([k, v]) => [k, strip(v)])) : x;
const same = (a: unknown, b: unknown) => JSON.stringify(strip(a)) === JSON.stringify(strip(b));
const entriesKey = (m: MapIn | undefined) => JSON.stringify(((m?.entries ?? []) as { data_path?: string }[]).map(strip).sort((x, y) => String((x as { data_path?: string }).data_path).localeCompare(String((y as { data_path?: string }).data_path))));
const way = (l: FormLineIn) => { const { channel, signature } = lineOf(l); return { channel, signature }; };
export const wayWords = (channel: Channel, signature: Signature) => `${CHANNEL_WORDS[channel] ?? channel}${signature === "NONE" ? "" : `, ${SIGNATURE_WORDS[signature]?.toLowerCase() ?? signature}`}`;

/** BR-3: the difference of two released snapshots of one combination, per form line, field type, eligibility gate and
 *  document line. Pure; the same two snapshots always give the same answer. */
export function releaseDiff(from: SnapshotIn, to: SnapshotIn): ReleaseDiff {
  const forms = new Map<string, FormDiff>();
  const a = new Map(from.forms.map((f) => [f.form_number, f])), b = new Map(to.forms.map((f) => [f.form_number, f]));
  const mapsA = from.field_maps ?? [], mapsB = to.field_maps ?? [];
  for (const [form, l] of b) if (!a.has(form)) forms.set(form, { form, title: l.title ?? form, kinds: ["added"], before: "Not on this release", after: wayWords(way(l).channel, way(l).signature) });
  for (const [form, l] of a) {
    const n = b.get(form);
    if (!n) { forms.set(form, { form, title: l.title ?? form, kinds: ["removed"], before: wayWords(way(l).channel, way(l).signature), after: "No longer on the release" }); continue; }
    const kinds: FormKind[] = [], wa = way(l), wb = way(n);
    if (wa.channel !== wb.channel) kinds.push("channel");
    if (wa.signature !== wb.signature || (l.signed_by ?? null) !== (n.signed_by ?? null)) kinds.push("signing");
    const ea = pdfMapInUse(mapsA, form), eb = pdfMapInUse(mapsB, form);
    if ((ea?.form_edition ?? null) !== (eb?.form_edition ?? null)) kinds.push("edition");
    else if (entriesKey(ea) !== entriesKey(eb)) kinds.push("map");
    if ((l.who ?? null) !== (n.who ?? null) || (l.min_age ?? null) !== (n.min_age ?? null) || !same(l.condition ?? null, n.condition ?? null)) kinds.push("rule");
    if (!kinds.length) continue;
    const before = kinds.includes("edition") ? ea?.form_edition ?? "no edition" : wayWords(wa.channel, wa.signature);
    const after = kinds.includes("edition") ? eb?.form_edition ?? "no edition" : kinds.includes("map") && !kinds.includes("channel") && !kinds.includes("signing") ? "its form fields are filled differently" : wayWords(wb.channel, wb.signature);
    forms.set(form, { form, title: n.title ?? form, kinds, before, after });
  }
  const types = new Map<string, { label: string; before: string; after: string }>();
  const fa = new Map((from.canonical_fields ?? []).map((f) => [f.id, f]));
  for (const f of to.canonical_fields ?? []) { const o = fa.get(f.id); if (o && (o.value_type ?? "") !== (f.value_type ?? "")) types.set(f.id, { label: f.meaning || f.id, before: o.value_type ?? "", after: f.value_type ?? "" }); }
  const ga = new Map((from.eligibility?.gates ?? []).map((g) => [g.key, g])), gb = new Map((to.eligibility?.gates ?? []).map((g) => [g.key, g]));
  const eligibility = [...[...gb.values()].filter((g) => !ga.has(g.key)).map((g) => ({ key: g.key, label: g.label, kind: "added" as const })),
    ...[...ga.values()].filter((g) => !gb.has(g.key)).map((g) => ({ key: g.key, label: g.label, kind: "removed" as const })),
    ...[...gb.values()].filter((g) => ga.has(g.key) && !same(ga.get(g.key), g)).map((g) => ({ key: g.key, label: g.label, kind: "changed" as const }))];
  const docKey = (d: { lineage?: string; document_type_key?: string; who?: string }) => d.lineage ?? `${d.document_type_key}:${d.who}`;
  const da = new Map((from.document_requirements ?? []).map((d) => [docKey(d), d])), db = new Map((to.document_requirements ?? []).map((d) => [docKey(d), d]));
  const typesA = new Set([...da.values()].map((d) => d.document_type_key ?? "")), typesB = new Set([...db.values()].map((d) => d.document_type_key ?? ""));
  return { forms, types, eligibility, documents: { added: new Set([...typesB].filter((t) => t && !typesA.has(t))), removed: new Set([...typesA].filter((t) => t && !typesB.has(t))) } };
}

/** The case as both releases resolve it: per person, the forms that apply (or may), the document lines and the questions. */
export type Person = { id: string; label: string };
export type CaseSide = { forms: Map<string, Set<string>>; documents: Map<string, Map<string, string>>; questions: Map<string, Map<string, string>> };
export type CaseInputs = { people: Person[]; from: CaseSide; to: CaseSide;
  /** The case's current answers, per person and fact (for the type check). */
  answered: { subject: string; fact: string }[] };
export type ChangeLine = { what: string; kind: string; who: string[]; before: string; after: string };
export type Changes = { forms: ChangeLine[]; documents: ChangeLine[]; questions: ChangeLine[]; eligibility: ChangeLine[] };

const KIND_WORDS: Record<FormKind, string> = { added: "New", removed: "Removed", channel: "Filed another way", signing: "Signed another way", map: "Filled differently", edition: "New edition", rule: "Who needs it changed" };
const names = (people: Person[], ids: Iterable<string>) => [...new Set(ids)].map((id) => people.find((p) => p.id === id)?.label ?? "Someone on the case");
const holders = (side: CaseSide, form: string) => [...side.forms].filter(([, fs]) => fs.has(form)).map(([p]) => p);

/** BR-3: the lines of "What changes for this case", each naming the people it touches and old against new. A form or
 *  document line that applies to nobody on the case is left out (it changes nothing for this client). */
export function whatChanges(diff: ReleaseDiff, x: CaseInputs): Changes {
  const forms: ChangeLine[] = [];
  for (const d of [...diff.forms.values()].sort((p, q) => p.form.localeCompare(q.form))) {
    const who = [...new Set([...holders(x.from, d.form), ...holders(x.to, d.form)])];
    if (!who.length) continue;
    forms.push({ what: `${d.form} · ${d.title}`, kind: d.kinds.map((k) => KIND_WORDS[k]).join(", "), who: names(x.people, who), before: d.before, after: d.after });
  }
  const documents: ChangeLine[] = [], questions: ChangeLine[] = [];
  const docTypes = new Map<string, string>();
  for (const side of [x.from, x.to]) for (const m of side.documents.values()) for (const [k, l] of m) docTypes.set(k, l);
  for (const k of [...new Set([...diff.documents.added, ...diff.documents.removed, ...[...docTypes.keys()]])].sort()) {
    const had = x.people.filter((p) => x.from.documents.get(p.id)?.has(k)).map((p) => p.id), has = x.people.filter((p) => x.to.documents.get(p.id)?.has(k)).map((p) => p.id);
    const gone = had.filter((p) => !has.includes(p)), added = has.filter((p) => !had.includes(p));
    if (gone.length) documents.push({ what: docTypes.get(k) ?? k, kind: "No longer asked", who: names(x.people, gone), before: "Asked for", after: "Not asked" });
    if (added.length) documents.push({ what: docTypes.get(k) ?? k, kind: "New", who: names(x.people, added), before: "Not asked", after: "Asked for" });
  }
  const qLabel = new Map<string, string>();
  for (const side of [x.from, x.to]) for (const m of side.questions.values()) for (const [f, l] of m) qLabel.set(f, l);
  const newQ = new Map<string, string[]>(), goneQ = new Map<string, string[]>();
  for (const p of x.people) {
    const a = x.from.questions.get(p.id) ?? new Map(), b = x.to.questions.get(p.id) ?? new Map();
    for (const f of b.keys()) if (!a.has(f)) newQ.set(f, [...(newQ.get(f) ?? []), p.id]);
    for (const f of a.keys()) if (!b.has(f)) goneQ.set(f, [...(goneQ.get(f) ?? []), p.id]);
  }
  for (const [f, who] of newQ) questions.push({ what: qLabel.get(f) ?? f, kind: "New question", who: names(x.people, who), before: "Not asked", after: "Asked (it lands in Needs you)" });
  for (const [f, who] of goneQ) questions.push({ what: qLabel.get(f) ?? f, kind: "No longer asked", who: names(x.people, who), before: "Asked", after: "Not asked (the answer is kept, hidden)" });
  for (const [f, t] of diff.types) {
    const who = x.answered.filter((a) => a.fact === f).map((a) => a.subject);
    if (who.length) questions.push({ what: qLabel.get(f) ?? t.label, kind: "Answer type changed", who: names(x.people, who), before: t.before, after: t.after });
  }
  const eligibility = diff.eligibility.map((g) => ({ what: g.label, kind: g.kind === "added" ? "New rule" : g.kind === "removed" ? "Rule removed" : "Rule changed", who: [] as string[], before: g.kind === "added" ? "Not checked" : "Checked", after: g.kind === "removed" ? "Not checked" : "Checked as released" }));
  return { forms, documents, questions, eligibility };
}

/** One piece of work already done on the case. `finished`: validated and read back, signed and scanned, entered in the
 *  portal or locked (filed); otherwise a draft copy. */
export type Work = { id: string; kind: "copy" | "signed_scan" | "entered" | "upload"; form?: string; document?: string; label: string; subject: string; finished: boolean; release?: string };
export type Review = { filing: string; label: string; counts: boolean };
export type EffectLine = { id: string; what: string; who: string; why: string };
export type Effects = { fill_again: EffectLine[]; filed_another_way: EffectLine[]; no_longer_required: EffectLine[]; withdrawn: EffectLine[]; kept_out_of_date: EffectLine[]; unchanged: { count: number; words: string } };
export const EFFECT_KEYS = ["fill_again", "filed_another_way", "no_longer_required", "withdrawn", "kept_out_of_date"] as const;

/** BR-4: what a move would do to each piece of work, in exactly one group. A new form appears only under What changes. */
export function effectsOf(diff: ReleaseDiff, x: CaseInputs, work: Work[], reviews: Review[], touched: Map<string, string[]>, labels: { to: string }): Effects {
  const e: Effects = { fill_again: [], filed_another_way: [], no_longer_required: [], withdrawn: [], kept_out_of_date: [], unchanged: { count: 0, words: "" } };
  const person = (id: string) => x.people.find((p) => p.id === id)?.label ?? "Someone on the case";
  for (const w of work) {
    const line = (why: string): EffectLine => ({ id: w.id, what: w.label, who: person(w.subject), why });
    if (w.kind === "upload") {
      if (w.document && x.from.documents.get(w.subject)?.has(w.document) && !x.to.documents.get(w.subject)?.has(w.document)) e.no_longer_required.push(line(`${labels.to} no longer asks for it: the upload is kept and listed.`));
      else e.unchanged.count++;
      continue;
    }
    const d = w.form ? diff.forms.get(w.form) : undefined;
    const stillNeeded = !!w.form && (x.to.forms.get(w.subject)?.has(w.form) ?? false);
    if (w.form && (d?.kinds.includes("removed") || !stillNeeded)) { e.no_longer_required.push(line(`${labels.to} no longer asks ${person(w.subject)} for ${w.form}: it is kept and listed, never filed.`)); continue; }
    if (!d) { e.unchanged.count++; continue; }
    if (d.kinds.includes("channel") || d.kinds.includes("signing")) { e.filed_another_way.push(line(`${labels.to} files ${w.form} as ${d.after}${w.finished ? `; this ${w.kind === "signed_scan" ? "signed scan" : "copy"} is kept and is not what you file` : ""}.`)); continue; }
    if (d.kinds.includes("map") || d.kinds.includes("edition")) {
      if (w.finished) e.kept_out_of_date.push(line(`Never changed: marked out of date because ${labels.to} ${d.kinds.includes("edition") ? `files ${w.form} on ${d.after}` : `fills ${w.form}'s form fields differently`}.`));
      else e.fill_again.push(line(`Its form changed in ${labels.to}: press Fill after the move to make it on ${labels.to}; this copy stays in the history.`));
      continue;
    }
    e.unchanged.count++; // a change of who needs it, for a person who still needs it, leaves the work as it is
  }
  for (const r of reviews) {
    if (!r.counts) continue;
    const t = touched.get(r.filing) ?? [];
    if (t.length) e.withdrawn.push({ id: r.filing, what: `The representative's review of ${r.label}`, who: r.label, why: `${labels.to} changes what it files (${t.slice(0, 2).join("; ")}${t.length > 2 ? ` and ${t.length - 2} more` : ""}): the representative reviews it again.` });
    else e.unchanged.count++;
  }
  e.unchanged.words = `${e.unchanged.count} piece${e.unchanged.count === 1 ? "" : "s"} of work the release does not touch keep${e.unchanged.count === 1 ? "s its" : " their"} approval and passes.`;
  return e;
}

/** BR-6, BR-8: per filing, what the difference touches on it, in words ("Release 6 files IMM 5257 Online"). A filing is
 *  touched by a form of one of its people that is added, removed, filed or signed another way, on a new map or edition,
 *  a document line added or removed for them, or an answer of theirs whose type changed. Empty: untouched. */
export function touchedFilings(diff: ReleaseDiff, x: CaseInputs, filings: { id: string; people: string[] }[], labels: { to: string }): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const f of filings) {
    const words: string[] = [];
    for (const d of diff.forms.values()) {
      if (d.kinds.every((k) => k === "rule")) continue;
      const on = f.people.some((p) => x.from.forms.get(p)?.has(d.form) || x.to.forms.get(p)?.has(d.form));
      if (!on) continue;
      words.push(d.kinds.includes("added") ? `${labels.to} adds ${d.form}` : d.kinds.includes("removed") ? `${labels.to} no longer asks for ${d.form}`
        : d.kinds.includes("channel") || d.kinds.includes("signing") ? `${labels.to} files ${d.form} as ${d.after}` : d.kinds.includes("edition") ? `${labels.to} files ${d.form} on ${d.after}` : `${labels.to} fills ${d.form} differently`);
    }
    for (const p of f.people) {
      const a = x.from.documents.get(p) ?? new Map(), b = x.to.documents.get(p) ?? new Map();
      for (const [k, l] of a) if (!b.has(k)) words.push(`${labels.to} no longer asks for ${l}`);
      for (const [k, l] of b) if (!a.has(k)) words.push(`${labels.to} asks for ${l}`);
    }
    for (const [fact, t] of diff.types) if (x.answered.some((a) => a.fact === fact && f.people.includes(a.subject))) words.push(`${labels.to} expects "${t.label}" as ${t.after}`);
    out.set(f.id, [...new Set(words)]);
  }
  return out;
}

/** BR-6 (challenge M5, no schema): the representative's review still counts after a move only if its facts are the
 *  same and either it was made after the newest pin, the case never moved, or the move touched nothing on the filing. */
export function reviewCounts(x: { hashEqual: boolean; reviewedAt: Date; pinnedAt: Date; revision: number; touched: boolean }): boolean {
  return x.hashEqual && (x.revision <= 1 || x.reviewedAt.getTime() > x.pinnedAt.getTime() || !x.touched);
}

/** BR-7: why a move is refused, nothing changed (null: it may go ahead). Checked in this order, the first one named. */
export type Refusal = { code: "recorded" | "fill_running" | "type_mismatch"; reason: string; item?: string };
export function moveRefusal(x: { recorded: string[]; running: { form: string; person: string }[]; mismatches: { label: string; person: string; expects: string }[]; current: string }): Refusal | null {
  if (x.recorded.length) return { code: "recorded", reason: `Can't move: ${x.recorded[0]}'s filing is recorded as submitted; this case's filings stay on ${x.current}. Nothing was changed.`, item: x.recorded[0] };
  if (x.running.length) return { code: "fill_running", reason: `Can't move yet: a copy of ${x.running[0].form} for ${x.running[0].person} is being filled. Wait for it, then move. Nothing was changed.`, item: x.running[0].form };
  if (x.mismatches.length) { const m = x.mismatches[0]; return { code: "type_mismatch", reason: `Can't move yet: ${m.person}'s answer to "${m.label}" does not fit the new release (it expects ${m.expects}). Change the answer, then move. Nothing was changed.`, item: m.label }; }
  return null;
}

/** BR-6 (challenge M4): a copy made on an earlier release whose form the move touched is out of date because of the
 *  release: the words name both releases and what changed, with no fact lines (so no Undo). */
export function releaseOutOfDate(d: FormDiff | undefined, labels: { from: string; to: string }, what: string): string | null {
  if (!d || d.kinds.every((k) => k === "rule" || k === "added")) return null;
  const how = d.kinds.includes("removed") ? `${labels.to} no longer asks for ${d.form}` : d.kinds.includes("channel") || d.kinds.includes("signing") ? `${labels.to} files ${d.form} as ${d.after}`
    : d.kinds.includes("edition") ? `${labels.to} files ${d.form} on ${d.after}` : `${labels.to} fills ${d.form}'s form fields differently`;
  const next = d.kinds.includes("removed") ? "It is kept and listed, never filed." : d.kinds.includes("channel") || d.kinds.includes("signing") ? "It is kept, and it is not what you file now."
    : `Press Fill to make it on ${labels.to}.`;
  return `Out of date because of the release: this ${what} was made on ${labels.from}, and ${how}. Nothing in it was changed. ${next}`;
}

/** The value type of a field in words, for the refusal ("it expects a date"). */
export const typeWords = (t: string) => ({ date: "a date", number: "a number", yes_no: "Yes or No", text: "text", long_text: "text", code: "a choice from its list", country: "a country", address: "an address", phone: "a phone number", email: "an email address", person_name: "a name", multi_choice: "choices from its list", period_history: "dated periods", declaration: "a declaration" } as Record<string, string>)[t] ?? t.replace(/_/g, " ");

/** BR-1 (challenge M1): a case's pins, newest revision first, and whether the chain holds (revisions 1…n with no gap,
 *  each on a strictly higher release version: the database's insert trigger keeps it so; this is read-side). The case
 *  reads `current`, whatever order the rows came in. */
export function pinChain<P extends { revision: number; version: number }>(pins: readonly P[]): { current: P | null; ok: boolean; ordered: P[] } {
  const ordered = [...pins].sort((a, b) => b.revision - a.revision);
  const ok = ordered.length > 0 && ordered.every((p, i) => p.revision === ordered.length - i && (i === ordered.length - 1 || p.version > ordered[i + 1].version));
  return { current: ordered[0] ?? null, ok, ordered };
}

/** BR-2: the release a case may move to: the newest release of its own combination with a higher version (forward
 *  only, SA-1B-254 rule 8); null when the case is on the newest. */
export function targetOf<R extends { version: number }>(releases: readonly R[], current: number): R | null {
  return [...releases].filter((r) => r.version > current).sort((a, b) => b.version - a.version)[0] ?? null;
}
