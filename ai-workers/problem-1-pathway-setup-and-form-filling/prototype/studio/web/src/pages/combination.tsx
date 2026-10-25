import * as React from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { CatalogueLeaf, CombinationSummary, CombinationView, SessionView } from "../../../contracts/programs";
import { TABS, tabOf, type WorkspaceView } from "../../../contracts/workspace";
import { ArrowRight, ChevronRight } from "lucide-react";
import { CATALOGUE_URL_KEY, STATUS_WORD } from "@/pages/programs";
import { SHOW_ONLY_STEPS, StepLabel, StepTip, useNextStep } from "@/components/next-step";
import { StatusChip, TipProvider } from "@/components/status";
import { useActorId, useApi } from "@/lib/api";
import { Button, Notice, Pill } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { cn } from "@/lib/utils";
import { roleSummary } from "@/components/participants";
import { SourcesTab } from "@/pages/sources";
import { ConfigurationTab } from "@/pages/configuration";
import { OverviewTab } from "@/pages/workspace/overview";
import { FormsTab } from "@/pages/workspace/forms";
import { PreviewTab, usePreviewParams } from "@/pages/workspace/preview";
import { PreviewTab as OldPreviewTab } from "@/pages/preview";
import { ReviewTab } from "@/pages/review";

/** The combination workspace (Screen 03, P-50: a Programs row opens it). Its header carries the full path with every
 *  level a link back to the list filtered to it, the status and the facts in one muted line, and the one next step.
 *  The tabs are Screen 03's (BR-1, contracts/workspace.ts TABS); Overview, Forms and Preview by person are rebuilt in
 *  slice S1 (pages/workspace/*), the others still show today's pages until their slice, and Sources stays until
 *  Screen 02 merges. An unknown tab opens Overview. */
