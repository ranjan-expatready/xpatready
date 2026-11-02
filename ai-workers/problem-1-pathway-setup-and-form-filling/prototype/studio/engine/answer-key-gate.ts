// G2 (C5.5; P-240; SA-01B v2.1 SA-1B-296 r3–r5, r8, SA-1B-63 E7/W7, SA-1B-181 r5, SA-1B-199; concept
// screens/G2-answer-key-gate/concept.md v2): the answer-key release gate. A form map or an eligibility rule set that a
// release publishes new or changed, or that already has a key, needs every key to pass on this draft and at least one
// key signed by the immigration expert; a real release refuses otherwise, naming each item. Only a Demo release in the
// demo workspace may carry Sample (unsigned or untested) items; a failing key refuses every release. Pure (P-249): the
// API passes the draft, the released snapshot, the keys with their run states and which form field lists exist.
import { itemFingerprint, type ItemKind } from "./answer-keys.ts";
import type { Snapshot } from "./snapshot.ts";
import type { Problem } from "./validate.ts";

export type GateKind = Exclude<ItemKind, "scoring">;
/** One testable item of the draft (BR-1): a PDF field map with entries, or the eligibility rules when they have gates. */
export type GateItem = { item_kind: GateKind; item_ref: string; label: string; edition: string | null; form: string | null; changed: boolean; testable: boolean };
/** One key as the gate reads it: its state, and its last run judged against this draft (engine/answer-keys.ts runState). */
export type GateKey = { key_id: string; item_kind: string; item_ref: string; family: string; state: string; version: number; signed_by: string | null; signed_at: string | null; change_reason: string | null;
  run: { state: "NOT_RUN" | "PASSED" | "FAILED"; why: string; passed: number; failed: number; first_failure: string | null; run_id: string | null } };
export type ItemResult = "passed" | "failed" | "not_run" | "unsigned" | "no_test" | "cannot_test" | "untested_released";
export type ItemVerdict = GateItem & { gated: boolean; result: ItemResult; keys: GateKey[] };
export type GateProblem = Problem & { label: string; forms: string[] };

type MapLine = { form_number: string; form_edition: string; channel?: string; entries: unknown[] };
const pdfMaps = (s: Snapshot) => (s.field_maps as MapLine[]).filter((m) => m.channel !== "ONLINE" && m.entries.length);

/** BR-1, BR-2: the draft's testable items, each marked new or changed against the released snapshot by its item
 *  fingerprint (a new edition is a new item, SA-1B-296 r5; with nothing released every item is new). Online maps
 *  (parked), scoring tables (none exist) and other items (E8) are not tested here (concept §6b). */
export function testableItems(s: Snapshot, released: Snapshot | null, hasFieldList: (form: string) => boolean): GateItem[] {
  const changed = (kind: GateKind, ref: string) => !released || itemFingerprint(s, kind, ref) !== itemFingerprint(released, kind, ref);
  return [
    ...pdfMaps(s).map((m) => ({ item_kind: "field_map" as const, item_ref: m.form_number, label: `${m.form_number} field map`, edition: m.form_edition, form: m.form_number, changed: changed("field_map", m.form_number), testable: hasFieldList(m.form_number) })),
    ...(s.eligibility?.gates?.length ? [{ item_kind: "rule_set" as const, item_ref: "eligibility", label: "Eligibility rules", edition: null, form: null, changed: changed("rule_set", "eligibility"), testable: true }] : []),
  ];
}

const keyWords = (k: GateKey) => `the answer-key test for "${k.family}"`;

/** BR-4, BR-5: each item's result and the problems a release reads. `demo` = a Demo release in the demo workspace
 *  (BR-3, decided by the caller from the snapshot, never from key states); `submitted` = the draft is submitted, so a
 *  key not run on it holds the release (challenge m3) instead of waiting for Submit to run it. */
export function answerKeyGate(items: GateItem[], keys: GateKey[], o: { demo: boolean; submitted: boolean }): { items: ItemVerdict[]; problems: GateProblem[] } {
  const problems: GateProblem[] = [];
  const sample = o.demo ? "warning" as const : "error" as const;
  const say = (level: "error" | "warning", it: GateItem, message: string) => problems.push({ level, where: "Tests", item: it.item_ref, label: it.label, forms: it.form ? [it.form] : [], message });
  const verdicts = items.map((it): ItemVerdict => {
    const mine = keys.filter((k) => k.item_kind === it.item_kind && k.item_ref === it.item_ref);
    const gated = it.changed || mine.length > 0;
    const v = (result: ItemResult): ItemVerdict => ({ ...it, gated, result, keys: mine });
    if (!gated) { say("warning", it, "released before the answer-key gate; untested."); return v("untested_released"); }
    if (!it.testable) { say(sample, it, "cannot be tested: its form field list is not recorded."); return v("cannot_test"); }
    if (!mine.length) { say(sample, it, o.demo ? "no answer-key test: allowed only in a Demo release." : "no answer-key test. Write a test family's expected values on Tests; the immigration expert signs them."); return v("no_test"); }
    const failed = mine.filter((k) => k.run.state === "FAILED"), notRun = mine.filter((k) => k.run.state === "NOT_RUN"), signed = mine.filter((k) => k.state === "SIGNED");
    // A failing key refuses every release, a Demo release too (Q3): a test has shown the item wrong.
    for (const k of failed) say("error", it, `${keyWords(k)} failed: ${k.run.failed} of ${k.run.passed + k.run.failed} values.${k.run.first_failure ? ` ${k.run.first_failure}` : ""}`);
    if (!signed.length) say(sample, it, o.demo ? `${keyWords(mine[0])} is Sample (not signed by the immigration expert): allowed only in a Demo release.` : `${mine.length === 1 ? `${keyWords(mine[0])} is` : "no answer-key test here is"} not signed. The immigration expert signs it on Tests; a real release needs a signed, passing test.`);
    for (const k of notRun) say(o.submitted ? "error" : "warning", it, o.submitted ? `${keyWords(k)} has not run on this draft (${k.run.why.replace(/\.$/, "").toLowerCase()}): run it on Tests.` : `${keyWords(k)} has not run on this draft; it runs at Submit.`);
    return v(failed.length ? "failed" : notRun.length ? "not_run" : !signed.length ? "unsigned" : "passed");
  });
  // W7 (SA-1B-63, row level): a combination with no key at all, when no item line says so already.
  if (!keys.length && !problems.length) problems.push({ level: "warning", where: "Tests", item: "", label: "", forms: [], message: "This combination has no answer-key test." });
  return { items: verdicts, problems };
}

/** BR-9: what the release rests on, frozen in its summary (never in the snapshot: fingerprints and diff() unchanged). */
export const evidenceOf = (verdicts: ItemVerdict[]) => verdicts.filter((v) => v.gated).flatMap((v) => (v.keys.length ? v.keys : [null]).map((k) => ({
  item_kind: v.item_kind, item_ref: v.item_ref, edition: v.edition, result: v.result,
  ...(k ? { key_id: k.key_id, family: k.family, key_version: k.version, state: k.state, signed_by: k.signed_by, signed_at: k.signed_at, run: k.run.state, passed: k.run.passed, failed: k.run.failed, run_id: k.run.run_id } : {}),
})));
export type Evidence = ReturnType<typeof evidenceOf>[number];
