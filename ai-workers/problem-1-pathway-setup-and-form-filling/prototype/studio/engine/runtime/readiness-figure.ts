// C7.10 readiness figure per filing (runtime lane, row B143; founder P-406 (2): ours, beside C7.6 so C7.6's finish line
// does not move; team requirement AG-07 v3.12 AG-7-27 and BR-30). Pure rules, no database, no route. It reads C7.6's
// result (engine/runtime/readiness.ts `filingReadiness`) and its input, and changes neither: the figure is a summary of
// the same lines, never a second judgement.
//
// BR-30, mapped onto what the reference app holds (concept `product/screens/B143/concept.md` §3):
//   State   Not ready while a block, an open CRITICAL warning or an open CRITICAL review finding stands (challenge M1:
//           C7.6 raises every finding as a plain warning, so the finding's own severity is read here); Attention while
//           only other warnings are open; Ready when nothing is open (exactly C7.6's `ready`). A passed line is not open.
//   Items   each form item on the filing (a "Not needed" line is left out of both sides); each required document; the
//           facts the forms read (BR-30's questionnaire); the representative's review; each other line on the filing,
//           standing or passed (an open check with no form to read it, a review finding, a release notice, a fee line);
//           any line with no other home is its own item (challenge m1), so a new C7.6 code can never leave 100 beside a
//           refused Ready to file. A finding closed in Review findings (C7.5) stays counted (challenge M3): acknowledged,
//           waived or dismissed with a reason is done and passed; resolved by the rules is done (BR-30: RESOLVED, WAIVED).
//   Done    an item is done when no open block or warning is on it; a passed line counts as done (BR-30 rule 5);
//           "passed" counts the items done by a pass (challenge m5), so it reads against "n of m done".
//   Figure  done ÷ countable × 100, rounded down (BR-30 rule 2): 100 only when nothing is open, so the figure and the
//           Ready to file button never disagree.
//   Case    the lowest state (Not ready < Attention < Ready) and the lowest figure, each naming its filing (BR-30 rule 6),
//           over the filings not yet recorded as submitted (challenge M2; BR-31 counts a case by its open filings): a
//           submitted filing's lines are closed and can no longer be passed, so it never holds the case back.
//   Never gates an action (BR-19). No combination key, form number or program name here (P-319, P-425).
import type { FilingInput, FilingReadiness, Line, WarnCode, BlockCode } from "./readiness.ts";

export type FigureState = "not_ready" | "attention" | "ready";
export type FigureItem = { kind: "form" | "document" | "facts" | "review" | "check"; key: string; label: string; done: boolean; passed: boolean };
export type Figure = { filing: string; state: FigureState; score: number; done: number; countable: number; passed: number; items: FigureItem[]; rule: string;
  /** Recorded as submitted (set by the prepare view): shown as Submitted, never in the case's lowest (challenge M2). */
  submitted?: boolean };
/** A review finding of this filing no longer open (C7.5's Review findings): closed with a reason, or resolved by the rules. */
export type ClosedFinding = { id: string; words: string; state: "acknowledged" | "waived" | "dismissed" | "resolved" };
export type CaseFigure = { state: FigureState; state_filing: string; score: number; score_filing: string };

/** The rule in words, shown under the figure (BR-7). It names what is not counted here (the team's retainer and library). */
export const FIGURE_RULE = "Counted: each form on this filing, each required document, the facts the forms read (answered and confirmed), "
  + "the representative's review, and each other check, review finding, release notice or fee line. Each counts the same. "
  + "A line passed with a reason, or a finding closed with a reason, counts as done. The figure is the share done, rounded down, "
  + "so it is 100 only when nothing stands before Ready to file. Not ready: a block, a CRITICAL warning or a CRITICAL finding is open. "
  + "Attention: only other warnings are open. Ready: nothing is open. Not counted here: the retainer and the firm's own deficiency "
  + "library, which this tool does not keep.";

const STATE_ORDER: FigureState[] = ["not_ready", "attention", "ready"];
/** Lines about the facts a form reads: they hold the facts item as well as their form (BR-30 counts the questionnaire apart). */
const FACT_CODES = new Set<string>(["missing_facts", "fact_problem", "open_check"]);

