// W1-03/04 pure rules (no database): the free "did you mean" check (BR-5), the "Filed:" words (addendum A4) and the
// full five-part trail (P-104, QA-150). The setup steps are the checklist's (engine/setup-checklist.ts). Tested in
// tests/check_w1_structure.ts and tests/check_c113_full_trail.ts.
import { normalizeLabel } from "../contracts/programs.ts";
import { PATHWAY_TYPE_LABEL, type PathwayType } from "../contracts/structure.ts";

/** Letters a name needs changed to become another (Levenshtein), stopping early past `max`. */
export function editDistance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); best = Math.min(best, cur[j]); }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

const wordsOf = (s: string) => s.normalize("NFKC").toLocaleLowerCase("en-CA").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const singular = (w: string) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);

/** Why `label` is close to `other`, or null (BR-5): the same words in another order, singular against plural, or at
 *  most two letters apart (one for names of five letters or fewer). An exact match (BR-4) is not "close": it is a twin. */
export function closeWhy(label: string, other: string): string | null {
  const a = normalizeLabel(label), b = normalizeLabel(other);
  if (!a || !b || a === b) return null;
  const wa = wordsOf(label), wb = wordsOf(other);
  if (wa.length > 1 && [...wa].sort().join(" ") === [...wb].sort().join(" ")) return "Same words in another order";
  if (wa.map(singular).join(" ") === wb.map(singular).join(" ")) return "Singular and plural of the same name";
  const d = editDistance(a, b, 2);
  if (d <= (Math.min(a.length, b.length) <= 5 ? 1 : 2)) return `${d} letter${d === 1 ? "" : "s"} apart`;
  return null;
}

export type NameCandidate = { key: string; label: string; parentKey: string | null; trail: string[] };
/** The free check (BR-4, BR-5) against the names of the same level in the same Pathway type: an exact twin under the
 *  same parent (refused) and close names anywhere at that level (warned, with why). The same name under another
 *  parent is shown as close too: it may be the same thing filed in the wrong place. */
export function checkName(label: string, parentKey: string | null, sameLevel: NameCandidate[], exceptKey?: string) {
  const want = normalizeLabel(label);
  const others = sameLevel.filter((n) => n.key !== exceptKey);
  const exact = others.find((n) => n.parentKey === parentKey && normalizeLabel(n.label) === want) ?? null;
  const close = others.filter((n) => n !== exact).map((n) => ({ n, why: normalizeLabel(n.label) === want ? "The same name under another parent" : closeWhy(label, n.label) }))
    .filter((x): x is { n: NameCandidate; why: string } => !!x.why).slice(0, 5).map((x) => ({ key: x.n.key, label: x.n.label, trail: x.n.trail, why: x.why }));
  return { exact: exact ? { key: exact.key, label: exact.label, trail: exact.trail } : null, close };
}

/** "Filed:" on a card (addendum A4, BR-14): PDF when every filed form goes as a PDF; a portal-only (Online) form gets
 *  an answer sheet, which is not built yet (W4 owns it), so the words say "later wave". */
export function filedOf(lines: { form_kind?: string | null; channel?: string | null }[]): string {
  const filed = lines.filter((l) => (l.form_kind ?? "data_form") === "data_form");
  if (!filed.length) return lines.length ? "Checklists only" : "No forms yet";
  const online = filed.filter((l) => l.channel === "ONLINE").length;
  return !online ? "PDF" : online === filed.length ? "Answer sheet (later wave)" : "PDF + answer sheet (later wave)";
}

/** P-104 (QA-150): a combination's place as the full five-part trail, Pathway type › Pathway › Program › Category ›
 *  Sub-category ("No sub-category" when the combination sits on a category), the same words as the Immigration
 *  programs cards (api/src/programs.ts). `chain` runs from the Pathway down to the combination's own name. */
export function fullTrail(chain: { label: string; nodeKind: string; clientType?: string | null }[]): string[] {
  const pw = chain.find((n) => n.nodeKind === "PATHWAY");
  const type = PATHWAY_TYPE_LABEL[(pw?.clientType ?? "INDIVIDUAL") as PathwayType] ?? PATHWAY_TYPE_LABEL.INDIVIDUAL;
  return [type, ...chain.map((n) => n.label), ...(chain.at(-1)?.nodeKind === "STREAM" ? [NO_SUB] : [])];
}
const NO_SUB = "No sub-category";
/** The one rule for a trail a person reads (review m4): the five parts joined with " › ", without the "No sub-category"
 *  placeholder, as the Immigration programs cards show it. Arrays (the catalogue's and the finder plan's `trail`) keep it. */
export function trailWords(parts: string[]): string {
  return parts.filter((p, i) => !(p === NO_SUB && i === parts.length - 1)).join(" › ");
}
/** The names the form finder gives the AI (QA-150): the plan's `ai_trail`; a plan stored before QA-150 has only `trail`,
 *  which then held exactly those names. Saved answers are matched on what the AI was given, so this never changes. */
export function aiNamesOf(combination: { trail: string[]; ai_trail?: string[] }): string[] {
  return combination.ai_trail ?? combination.trail;
}
