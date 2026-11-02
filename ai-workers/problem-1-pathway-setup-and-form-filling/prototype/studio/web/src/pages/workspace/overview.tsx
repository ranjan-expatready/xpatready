// S5 Overview (P-118 Q5, walkthrough v2 S5): it only reports. Status and next step sit in the page header; here the
// setup strip (X1 slice C3: five steps, each with its open items as links to where they are done), four counts in
// words, and released versions in one line. Who can be in the application sits in "Before forms" on Forms only
// (P-161 (2)). No add or edit control.
import * as React from "react";
import { Link } from "react-router-dom";
import { type CombinationSummary, type CombinationView } from "../../../../contracts/programs";
import { SetupStrip } from "@/components/setup-strip";
import { Stat } from "@/components/ui/controls";
import { fmtWhen } from "@/components/status";
import { perPersonWords } from "../../../../contracts/counts";

export function OverviewTab({ d, sum, show, failed, onRetry }: { d: CombinationView; sum: CombinationSummary | undefined; show: string | null; failed?: boolean; onRetry?: () => void }) {
  const id = d.combination.id;
  const row = sum?.row;
  const k = d.draft.counts;
  // F8: "Nothing to release yet" is a release problem the setup strip already says (step 3, Forms); the Rules and
  // checks tile counts rule and check problems only (Lead check item 3: no setup shows "no problems").
  const ruleProblems = d.draft.problems.filter((p) => p.where !== "Release");
  const errors = ruleProblems.filter((p) => p.level === "error").length;
  const warnings = ruleProblems.length - errors;
  const stripRef = React.useRef<HTMLElement>(null);
  React.useEffect(() => { if (show === "missing") { stripRef.current?.scrollIntoView({ block: "center" }); stripRef.current?.focus({ preventScroll: true }); } }, [show, !!sum?.setup]);
  // C3 follow-up (review m2): after Retry, focus moves to the strip once it is back, not to the page's body.
  const retried = React.useRef(false);
  React.useEffect(() => { if (retried.current && sum?.setup) { retried.current = false; stripRef.current?.focus({ preventScroll: true }); } }, [sum?.setup]);
  const last = d.releases[0];
  const fc = sum?.setup ? { total: sum.setup.counts.forms, setUp: sum.setup.counts.formsSetUp } : null;
  const byRole = row?.counts?.questionsByRole ?? [];
  return (
    <div className="space-y-5" data-overview>
      {/* X1 slice C3: the setup strip replaces "Missing before firms can use it"; ?show=missing (the header's "See n
          missing") lands on it. */}
      {/* X1 follow-up (C3 review minor 1): a failed summary says so and offers Retry, never an endless "Loading". */}
      {sum?.setup ? <SetupStrip id={id} setup={sum.setup} landRef={stripRef} />
        : failed && !sum ? <p className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text-danger" role="alert" data-setup-strip-error>The setup steps could not be loaded · <button type="button" className="rounded-sm font-medium text-text-link underline outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1" onClick={() => { retried.current = true; onRetry?.(); }}>Retry</button></p>
        : !sum ? <p className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text-muted" role="status" data-setup-strip-loading>Loading the setup steps…</p> : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {/* UX-A part 1 (contracts/counts.ts): the same forms count as the setup strip, the Forms tab and the Programs card
            (lines and attached forms not set up yet), and the same question count as the Questionnaires chips (their sum). */}
        <Stat label="Forms" value={fc ? fc.total : "…"} sub={<>{fc && fc.setUp < fc.total ? `${fc.setUp} set up · ` : ""}{k.map_boxes} form field{k.map_boxes === 1 ? "" : "s"} matched to shared fields · <Link className="text-text-link underline" to={`/c/${id}/forms`}>see them</Link></>} />
        <Stat label="Questions" value={row ? row.counts?.questions ?? 0 : "…"} sub={<span data-questions-sub>{byRole.length ? `across all people: ${perPersonWords(byRole)}` : "across all people (each person role counted)"} · {k.sections} sections</span>} />
        <Stat label="Documents" value={k.document_requirements} sub="asked always or only if" />
        {/* Only this combination's own problems (Lead check item 3), each listed on Review and release. */}
        <Stat label="Rules and checks" value={`${k.rules} rule${k.rules === 1 ? "" : "s"} · ${k.checks} check${k.checks === 1 ? "" : "s"}`} tone={errors ? "danger" : undefined}
          sub={errors || warnings ? <Link className="text-text-link underline" to={`/c/${id}/review`}>{errors ? `${errors} problem${errors === 1 ? "" : "s"} to fix` : `${warnings} warning${warnings === 1 ? "" : "s"}`}: see them</Link> : "no rule or check problems"} />
      </div>
      <p className="text-sm text-text-muted" data-releases>{last ? <>Released versions: <b className="font-semibold text-text">Release {last.release}</b>, {fmtWhen(last.released_at)}, approved by {last.approver}{d.releases.length > 1 ? ` · ${d.releases.length - 1} earlier` : ""} · <Link className="text-text-link underline" to={`/c/${id}/review`}>Review and release</Link></> : "Nothing released yet. Case work only ever uses a released version; drafts are previews."}</p>
    </div>
  );
}