/** A closed finding row as stored: `check` names a rules finding's rule and person (null for one added by hand or by the
 *  AI review), so the rows one check leaves behind can be told apart from different checks. */
export type ClosedRow = ClosedFinding & { check?: string | null };
/** Review M1 on #1389: the rules store a finding again each time the values it compares change (api/src/findings.ts), so
 *  one check leaves a resolved row per edit. BR-30 counts each check once: a check that is open again counts through
 *  its open line (its closed rows are dropped), and a closed check counts once, by its newest row. Rows come newest
 *  first; a row with no `check` (by hand, AI) is its own item. `openChecks`: the checks with an open row now. */
export function closedOnce(rows: ClosedRow[], openChecks: Iterable<string>): ClosedFinding[] {
  const seen = new Set(openChecks), out: ClosedFinding[] = [];
  for (const { check, ...g } of rows) {
    if (check) { if (seen.has(check)) continue; seen.add(check); }
    out.push(g);
  }
  return out;
}

/** The state, figure and counted items of one filing, from C7.6's input and result. */
export function readinessFigure(x: FilingInput, r: FilingReadiness, closed: ClosedFinding[] = []): Figure {
  if (r.filing !== x.filing) throw new Error(`readiness of ${r.filing} given for filing ${x.filing}`);
  const items: FigureItem[] = [];
  const add = (kind: FigureItem["kind"], key: string, label: string) => { const it = { kind, key, label, done: true, passed: false }; items.push(it); return it; };
  // A form or document line with no item id carries `code|subject|form` at the start of its key (readiness.ts keyOf).
  // Challenge m7: a form that cannot start yet (whether it applies waits for an answer) says so in its label.
  const waits = (f: FilingInput["forms"][number]) => f.readiness.missing.some((m) => m.fact.startsWith("applies:"));
  const forms = x.forms.filter((f) => f.channel !== "NOT_NEEDED").map((f) => ({ f, it: add("form", `form|${f.item ?? `${f.subject}|${f.form}`}`, `${f.form} for ${f.person}${waits(f) ? " (whether it applies waits for an answer)" : ""}`) }));
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
  // Challenge M3: a finding closed in Review findings stays one item (done; passed when closed with a reason).
  for (const g of closed) { const it = add("check", `check|finding|${g.id}`, g.words); it.passed = g.state !== "resolved"; }
  const open: Line<BlockCode | WarnCode>[] = [...r.blocks, ...r.warns];
  for (const l of r.passed) for (const it of targets(l)) it.passed = true;
  for (const l of open) for (const it of targets(l)) it.done = false;
  for (const it of items) if (!it.done) it.passed = false;
  const done = items.filter((i) => i.done).length, countable = items.length;
  const critFinding = new Set((x.findings ?? []).filter((g) => g.severity === "CRITICAL").map((g) => `finding|${g.id}`));
  const state: FigureState = r.blocks.length || r.warns.some((w) => w.severity === "critical" || (w.code === "finding" && !!w.item && critFinding.has(w.item))) ? "not_ready" : r.warns.length ? "attention" : "ready";
  // Rounded down on whole numbers (BR-30 rule 2): 99.9 reads 99, so 100 means every item is done.
  const score = Math.floor((done * 100) / countable);
  return { filing: x.filing, state, score, done, countable, passed: items.filter((i) => i.passed).length, items, rule: FIGURE_RULE };
}

/** The case's readiness: the lowest state and the lowest figure of its filings not yet submitted, each naming its filing
 *  (BR-30 rule 6; challenge M2); ties go to the first filing given. None open: null. */
export function lowestOf(all: Figure[]): CaseFigure | null {
  const figures = all.filter((f) => !f.submitted);
  if (!figures.length) return null;
  let s = figures[0], n = figures[0];
  for (const f of figures.slice(1)) {
    if (STATE_ORDER.indexOf(f.state) < STATE_ORDER.indexOf(s.state)) s = f;
    if (f.score < n.score) n = f;
  }
  return { state: s.state, state_filing: s.filing, score: n.score, score_filing: n.filing };
}
