// X1, W1 setup checklist slice C3 (concept v4 §7 "Overview", board v3 §5): the Overview's setup strip. Five rows, one
// per step, read from the summary's checklist and never recounted (concept §8): mark, step, its one-line summary with
// who confirmed it on which tier, and its open items as links to where each is done (`itemHref`, the same place the
// tab badges count it). It only reports (P-118 Q5): no button here. A step after the current one says "After <step>"
// (board v3) but its items stay links in a quieter colour: steps 1 and 2 cannot be confirmed on a screen yet (forms
// F2), so hiding later links would leave the author no way to Forms from here.
import * as React from "react";
import { Link } from "react-router-dom";
import { itemHref, STEP_KEYS, tabOfFocus, type SetupChecklist, type Step, type ViewerChecklist } from "../../../contracts/setup-checklist";
import { Pill } from "@/components/ui/controls";
import { Tip } from "@/components/status";
import { cn } from "@/lib/utils";
import { LIVE_NEXT } from "../../../contracts/status-words";

const TAB_NAME: Record<string, string> = { forms: "Forms", documents: "Documents", questionnaires: "Smart questionnaire (SQR)", review: "Review and release" };
/** The board's small line under a step's name. */
const STEP_HINT: Partial<Record<Step["key"], string>> = { pages: "IRCC's apply page and document checklist; the forms, people and documents are read from them", questions_documents: "documents first, then questions" };
/** Where "See on …" lands for a done step (the step's own place on its tab). */
const SEE_FOCUS: Partial<Record<Step["key"], string>> = { pages: "pages:record", people: "people:card" };
type Mark = Step["state"];
const MARK: Record<Mark, { sign: string; word: string; cls: string }> = {
  done: { sign: "✓", word: "Done", cls: "border-primary bg-primary text-white" },
  next: { sign: "●", word: "Next", cls: "border-2 border-primary text-primary" },
  todo: { sign: "○", word: "To do", cls: "border-border-strong text-text-muted" },
  ai: { sign: "◐", word: "AI at work", cls: "border-violet-300 bg-violet-50 text-violet-700" },
  waiting: { sign: "⧗", word: "Waiting for someone else", cls: "border-warn/60 bg-warn/10 text-text-warn" },
};
/** Shown as a line, not a hover-only tooltip (review minor 2: keyboard and touch users read it too). */
export const STRIP_TIP = "Worked out from what is set up now · ✓ done · ● next · ◐ AI at work · ⧗ waiting for someone else";
/** Review minor 1: the page's `:focus-visible` reset removes outlines, so the strip's links draw their own ring. */
const LINK_FOCUS = "rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1";
const TIER_WORDS = { author: "the configuration author · sure", expert: "the immigration expert · not sure" } as const;
/** The concept's sure/not-sure tooltip (v4 "Copy"). */
export const TIER_TIP = "The configuration author confirms what the rules or both AI readings agree on; anything else waits for the immigration expert.";

export function SetupStrip({ id, setup, landRef }: { id: string; setup: SetupChecklist | ViewerChecklist; landRef?: React.Ref<HTMLElement> }) {
  const viewer = "viewer" in setup ? setup.viewer : null;
  if (setup.chip.status === "RETIRED") return <p className="text-sm text-text-muted" data-setup-strip="retired">{setup.bar.text}. Its setup is kept as it was released; nothing new is set up on it.</p>;
  const current = setup.current;
  return (
    <section ref={landRef} tabIndex={-1} aria-labelledby="ov-steps" className="overflow-hidden rounded-xl border border-border bg-surface-raised shadow-sm outline-none" data-setup-strip>
      <h2 id="ov-steps" className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3 font-semibold">
        {/* UX-A part 3, QA-184: Live first, then what the next release still needs in the card's words (one count). */}
        <span data-strip-head>{setup.chip.status === "LIVE" ? `Live · Release ${setup.chip.release ?? 1} · ${setup.bar.next ?? `nothing open ${LIVE_NEXT}`}` : `Setup steps · ${setup.bar.done} of 5 done`}</span>
        <span className="text-xs font-normal text-text-muted" data-strip-legend>{STRIP_TIP}</span>
      </h2>
      <ol>
        {setup.steps.map((s, n) => {
          // The viewer overlay (§5): the current step whose first item is not this person's reads ⧗ waiting.
          const mark: Mark = s.state === "next" && viewer && !viewer.filled && s.key === setup.next?.step && setup.next.item.kind !== "view_ai" ? "waiting" : s.state;
          const later = !!current && STEP_KEYS.indexOf(s.key) > STEP_KEYS.indexOf(current) && s.state !== "done";
          // X1 follow-up (concept v4 copy): the tier words carry the sure/not-sure tooltip, reachable by keyboard.
          const confirmed = s.confirmed && s.key !== "pages" ? <> · confirmed by <Tip tip={TIER_TIP} focusable><span className={cn("underline decoration-dotted underline-offset-2", LINK_FOCUS)} data-tier-tip={s.confirmed.as}>{TIER_WORDS[s.confirmed.as]}</span></Tip></> : null;
          return (
            <li key={s.key} data-step-row={s.key} data-mark={mark} className={cn("grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-b border-border px-4 py-2.5 last:border-b-0 md:grid-cols-[2rem_14rem_minmax(0,1fr)_minmax(0,18rem)]", mark === "next" || mark === "waiting" ? "bg-primary/5" : "")}>
              <span className={cn("inline-flex size-6 items-center justify-center rounded-full border text-xs font-bold", MARK[mark].cls)} aria-hidden>{MARK[mark].sign}</span>
              <span className="font-semibold"><span className="sr-only">Step {n + 1}, {MARK[mark].word}: </span>{s.label}{STEP_HINT[s.key] ? <small className="block text-xs font-normal text-text-muted">{STEP_HINT[s.key]}</small> : null}</span>
              <span className="col-start-2 text-sm text-text-muted md:col-start-auto" data-step-summary>{s.summary}{confirmed}{s.key === "people" && s.confirmed?.as !== "expert" ? <> <Pill tone="warn" title="Numbers Sample until the immigration expert confirms">Sample</Pill></> : null}{mark === "waiting" && viewer?.nextLine ? <span className="block text-text-warn">{viewer.nextLine}</span> : null}</span>
              <span className="col-start-2 text-sm [overflow-wrap:anywhere] md:col-start-auto" data-step-open>
                {s.state === "done"
                  ? <Link className={cn("font-medium text-text-link underline", LINK_FOCUS)} to={`/c/${id}/${s.tab}${SEE_FOCUS[s.key] ? `?focus=${encodeURIComponent(SEE_FOCUS[s.key]!)}` : ""}`}>See on {TAB_NAME[s.tab]}</Link>
                  : s.open.length
                    ? <>{s.open.map((i, k) => {
                        // data-tab: the tab whose badge counts this item (none for release items), so a check can sum them.
                        const attrs = { "data-open-item": i.focus, "data-count": i.count, "data-tab": tabOfFocus(i.focus, s.tab) ?? "" };
                        return <React.Fragment key={`${i.focus}-${k}`}>{k ? " · " : null}<Link className={cn("underline", LINK_FOCUS, later ? "text-text-muted" : "font-medium text-text-link")} to={itemHref(id, s.key, s.tab, i)} {...attrs}>{i.text}</Link></React.Fragment>;
                      })}{later ? <span className="block text-xs text-text-muted">After {setup.steps[n - 1].label}</span> : null}</>
                    : <span className="text-text-muted">{later ? `After ${setup.steps[n - 1].label}` : "Nothing to do"}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
