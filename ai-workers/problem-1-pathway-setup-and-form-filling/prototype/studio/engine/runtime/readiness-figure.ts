// C7.10 readiness figure per filing (runtime lane, row B143; founder P-406 (2): ours, beside C7.6 so C7.6's finish line
// does not move; team requirement AG-07 v3.12 AG-7-27 and BR-30). Pure rules, no database, no route. It reads C7.6's
// result (engine/runtime/readiness.ts `filingReadiness`) and its input, and changes neither: the figure is a summary of
// the same lines, never a second judgement.
//
// BR-30, mapped onto what the reference app holds (concept `product/screens/B143/concept.md` §3):
//   State   Not ready while a block or an open CRITICAL warning stands; Attention while only plain warnings are open;
//           Ready when nothing is open (exactly C7.6's `ready`). A line passed with a reason is not open (WAIVED).
//   Items   each form item on the filing (a "Not needed" line is left out of both sides); each required document; the
//           facts the forms read (BR-30's questionnaire); the representative's review; each other line on the filing,
//           standing or passed (an open check with no form to read it, a review finding, a release notice, a fee line).
//   Done    an item is done when no open block or warning is on it; a passed line counts as done (BR-30 rule 5).
//   Figure  done ÷ countable × 100, rounded down (BR-30 rule 2): 100 only when nothing is open, so the figure and the
//           Ready to file button never disagree.
//   Case    the lowest state (Not ready < Attention < Ready) and the lowest figure, each naming its filing (BR-30 rule 6).
//   Never gates an action (BR-19). No combination key, form number or program name here (P-319, P-425).
import type { FilingInput, FilingReadiness, Line, WarnCode, BlockCode } from "./readiness.ts";

export type FigureState = "not_ready" | "attention" | "ready";
export type FigureItem = { kind: "form" | "document" | "facts" | "review" | "check"; key: string; label: string; done: boolean; passed: boolean };
export type Figure = { filing: string; state: FigureState; score: number; done: number; countable: number; passed: number; items: FigureItem[]; rule: string };
export type CaseFigure = { state: FigureState; state_filing: string; score: number; score_filing: string };

/** The rule in words, shown under the figure (BR-7). It names what is not counted here (the team's retainer and library). */
export const FIGURE_RULE = "Counted: each form on this filing, each required document, the facts the forms read (answered and confirmed), "
  + "the representative's review, and each other check, finding, release notice or fee line on the filing. Each counts the same. "
  + "A line passed with a reason counts as done. The figure is the share done, rounded down, so it is 100 only when nothing stands "
  + "before Ready to file. Not ready: a block or a CRITICAL warning is open. Attention: only warnings are open. Ready: nothing is open. "
  + "The retainer and the firm's own deficiency checks are counted by the case team's system, not here (AG-7-27, BR-30).";

const STATE_ORDER: FigureState[] = ["not_ready", "attention", "ready"];
/** Lines about the facts a form reads: they hold the facts item as well as their form (BR-30 counts the questionnaire apart). */
const FACT_CODES = new Set<string>(["missing_facts", "fact_problem", "open_check"]);

/** The state, figure and counted items of one filing, from C7.6's input and result. */
export function readinessFigure(x: FilingInput, r: FilingReadiness): Figure {
  if (r.filing !== x.filing) throw new Error(`readiness of ${r.filing} given for filing ${x.filing}`);
  const items: FigureItem[] = [];
  const add = (kind: FigureItem["kind"], key: string, label: string) => { const it = { kind, key, label, done: true, passed: false }; items.push(it); return it; };
  // A form or document line with no item id carries `code|subject|form` at the start of its key (readiness.ts keyOf).
  const forms = x.forms.filter((f) => f.channel !== "NOT_NEEDED").map((f) => ({ f, it: add("form", `form|${f.item ?? `${f.subject}|${f.form}`}`, `${f.form} for ${f.person}`) }));
  const docs = (x.documents ?? []).filter((d) => d.required).map((d) => ({ d, it: add("document", `document|${d.item ?? `${d.subject}|${d.label}`}`, `${d.label} for ${d.person}`) }));
  const facts = forms.length ? add("facts", "facts", "The facts the forms read: answered and confirmed") : null;
  const review = add("review", "review", "The representative's review");
  const formOf = (l: Line<string>) => forms.find(({ f }) => (f.item !== undefined ? l.item === f.item : l.key.startsWith(`${l.code}|${f.subject}|${f.form}`)))?.it;
  const docOf = (l: Line<string>) => docs.find(({ d }) => (d.item !== undefined ? l.item === d.item : l.key.startsWith(`${l.code}|${d.subject}|${d.label}`)))?.it;
  /** The items a line stands on: every line lands on at least one, so a line open means the figure is under 100. */
  const targets = (l: Line<string>): FigureItem[] => {
    if (l.code === "representative_review") return [review];
    if (l.code === "missing_document") { const d = docOf(l); if (d) return [d]; }
    const out: FigureItem[] = [];
    const form = l.code === "open_check" ? undefined : formOf(l);
    if (form) out.push(form);
    if (facts && FACT_CODES.has(l.code)) out.push(facts);
    if (out.length) return out;
    // Anything else on the filing (a finding, a release notice, a fee line, a check with no form) is its own item.
    const key = `check|${l.key}`;
    return [items.find((i) => i.key === key) ?? add("check", key, l.words.replace(/^CRITICAL: /, ""))];
  };
  const open: Line<BlockCode | WarnCode>[] = [...r.blocks, ...r.warns];
  for (const l of r.passed) for (const it of targets(l)) it.passed = true;
  for (const l of open) for (const it of targets(l)) it.done = false;
  for (const it of items) if (!it.done) it.passed = false;
  const done = items.filter((i) => i.done).length, countable = items.length;
  const state: FigureState = r.blocks.length || r.warns.some((w) => w.severity === "critical") ? "not_ready" : r.warns.length ? "attention" : "ready";
  // Rounded down on whole numbers (BR-30 rule 2): 99.9 reads 99, so 100 means every item is done.
  const score = Math.floor((done * 100) / countable);
  return { filing: x.filing, state, score, done, countable, passed: r.passed.length, items, rule: FIGURE_RULE };
}

/** The case's readiness: the lowest state and the lowest figure of its filings, each naming its filing (BR-30 rule 6);
 *  ties go to the first filing given. No filings: null. */
export function lowestOf(figures: Figure[]): CaseFigure | null {
  if (!figures.length) return null;
  let s = figures[0], n = figures[0];
  for (const f of figures.slice(1)) {
    if (STATE_ORDER.indexOf(f.state) < STATE_ORDER.indexOf(s.state)) s = f;
    if (f.score < n.score) n = f;
  }
  return { state: s.state, state_filing: s.filing, score: n.score, score_filing: n.filing };
}