export function CombinationPage() {
  const { id, tab: asked = "overview" } = useParams();
  const [sp] = useSearchParams();
  const tab = tabOf(asked, sp.get("area"));
  const o = useApi<CombinationView>(["combination", id], `/combinations/${id}`, { refetchInterval: (q) => (q.state.data?.jobs?.some((j) => j.status === "RUNNING" || j.status === "QUEUED") ? 3000 : false) });
  const sum = useApi<CombinationSummary>(["combination-summary", id], `/combinations/${id}/summary`, { refetchInterval: (q) => (q.state.data?.row?.aiRunning ? 3000 : false) });
  if (asked !== tab) return <Navigate replace to={`/c/${id}/${tab}${asked === "configuration" && sp.get("area") === "checks" ? "?area=checks" : ""}`} />;
  if (o.isLoading) return <Spinner label="Loading combination" />;
  if (o.isError || !o.data) return <ErrorState title="This combination could not be opened" description={(o.error as Error | null)?.message ?? "No answer from the studio."} action={<Link className="text-text-link underline" to="/">Back to programs</Link>} />;
  const d = o.data;
  const c = d.combination;
  const last = d.releases[0];
  const row = sum.data?.row;
  const changes = sum.data?.changes ?? 0;
  const errorCount = d.draft.problems.filter((p) => p.level === "error").length;
  // Back to the list exactly as it was left (pathway, filters, sort, search; scroll restored there), this row highlighted.
  const backTo = (() => { try { return sessionStorage.getItem(CATALOGUE_URL_KEY) ?? "/"; } catch { return "/"; } })();
  const pw = d.pathway?.client_type === "CORPORATE" ? "pw=CORPORATE&" : "";
  const leafKey = d.path?.[d.path.length - 1]?.key;
  const levelLink = (n: CombinationView["path"][number]) => n.level === "Pathway" ? `/?${pw}f=all` : n.level === "Program" ? `/?${pw}prog=${encodeURIComponent(n.key)}&sel=${encodeURIComponent(leafKey)}` : `/?${pw}under=${encodeURIComponent(n.key)}&sel=${encodeURIComponent(leafKey)}`;
  const facts = [
    row?.release ? `In Release ${row.release.pack}` : last ? "Released" : "Not released yet",
    // The same count as the list and the draft bar (an empty draft has no changes to release).
    changes ? `${changes} draft change${changes === 1 ? "" : "s"}` : last ? "draft matches the release" : null,
    d.submission?.status === "SUBMITTED" ? (d.submission.stale ? "submitted, then changed" : "in review") : null,
    sum.data?.forms.length ? `filing: ${sum.data.filing}` : null,
    sum.data?.portalLabel ?? null,
    d.allowed_locations?.length ? `cases opened ${d.allowed_locations.map((l) => l === "inside_canada" ? "inside Canada" : "outside Canada").join(" or ")}` : null,
    `people: ${roleSummary(c.participants)}`,
    c.source_basis === "ILLUSTRATIVE" ? "Sample (illustrative)" : "source-backed",
  ].filter(Boolean).join(" · ");
  return (
    <TipProvider>
    <div className="mx-auto max-w-7xl space-y-5">
      <nav aria-label="Path" className="flex flex-wrap items-center gap-1 text-sm text-text-muted">
        <Link to={backTo} className="font-medium text-text-link hover:underline">Programs</Link>
        {(d.path ?? []).map((n) => <React.Fragment key={n.key}><ChevronRight className="size-3.5" aria-hidden /><Link to={levelLink(n)} title={`${n.level}: show the list for ${n.label}`} className="hover:text-text hover:underline">{n.label}</Link></React.Fragment>)}
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold [overflow-wrap:anywhere]">{c.label}</h1>{row ? <StatusChip status={row.status} text={STATUS_WORD[row.status as keyof typeof STATUS_WORD]} /> : null}</div>
          <p className="mt-1 text-sm text-text-muted">{facts}</p>
        </div>
        {row ? <NextStep row={row} /> : null}
      </div>
      {c.basis_note ? <Notice tone={c.source_basis === "ILLUSTRATIVE" ? "warn" : "info"}>{c.basis_note}</Notice> : null}
      <div role="tablist" aria-label="Combination" className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => <Link key={t.key} role="tab" aria-selected={tab === t.key} to={`/c/${id}/${t.key}`} title={"slice" in t ? `Rebuilt in ${t.slice}; today's page until then` : undefined} className={cn("whitespace-nowrap border-b-2 px-3 py-2 text-sm", tab === t.key ? "border-primary font-medium text-text" : "border-transparent text-text-muted hover:text-text")}>{t.label}{t.key === "review" && errorCount ? <span className="ml-1.5 rounded bg-danger/12 px-1 text-xs text-text-danger">{errorCount}</span> : null}</Link>)}
      </div>
      <div role="tabpanel" aria-label={TABS.find((t) => t.key === tab)!.label}>
        {tab === "preview" && sp.get("view") === "studio" ? <StudioPreview d={d} id={id!} />
          : tab === "overview" || tab === "forms" || tab === "preview" ? <WorkspaceTab id={id!} tab={tab} label={c.label} show={sp.get("show")} />
          : tab === "sqr" ? <Later slice="S2" what="the questionnaire by person role, with needed-fact coverage"><ConfigurationTab key="sqr" d={d} areas={["questions", "checks"]} /></Later>
          : tab === "documents" ? <Later slice="S3" what="document lines with whose, only if and accepted documents"><ConfigurationTab key="documents" d={d} areas={["documents"]} /></Later>
          : tab === "rules" ? <Later slice="S4" what="every rule in one list: from the library, this combination's lines, checks and problems"><ConfigurationTab key="rules" d={d} areas={["rules", "checks"]} /></Later>
          : tab === "pqr" ? <Notice title="Pre-qualification questions come in slice S4">The PQR tab marks the questions of this combination's SQR that a prospect is asked (P-76, option C: questions only, never an eligibility result). Until then nothing here changes what a prospect sees.</Notice>
          : tab === "sources" ? <SourcesTab d={d} /> : <ReviewTab d={d} />}
      </div>
    </div>
    </TipProvider>
  );
}

/** The studio preview (Sample family facts, every form field's coverage, a Sample filled PDF) stays reachable from
 *  Preview by person until FINISH folds its outputs into the per-person view (board: "Sample filled PDF" per form). */
function StudioPreview({ d, id }: { d: CombinationView; id: string }) {
  return <div className="space-y-3"><p className="text-xs text-text-muted"><Link className="text-text-link underline" to={`/c/${id}/preview`}>Back to Preview by person</Link> · the studio preview: Sample facts, every form field's coverage and a Sample filled PDF.</p><OldPreviewTab d={d} /></div>;
}

/** A tab still showing today's page until its slice rebuilds it: says so in one line, never hides what works. */
function Later({ slice, what, children }: { slice: string; what: string; children: React.ReactNode }) {
  return <div className="space-y-3"><p className="text-xs text-text-muted">Rebuilt in slice {slice} ({what}). Today's editor until then.</p>{children}</div>;
}

