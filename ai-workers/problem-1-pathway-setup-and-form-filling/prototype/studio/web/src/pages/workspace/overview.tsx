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

export function OverviewTab({ d, sum, show }: { d: CombinationView; sum: CombinationSummary | undefined; show: string | null }) {
  const id = d.combination.id;
  const row = sum?.row;
  const k = d.draft.counts;
  const errors = d.draft.problems.filter((p) => p.level === "error").length;
  const warnings = d.draft.problems.length - errors;
  const stripRef = React.useRef<HTMLElement>(null);
  React.useEffect(() => { if (show === "missing") { stripRef.current?.scrollIntoView({ block: "center" }); stripRef.current?.focus({ preventScroll: true }); } }, [show, !!sum?.setup]);
  const last = d.releases[0];
  return (
    <div className="space-y-5" data-overview>
      {/* X1 slice C3: the setup strip replaces "Missing before firms can use it"; ?show=missing (the header's "See n
          missing") lands on it. */}
      {sum?.setup ? <SetupStrip id={id} setup={sum.setup} landRef={stripRef} /> : !sum ? <p className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text-muted" role="status" data-setup-strip-loading>Loading the setup steps…</p> : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Forms" value={k.forms} sub={<>{k.map_boxes} form field{k.map_boxes === 1 ? "" : "s"} matched to shared fields · <Link className="text-text-link underline" to={`/c/${id}/forms`}>see them</Link></>} />
        <Stat label="Questions" value={row?.counts?.questions ?? 0} sub={`questions across all people (each person role counted) · ${k.sections} sections`} />
        <Stat label="Documents" value={k.document_requirements} sub="asked always or only if" />
        {/* Only this combination's own problems (Lead check item 3), each listed on Review and release. */}
        <Stat label="Rules and checks" value={`${k.rules} rule${k.rules === 1 ? "" : "s"} · ${k.checks} check${k.checks === 1 ? "" : "s"}`} tone={errors ? "danger" : undefined}
          sub={errors || warnings ? <Link className="text-text-link underline" to={`/c/${id}/review`}>{errors ? `${errors} problem${errors === 1 ? "" : "s"} to fix` : `${warnings} warning${warnings === 1 ? "" : "s"}`}: see them</Link> : "no problems"} />
      </div>
      <p className="text-sm text-text-muted" data-releases>{last ? <>Released versions: <b className="font-semibold text-text">Release {last.release}</b>, {fmtWhen(last.released_at)}, approved by {last.approver}{d.releases.length > 1 ? ` · ${d.releases.length - 1} earlier` : ""} · <Link className="text-text-link underline" to={`/c/${id}/review`}>Review and release</Link></> : "Nothing released yet. Case work only ever uses a released version; drafts are previews."}</p>
    </div>
  );
}
