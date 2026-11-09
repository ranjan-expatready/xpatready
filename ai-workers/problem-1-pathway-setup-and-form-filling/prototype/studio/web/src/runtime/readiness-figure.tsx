// C7.10 readiness figure, by screens (runtime lane, row B143; AG-7-27, BR-30; founder P-406 (2): ours, on Ready to file,
// beside C7.6). Shows the server's figure from GET /runtime/cases/:id/prepare (`figures[]`, `case_figure`) and never works
// it out here. Each filing's block in Ready to file gets one figure row with "How this is worked out" (the counted items
// and the rule in the server's words); the case header gets the lowest state and the lowest figure, naming the filing.
// The figure never gates an action (BR-19): Ready to file still asks the server. Types live here only.
import * as React from "react";
import { useApi } from "@/lib/api";
import { Pill } from "@/components/ui/controls";
import { noRetryOnRefusal } from "./questionnaire";

export type FigureState = "not_ready" | "attention" | "ready";
export type FigureItem = { kind: "form" | "document" | "facts" | "review" | "check"; key: string; label: string; done: boolean; passed: boolean };
export type Figure = { filing: string; state: FigureState; score: number; done: number; countable: number; passed: number; items: FigureItem[]; rule: string };
export type CaseFigure = { state: FigureState; state_filing: string; score: number; score_filing: string };

/** The state words and tones (BR-30's NOT_READY, ATTENTION, READY), each with a title that says what it means. */
export const FIGURE_STATE: Record<FigureState, { words: string; tone: string; title: string }> = {
  not_ready: { words: "Not ready", tone: "danger", title: "A block or a CRITICAL warning is open" },
  attention: { words: "Attention", tone: "warn", title: "Only warnings are open: fix them or pass them with a reason" },
  ready: { words: "Ready", tone: "ok", title: "Nothing stands before Ready to file" },
};
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/** One filing's figure: the state, the figure, "n of m done", passes, and the counted items with the rule folded below. */
export function FigureRow({ g }: { g: Figure }) {
  const s = FIGURE_STATE[g.state];
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2" data-figure={g.filing} data-figure-state={g.state} data-figure-score={g.score}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Pill tone={s.tone} title={s.title}>{s.words}</Pill>
        <span className="text-lg font-semibold tabular-nums" aria-label={`Readiness ${g.score} per cent`} title="The share of counted items done, rounded down">{g.score}%</span>
        <span className="text-[13px] text-text-muted" data-figure-count>{g.done} of {g.countable} done{g.passed ? ` · ${plural(g.passed, "line")} passed with a reason` : ""}</span>
      </div>
      <details className="mt-1 text-[13px]" data-figure-how>
        <summary className="flex min-h-6 cursor-pointer items-center text-text-link">How this is worked out</summary>
        <ul className="mt-1 space-y-0.5 pl-1">{g.items.map((i) => (
          <li key={i.key} className="flex items-start gap-2 [overflow-wrap:anywhere]" data-figure-item={i.kind} data-done={i.done ? "yes" : "no"}>
            <span className={i.done ? "text-text-ok" : "text-text-danger"} aria-hidden>{i.done ? "✓" : "○"}</span>
            <span className="min-w-0 flex-1">{i.label}</span>
            <span className="shrink-0 text-text-muted">{i.done ? (i.passed ? "Passed with a reason" : "Done") : "Not done"}</span>
          </li>
        ))}</ul>
        <p className="mt-2 text-text-muted" data-figure-rule>{g.rule}</p>
      </details>
    </div>
  );
}

type Filing = { id: string; label: string };
type PrepareView = { derived: boolean; filings: Filing[]; figures?: Figure[]; case_figure?: CaseFigure | null };

/** The case header's readiness: the lowest state and the lowest figure of the case's filings (BR-30 rule 6), naming the
 *  filing; it reads the same /prepare query as Ready to file, so the page fetches it once. Hidden while loading or on error. */
export function CaseReadinessPill({ caseId }: { caseId: string }) {
  const q = useApi<PrepareView>(["runtime", "view", caseId, "prepare"], `/runtime/cases/${caseId}/prepare`, { retry: noRetryOnRefusal });
  const v = q.data, c = v?.case_figure;
  if (!v?.derived || !c) return null;
  const label = (id: string) => v.filings.find((f) => f.id === id)?.label ?? "a filing";
  const s = FIGURE_STATE[c.state], same = c.state_filing === c.score_filing;
  const title = same ? `Lowest of ${plural(v.filings.length, "filing")}: ${label(c.state_filing)}. ${s.title}.`
    : `Lowest state: ${s.words}, ${label(c.state_filing)}. Lowest figure: ${c.score}%, ${label(c.score_filing)}.`;
  return (
    <Pill tone={s.tone} title={title} className="whitespace-normal text-[12px] [overflow-wrap:anywhere]">
      <span data-case-figure data-figure-state={c.state} data-figure-score={c.score} data-state-filing={c.state_filing} data-score-filing={c.score_filing}>
        {same ? <>Readiness: {s.words} · {c.score}%<span className="font-normal"> (lowest: {label(c.state_filing)})</span></>
          : <>Readiness: {s.words}<span className="font-normal"> ({label(c.state_filing)})</span> · {c.score}%<span className="font-normal"> ({label(c.score_filing)})</span></>}
      </span>
    </Pill>
  );
}
