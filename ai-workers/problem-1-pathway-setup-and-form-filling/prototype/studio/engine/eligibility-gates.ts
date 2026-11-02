// C6.9 part 1 (M3-D, concept screens/C6.9/concept.md §3 BR-1…BR-6): eligibility gates as data on a combination's draft,
// frozen into its release as snapshot.eligibility. Pure: the checks a save runs (BR-2, BR-2a), what the snapshot
// carries (BR-1, BR-6), the release check (BR-5) and the change-summary lines (BR-4). Nothing about any program is
// written here; the runs that read the gates (the stand-in adapter, SI-1) come in part 2 (engine/runtime/eligibility.ts).
import { canonical } from "../../contracts/rules.ts";
import { checkCondition } from "./validate.ts";

export type Gate = { key: string; label: string; condition: Record<string, unknown> };
/** What the combination row stores (combination.eligibility). `disclaimer` null: the Sample default goes into the release. */
export type StoredEligibility = { gates: Gate[]; judgement: string[]; disclaimer: string | null; version: number; by: string; at: string };
/** What a release carries (snapshot.eligibility), frozen with it. */
export type SnapshotEligibility = { gates: Gate[]; judgement: string[]; disclaimer: string };
export type FieldError = { field: string; message: string };

/** BR-6 default, Sample (ASSUMPTIONS C8; Unconfirmed: no counsel). Q1 taken as recommended: the disclaimer lives on the
 *  release, set and reviewed with the gates (concept §9 Q1, the tech lead's approval on #391). */
export const DEFAULT_DISCLAIMER = "Indicative only. This check compares the answers on file with this application's rules as at the date shown. It is not a guarantee of approval: an IRCC officer decides, including on money, health, ties and leaving Canada.";
export const JUDGEMENT_MAX = 120, DISCLAIMER_MIN = 21, LABEL_MAX = 160, KEY_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/;
export const PER_PERSON = "Eligibility is checked per person";

/** BR-2, BR-2a: the gates, judgement lines and disclaimer a save may store, or the refusals on their fields. A condition
 *  with no root subjectKind is stored with PERSON and only then checked (contracts/rules.ts validatePredicate needs a
 *  root kind); another root kind is refused. `fieldTypes`/`derived` are the library's live fields and derived keys. */
export function checkGates(input: { gates: { key?: unknown; label?: unknown; condition?: unknown }[]; judgement: unknown[]; disclaimer?: unknown }, fieldTypes: Map<string, string>, derived: Set<string>): { gates: Gate[]; judgement: string[]; disclaimer: string | null; errors: FieldError[] } {
  const errors: FieldError[] = [];
  const seen = new Set<string>();
  const gates: Gate[] = input.gates.map((g, i) => {
    const key = typeof g.key === "string" ? g.key.trim() : "", label = typeof g.label === "string" ? g.label.trim() : "";
    if (!key) errors.push({ field: `gates.${i}.key`, message: "Give the gate a key, such as vv.travel_document." });
    else if (!KEY_PATTERN.test(key) || key.length > 80) errors.push({ field: `gates.${i}.key`, message: `"${key}" is not a gate key: lower-case words joined by dots or underscores, at most 80 characters.` });
    else if (seen.has(key)) errors.push({ field: `gates.${i}.key`, message: `Two gates share the key ${key}: give each gate its own.` });
    seen.add(key);
    if (!label) errors.push({ field: `gates.${i}.label`, message: "Give the gate a label: what a person reads beside its result." });
    else if (label.length > LABEL_MAX) errors.push({ field: `gates.${i}.label`, message: `Keep the label to ${LABEL_MAX} characters.` });
    const raw = g.condition;
    if (raw == null || typeof raw !== "object" || Array.isArray(raw) || !Object.keys(raw).length) {
      errors.push({ field: `gates.${i}.condition`, message: "A gate needs a rule the answers on file can settle. Anything only an officer can weigh goes under Officer's judgement." });
      return { key, label, condition: {} };
    }
    const given = raw as Record<string, unknown>;
    if (given.subjectKind !== undefined && given.subjectKind !== "PERSON") {
      errors.push({ field: `gates.${i}.condition`, message: `${PER_PERSON}: this rule is about ${String(given.subjectKind).toLowerCase()}, not each person.` });
      return { key, label, condition: given };
    }
    const condition = { ...given, subjectKind: "PERSON" }; // BR-2a
    for (const e of checkCondition(condition, fieldTypes, derived)) errors.push({ field: `gates.${i}.condition`, message: `The rule ${e}.` });
    return { key, label, condition };
  });
  const judgement = input.judgement.map((l, i) => {
    const line = typeof l === "string" ? l.trim() : "";
    if (!line) errors.push({ field: `judgement.${i}`, message: "An officer's judgement line cannot be empty." });
    else if (line.length > JUDGEMENT_MAX) errors.push({ field: `judgement.${i}`, message: `Keep each officer's judgement line to ${JUDGEMENT_MAX} characters.` });
    return line;
  });
  let disclaimer: string | null = null;
  if (input.disclaimer != null) {
    disclaimer = typeof input.disclaimer === "string" ? input.disclaimer.trim() : "";
    if (disclaimer.length < DISCLAIMER_MIN) errors.push({ field: "disclaimer", message: `A disclaimer needs more than ${DISCLAIMER_MIN - 1} characters; leave it out to use the default.` });
    // A release carries a disclaimer only with gates or judgement lines (snapshotEligibility), so one alone is refused
    // here rather than stored and then dropped without a word (review minor 5).
    else if (!gates.length && !judgement.length) errors.push({ field: "disclaimer", message: "A disclaimer goes with eligibility gates: add a gate or an officer's judgement line, or leave the disclaimer out." });
  }
  return { gates, judgement, disclaimer, errors };
}

