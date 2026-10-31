// S5 Overview (P-118 Q5, walkthrough v2 S5): it only reports. Status and next step sit in the page header; here the
// "Missing before firms can use it" list (each line links to the tab where it is fixed), four counts in words, a
// read-only summary of who can be in the application, and released versions in one line. No add or edit control.
import * as React from "react";
import { Link } from "react-router-dom";
import { sharedStep, type CombinationSummary, type CombinationView, type MissingItem } from "../../../../contracts/programs";
import { Stat } from "@/components/ui/controls";
import { fmtWhen } from "@/components/status";
import { cn } from "@/lib/utils";

/** The tab where each missing item is fixed (BR-2). */
const FIX_TAB: Record<MissingItem["code"], [string, string]> = {
  no_forms: ["forms", "Forms"], form_without_edition: ["forms", "Forms"], not_started: ["forms", "Forms"], filing_problem: ["forms", "Forms"],
  role_without_questions: ["questionnaires", "Questionnaires"], rule_problem: ["review", "Review and release"],
};

export function OverviewTab({ d, sum, show }: { d: CombinationView; sum: CombinationSummary | undefined; show: string | null }) {
  const id = d.combination.id;
  const row = sum?.row;
  const missing = row && row.status !== "READY" ? row.missing : [];
  const k = d.draft.counts;
  // F8: "Nothing to release yet" is a release problem the missing list already says ("No forms yet", with its step);
  // the Rules and checks tile counts rule and check problems only (Lead check item 3: no setup shows "no problems").
  const ruleProblems = d.draft.problems.filter((p) => p.where !== "Release");
  const errors = ruleProblems.filter((p) => p.level === "error").length;
  const warnings = ruleProblems.length - errors;
  const missingRef = React.useRef<HTMLElement>(null);
  React.useEffect(() => { if (show === "missing") { missingRef.current?.scrollIntoView({ block: "center" }); missingRef.current?.focus({ preventScroll: true }); } }, [show, !!sum]);
  const people = d.combination.participants as { role: string; label: string; min: number; max: number; applies?: boolean }[];
  const last = d.releases[0];
  return (
    <div className="space-y-5" data-overview>
      {missing.length ? (
        <section ref={missingRef} tabIndex={-1} aria-labelledby="ov-missing" className={cn("rounded-xl border border-danger/30 bg-danger/5 p-4 outline-none", show === "missing" && "ring-[3px] ring-danger/30")}>
          <h2 id="ov-missing" className="font-semibold">{row?.release ? `Why firms cannot use it (${missing.length})` : `Missing before firms can use it (${missing.length})`}</h2>
          <ul className="mt-2 space-y-1 text-sm">{missing.map((m, i) => { const [tab, name] = FIX_TAB[m.code] ?? ["forms", "Forms"]; return <li key={i} className="flex gap-2"><span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger" /><Link className="hover:underline" to={`/c/${id}/${tab}`} title={`Fixed on the ${name} tab`}>{m.text}</Link></li>; })}</ul>
          {sharedStep(missing) ? <p className="mt-2 text-sm" data-shared-step>Next step for all of these: <b className="font-semibold">{sharedStep(missing)}</b>.</p> : null}
        </section>
      ) : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Forms" value={k.forms} sub={<>{k.map_boxes} form field{k.map_boxes === 1 ? "" : "s"} matched to shared fields · <Link className="text-text-link underline" to={`/c/${id}/forms`}>see them</Link></>} />
        <Stat label="Questions" value={row?.counts?.questions ?? 0} sub={`questions across all people (each person role counted) · ${k.sections} sections`} />
        <Stat label="Documents" value={k.document_requirements} sub="asked always or only if" />
        {/* Only this combination's own problems (Lead check item 3), each listed on Review and release. */}
        <Stat label="Rules and checks" value={`${k.rules} rule${k.rules === 1 ? "" : "s"} · ${k.checks} check${k.checks === 1 ? "" : "s"}`} tone={errors ? "danger" : undefined}
          sub={errors || warnings ? <Link className="text-text-link underline" to={`/c/${id}/review`}>{errors ? `${errors} problem${errors === 1 ? "" : "s"} to fix` : `${warnings} warning${warnings === 1 ? "" : "s"}`}: see them</Link> : "no problems"} />
      </div>
      <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm" aria-labelledby="ov-people" data-overview-people>
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="ov-people" className="font-semibold">Who can be in this application</h2><Link className="text-sm text-text-link underline" to={`/c/${id}/questionnaires`}>Change in Questionnaires</Link></div>
        <ul className="mt-2 flex flex-wrap gap-2 text-sm">{people.filter((p) => p.max > 0).map((p) => <li key={p.role} className="rounded-full border border-border px-3 py-1">{p.label} · {p.min === p.max ? p.min : `${p.min} to ${p.max}`}{p.applies !== false ? " · applicant" : ""}</li>)}</ul>
        <p className="mt-2 text-xs text-text-muted">Each person marked as applicant gets their own forms, questions and documents. Numbers Sample until the immigration expert confirms.</p>
      </section>
      <p className="text-sm text-text-muted" data-releases>{last ? <>Released versions: <b className="font-semibold text-text">Release {last.release}</b>, {fmtWhen(last.released_at)}, approved by {last.approver}{d.releases.length > 1 ? ` · ${d.releases.length - 1} earlier` : ""} · <Link className="text-text-link underline" to={`/c/${id}/review`}>Review and release</Link></> : "Nothing released yet. Case work only ever uses a released version; drafts are previews."}</p>
    </div>
  );
}
