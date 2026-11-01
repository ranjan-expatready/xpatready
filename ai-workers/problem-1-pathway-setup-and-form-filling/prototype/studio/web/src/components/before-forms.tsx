// W1 setup checklist, slice C1 (P-161 (2), board §5): steps 1 and 2 sit in a "Before forms" block at the top of the Forms
// tab: Official pages (read only until the forms lane's official-pages record and its Confirm land, F2) and Who can be in
// this application (the people card, moved here from Questionnaires). Each line's mark and words are the setup
// checklist's (GET …/summary `setup`), so the card, the Overview and this block never disagree.
import type { CombinationSummary } from "../../../contracts/programs";
import type { Step } from "../../../contracts/setup-checklist";
import type { PeopleView } from "../../../contracts/workspace";
import { useApi } from "@/lib/api";
import { Notice } from "@/components/ui/controls";
import { cn } from "@/lib/utils";
import { DONE_SINCE, FOCUS_RING, useFocusItem } from "@/components/focus-item";
import { WhoCanBe } from "@/pages/workspace/questionnaires";

/** ✓ Done · ● Next · ○ To do · ◐ AI at work · ⧗ Waiting for someone else (concept §6). */
const MARK: Record<Step["state"] | "waiting", [string, string, string]> = {
  done: ["✓", "text-text-ok", "Done"], next: ["●", "text-primary", "Next"], todo: ["○", "text-text-muted", "To do"], ai: ["◐", "text-ai", "AI at work"], waiting: ["⧗", "text-text-muted", "Waiting for someone else"],
};

function Mark({ state }: { state: keyof typeof MARK }) {
  const [glyph, tone, word] = MARK[state] ?? MARK.todo;
  return <span className={cn("w-4 shrink-0 text-center font-semibold", tone)} role="img" aria-label={word} data-mark={state}>{glyph}</span>;
}

export function BeforeForms({ id, people }: { id: string; people: PeopleView }) {
  const sum = useApi<CombinationSummary>(["combination-summary", id], `/combinations/${id}/summary`);
  const steps = sum.data?.setup?.steps;
  const doneSince = useFocusItem(steps ? [steps[0].state === "done" ? "pages:record" : "", steps[1].state === "done" ? "people:card" : ""].filter(Boolean) : undefined, (k) => k === "pages:record" || k === "people:card");
  const [pages, who] = [steps?.[0], steps?.[1]];
  return (
    <section aria-labelledby="before-forms" className="space-y-3 rounded-xl border border-border bg-surface p-4" data-before-forms>
      <h2 id="before-forms" className="text-sm font-semibold uppercase tracking-wide text-text-muted">Before forms</h2>
      {doneSince ? <Notice tone="info" title={DONE_SINCE}>Nothing waits there now; the next step is on the card.</Notice> : null}
      <p className={cn("flex items-start gap-2 p-1 text-sm", FOCUS_RING)} data-focus="pages:record" data-step="pages">
        {pages ? <Mark state={pages.state} /> : null}
        <span><b>Official pages</b>: {pages?.summary ?? "…"}{pages?.open[0] ? <span className="text-text-muted"> · {pages.open[0].text}</span> : null}</span>
      </p>
      <div className={cn("flex items-start gap-2 p-1", FOCUS_RING)} data-focus="people:card" data-step="people">
        {who ? <span className="pt-3.5"><Mark state={who.state} /></span> : null}
        <div className="min-w-0 flex-1"><WhoCanBe id={id} v={people} /></div>
      </div>
    </section>
  );
}