/** BR-1, BR-6: what a release carries, or nothing when no gate and no judgement line is set (so a combination without
 *  them keeps its snapshot and fingerprint). The disclaimer is the one saved, or the Sample default. */
export function snapshotEligibility(stored: unknown): SnapshotEligibility | undefined {
  const e = stored as Partial<StoredEligibility> | null | undefined;
  if (!e || (!(e.gates ?? []).length && !(e.judgement ?? []).length)) return undefined;
  return { gates: (e.gates ?? []).map((g) => ({ key: g.key, label: g.label, condition: g.condition })), judgement: [...(e.judgement ?? [])], disclaimer: e.disclaimer ?? DEFAULT_DISCLAIMER };
}

/** The facts a set of gates reads, in gate order, once each. */
export function gateFacts(e: Pick<SnapshotEligibility, "gates"> | undefined): string[] {
  return [...new Set((e?.gates ?? []).flatMap((g) => [...JSON.stringify(g.condition).matchAll(/"field":"([^"]+)"/g)].map((m) => m[1])))];
}

/** BR-5 (and BR-2 again at release, since the library may have changed): a gate's rule is still valid, and every fact
 *  it reads is one a case of this application actually asks, i.e. placed and read by a form box or a rule (P-62).
 *  `words` names a fact by its meaning. */
export function gateProblems(e: SnapshotEligibility | undefined, placed: Set<string>, read: Set<string>, fieldTypes: Map<string, string>, derived: Set<string>, words: (fact: string) => string) {
  const out: { level: "error"; where: "Eligibility"; item: string; message: string }[] = [];
  for (const g of e?.gates ?? []) {
    for (const x of checkCondition(g.condition, fieldTypes, derived)) out.push({ level: "error", where: "Eligibility", item: g.key, message: `"${g.label}": the rule ${x}.` });
    for (const f of gateFacts({ gates: [g] })) {
      // Only a plain asked fact can settle a gate: a derived (worked-out) value is never asked of anyone, so it is refused
      // too (review Major on 5120b6f2; allowing derived gates whose inputs are asked would be a later, separate choice).
      if (derived.has(f) && !fieldTypes.has(f)) out.push({ level: "error", where: "Eligibility", item: g.key, message: `This gate reads ${words(f)}, a value worked out from other answers, not one a case is asked ("${g.label}"). A gate reads only answers to this application's questions: use the question it is worked out from, or change the gate.` });
      else if (fieldTypes.has(f) && !(placed.has(f) && read.has(f))) out.push({ level: "error", where: "Eligibility", item: g.key, message: `This gate reads ${words(f)}, which no case of this application is asked ("${g.label}"). Ask it in this application's questionnaire for a form box or rule that reads it, or change the gate.` });
      // A fact in neither list is already named by checkCondition above ("not in the library").
    }
  }
  return out;
}

/** BR-4: one change-summary line per gate added, changed or removed, plus one for the officer's judgement and one for
 *  the disclaimer; kind "Eligibility", each needing the immigration expert's sign-off. */
export function eligibilityChanges(prev: SnapshotEligibility | undefined, next: SnapshotEligibility | undefined) {
  const out: { kind: "Eligibility"; key: string; change: "added" | "changed" | "removed"; needs_sme: true; label: string }[] = [];
  const line = (key: string, change: "added" | "changed" | "removed", label: string) => out.push({ kind: "Eligibility", key, change, needs_sme: true, label });
  const a = new Map((prev?.gates ?? []).map((g) => [g.key, g])), b = new Map((next?.gates ?? []).map((g) => [g.key, g]));
  for (const [k, g] of b) {
    const was = a.get(k);
    if (!was) { line(k, "added", `Gate: ${g.label}`); continue; }
    if (canonical(was as never) === canonical(g as never)) continue;
    // Review minor 7: the SME sees what was there before (the old label) and whether the rule itself changed.
    const rule = canonical(was.condition as never) !== canonical(g.condition as never);
    line(k, "changed", `Gate: ${was.label === g.label ? g.label : `${was.label} → ${g.label}`}${rule ? " (rule changed)" : ""}`);
  }
  for (const [k, g] of a) if (!b.has(k)) line(k, "removed", `Gate: ${g.label}`);
  const ja = prev?.judgement ?? [], jb = next?.judgement ?? [];
  if (canonical(ja) !== canonical(jb)) line("officers_judgement", !ja.length ? "added" : !jb.length ? "removed" : "changed", jb.length ? `Officer's judgement, not checked by rules: ${jb.join("; ")}` : "Officer's judgement: no lines");
  const da = prev?.disclaimer ?? null, db = next?.disclaimer ?? null;
  if (da !== db) line("disclaimer", da === null ? "added" : db === null ? "removed" : "changed", db ? `Disclaimer: ${db}` : "Disclaimer: none");
  return out;
}
