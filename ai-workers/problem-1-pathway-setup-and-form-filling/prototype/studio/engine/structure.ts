// W1-03/04 pure rules (no database): the free "did you mean" check (BR-5), the four setup steps a card shows
// (addendum A3) and the "Filed:" words (addendum A4). Tested in tests/check_w1_structure.ts.
import { normalizeLabel, type MissingItem, type NextAction } from "../contracts/programs.ts";
import { SETUP_STEPS, type SetupProgress } from "../contracts/structure.ts";

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

/** The four setup steps (addendum A3, Lead 26 Oct), from data the app already keeps; the chip shows the release, the
 *  steps show the draft. Forms: at least one form line. Draft: every form's boxes are mapped (by AI, from the library or
 *  by hand) and no attached form waits to be set up. Review: the current draft passed review and no AI proposal waits.
 *  Release: released, nothing changed since, and firms can open cases on it (Live). */
export function setupProgress(s: { forms: number; allDrafted: boolean; reviewed: boolean; aiProposals: number; live: boolean; changes: number }): SetupProgress {
  const forms = s.forms > 0, draft = forms && s.allDrafted, review = draft && s.aiProposals === 0 && s.reviewed, release = review && s.live && s.changes === 0;
  const done = [forms, draft, review, release];
  const first = done.indexOf(false);
  const step = first === -1 ? 4 : first + 1;
  return { step, of: 4, done, live: release, label: release ? "Live: all four steps done" : `Step ${step} of 4: ${SETUP_STEPS[step - 1]}` };
}

/** "Filed:" on a card (addendum A4, BR-14): PDF when every filed form goes as a PDF; a portal-only (Online) form gets
 *  an answer sheet, which is not built yet (W4 owns it), so the words say "later wave". */
export function filedOf(lines: { form_kind?: string | null; channel?: string | null }[]): string {
  const filed = lines.filter((l) => (l.form_kind ?? "data_form") === "data_form");
  if (!filed.length) return lines.length ? "Checklists only" : "No forms yet";
  const online = filed.filter((l) => l.channel === "ONLINE").length;
  return !online ? "PDF" : online === filed.length ? "Answer sheet (later wave)" : "PDF + answer sheet (later wave)";
}

/** Review m1 (Lead, 27 Oct: the next step wins): the bar shows the stage the next-step button belongs to, so the two
 *  never disagree ("Step 4 of 4 · Release" beside "See 1 missing" read as nearly done). Forms: start, add sources, add
 *  from the library, a new edition. Draft: draft with AI, AI at work, AI proposals to review, and what is missing in
 *  questions, filing or rules. Release: waiting to be released. No next step keeps the calculated bar (Live, or waiting
 *  on someone else). */
const STAGE_OF: Partial<Record<NextAction["kind"], number>> = { start: 1, add_forms: 1, add_from_library: 1, see_new_edition: 1, draft_ai: 2, view_progress: 2, review_proposals: 2, release: 4 };
const MISSING_STAGE: Record<MissingItem["code"], number> = { not_started: 1, no_forms: 1, form_without_edition: 1, filing_problem: 2, role_without_questions: 2, rule_problem: 2 };
export function progressFollows(p: SetupProgress, next: NextAction | null, missing: { code: MissingItem["code"] }[]): SetupProgress {
  const stage = !next ? null : next.kind === "see_missing" ? (missing.length ? Math.min(...missing.map((m) => MISSING_STAGE[m.code] ?? 2)) : null) : STAGE_OF[next.kind] ?? null;
  if (!stage) return p;
  return { step: stage, of: 4, done: [0, 1, 2, 3].map((i) => i < stage - 1), live: false, label: `Step ${stage} of 4: ${SETUP_STEPS[stage - 1]}` };
}