/** Overview, Forms and Preview by person: one request per tab view (concept §6). Under the ["combination", id] key, so
 *  every save that refreshes the combination refreshes the open tab too. */
function WorkspaceTab({ id, tab, label, show }: { id: string; tab: "overview" | "forms" | "preview"; label: string; show: string | null }) {
  const pp = usePreviewParams();
  const qs = new URLSearchParams({ tab, ...(tab === "preview" ? Object.fromEntries(Object.entries(pp).filter(([, v]) => v)) : {}) }).toString();
  const w = useApi<WorkspaceView>(["combination", id, "workspace", qs], `/combinations/${id}/workspace?${qs}`, { placeholderData: (prev) => (prev?.tab === tab ? prev : undefined) });
  if (w.isLoading) return <Spinner label={`Loading ${tab === "preview" ? "the preview" : tab}`} />;
  if (w.isError || !w.data) return <ErrorState title="This tab could not be loaded" description={(w.error as Error | null)?.message ?? "No answer from the studio."} action={<button className="text-text-link underline" onClick={() => void w.refetch()}>Try again</button>} />;
  const v = w.data;
  if (v.tab === "overview") return <OverviewTab d={v.view} sum={v.summary} show={show} />;
  if (v.tab === "forms") return <FormsTab id={id} label={label} sum={v.summary} lines={v.lines} />;
  if (v.tab === "preview") return <PreviewTab p={v.preview} empty={v.empty} fetching={w.isFetching} studio={<Link className="text-text-link underline" to={`/c/${id}/preview?view=studio`}>Open the studio preview</Link>} />;
  return null;
}

/** The row's one next step from the server (BR-13, review #1): the same words and the same handler as the Programs
 *  row, so the list and the page never disagree. Nothing is worked out here. */
function NextStep({ row }: { row: CatalogueLeaf }) {
  const nav = useNavigate();
  const [, setSp] = useSearchParams();
  const actorId = useActorId();
  const session = useApi<SessionView>(["session", actorId], "/session");
  const canAuthor = (session.data?.actor?.duties ?? []).includes("author");
  const id = row.combinationId!;
  const step = useNextStep((_leaf, suffix = "") => suffix.startsWith("?") ? setSp(new URLSearchParams(suffix.slice(1)), { replace: true }) : nav(`/c/${id}${suffix}`));
  const a = row.nextAction;
  const mayRun = a && (canAuthor || SHOW_ONLY_STEPS.includes(a.kind));
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3 shadow-sm">
      <div><p className="text-xs font-medium text-text-muted">Next step</p>{a && mayRun ? null : <p className="text-sm font-medium">{a ? a.label : row.status === "READY" ? "Nothing to do: firms can open cases on it" : "Nothing to do right now"}</p>}{a && !mayRun ? <p className="text-xs text-text-muted">A configuration author does this step.</p> : null}</div>
      {a && mayRun ? <StepTip a={a}><Button size="sm" data-next-step={a.kind} onClick={() => void step.run(row, a)}><StepLabel a={a} /> <ArrowRight /></Button></StepTip> : null}
      {step.dialog}
    </div>
  );
}

export function ModePill({ mode }: { mode: string }) {
  const m: Record<string, [string, string, string]> = { LIVE: ["ai", "Live AI call", "A new call through the guarded route"], REPLAY: ["neutral", "Replay of a saved run", "Reuses a saved real run; no model call"], STUB: ["neutral", "Stub pass", "Path test, no AI content"], LOCAL: ["neutral", "On this computer", "No AI"] };
  const [tone, label, title] = m[mode] ?? ["neutral", mode, mode];
  return <Pill tone={tone} title={title}>{label}</Pill>;
}
export function StatusPill({ status }: { status: string }) {
  const tone = status === "COMPLETED" || status === "APPLIED" ? "ok" : status === "RUNNING" || status === "QUEUED" ? "info" : status === "CANCELLED" ? "neutral" : status === "BLOCKED" ? "warn" : status === "FAILED" ? "danger" : "neutral";
  const label: Record<string, string> = { COMPLETED: "Completed", APPLIED: "Applied to draft", RUNNING: "Running", QUEUED: "Queued", BLOCKED: "Blocked", FAILED: "Failed", CANCELLED: "Cancelled" };
  return <Pill tone={tone}>{status === "RUNNING" ? <span className="size-2 animate-pulse rounded-full bg-current" /> : null}{label[status] ?? status}</Pill>;
}
export function useGo() { return useNavigate(); }
