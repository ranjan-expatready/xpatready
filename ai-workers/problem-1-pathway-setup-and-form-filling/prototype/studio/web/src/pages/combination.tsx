import * as React from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { type CatalogueLeaf, type CombinationSummary, type CombinationView, type SessionView } from "../../../contracts/programs";
import { tabOf, TABS, type WorkspaceView } from "../../../contracts/workspace";
import { tabCounts, type BadgeTab } from "../../../contracts/setup-checklist";
import { ArrowRight, ChevronRight } from "lucide-react";
import { CATALOGUE_URL_KEY, STATUS_WORD } from "@/pages/programs";
import { SHOW_ONLY_STEPS, StepLabel, StepTip, useNextStep } from "@/components/next-step";
import { StatusChip, TipProvider } from "@/components/status";
import { useActorId, useApi } from "@/lib/api";
import { Button, Notice, Pill } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { peopleWords } from "@/lib/people";
import { ErrorState } from "@/components/ui/error-state";
import { cn } from "@/lib/utils";
import { PreviewTab as StudioPreview } from "@/pages/preview";
import { ReviewTab } from "@/pages/review";
import { OverviewTab } from "@/pages/workspace/overview";
import { FormsTab } from "@/pages/workspace/forms";
import { BeforeForms } from "@/components/before-forms";
import { QuestionnairesTab } from "@/pages/workspace/questionnaires";
import { DocumentsTab } from "@/pages/workspace/documents";
import { PreviewTab, usePreviewParams } from "@/pages/workspace/preview";
import { LEVEL_TEXT } from "@/components/levels";

/** Where it sits, read-only here (P-125 (3)), in the level colours of the shared Trail (S3 m6). */
const PLACE_TEXT: Record<string, string> = { Pathway: LEVEL_TEXT.pathway, Program: LEVEL_TEXT.program, Category: LEVEL_TEXT.category, "Sub-category": LEVEL_TEXT.subCategory };


/** The combination workspace (S5, W1-08; P-50: a Programs row opens it). Its header carries the full path with every
 *  level a link back to the list filtered to it, the status, the facts in one muted line and the one next step; one row
 *  of tabs in setup order (walkthrough v2 S5). Old addresses (Sources and forms, Configuration) open the tab that now
 *  holds their part. */
/** A field-map job finished while its form is not yet marked DRAFTED (the server's second write is still to come). Only
 *  the form's newest field-map job counts, and only for 30 s after this tab first saw that state: a stub pass (or an
 *  older job) also ends COMPLETED with the form still READ, for good, and must not keep the tab asking (#147 Devin). */
const SETTLE_MS = 30_000;
const settlingSince = new Map<string, number>(); // job id → when this tab first saw it finished with its form READ
const settling = (d: unknown) => {
  const v = d as { jobs?: { id: string; kind: string; status: string; attachmentId?: string | null }[]; attachments?: { id: string; status: string }[] } | undefined;
  const now = Date.now();
  return !!v?.attachments?.some((a) => {
    if (a.status !== "READ") return false;
    const newest = v.jobs?.find((j) => j.kind === "field_map" && j.attachmentId === a.id); // newest first
    if (newest?.status !== "COMPLETED") return false;
    const since = settlingSince.get(newest.id) ?? now; settlingSince.set(newest.id, since);
    return now - since < SETTLE_MS;
  });
};

export function CombinationPage() {
  const { id, tab: asked = "overview" } = useParams();
  const [sp] = useSearchParams();
  const tab = tabOf(asked, sp.get("area"));
  // #143 review (Major): the server marks a field-map job COMPLETED a moment before its form becomes DRAFTED (two
  // writes). A fetch between them saw no running job and stopped, so "Review AI proposals" never appeared until a reload.
  // The tab also keeps asking while a finished field-map job's form still reads READ.
  const o = useApi<CombinationView>(["combination", id], `/combinations/${id}`, { refetchInterval: (q) => (q.state.data?.jobs?.some((j) => j.status === "RUNNING" || j.status === "QUEUED") || settling(q.state.data) ? 3000 : false) });
  const sum = useApi<CombinationSummary>(["combination-summary", id], `/combinations/${id}/summary`, { refetchInterval: (q) => (q.state.data?.row?.aiRunning ? 3000 : false) });
  if (asked !== tab) return <Navigate replace to={`/c/${id}/${tab}`} />;
  if (o.isLoading) return <Spinner label="Loading combination" />;
  if (o.isError || !o.data) return <ErrorState title="This combination could not be opened" description={(o.error as Error | null)?.message ?? "No answer from the studio."} action={<Link className="text-text-link underline" to="/">Back to programs</Link>} />;
  const d = o.data;
  const c = d.combination;
  const last = d.releases[0];
  const row = sum.data?.row;
  const changes = sum.data?.changes ?? 0;
  const errorCount = d.draft.problems.filter((p) => p.level === "error").length;
  // X1 (slice C2): each setup tab says how many open setup items land on it, from the summary's checklist.
  const badges = tabCounts(sum.data?.setup);
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
    d.allowed_locations?.length ? `cases opened ${d.allowed_locations.map((l) => l === "inside_canada" ? "inside Canada" : "outside Canada").join(" or ")}` : null,
    // C1.6 (Screen 03 concept: the facts line names the filing method, before the people): how the application is
    // filed, from its form lines; said only once a form that is actually filed is on it (not a checklist, not a line
    // marked Not needed: review c16 m1).
    sum.data?.forms?.some((f) => !f.document && f.channel !== "NOT_NEEDED") ? `filing: ${sum.data.filing}` : null,
    // QA-77: the same words per person as Who can be on Forms; "; " because a person's words may hold a comma.
    `people: ${peopleWords(c.participants, (p) => p.label, "; ")}`,
    c.source_basis === "ILLUSTRATIVE" ? "Sample" : null, // SC-5: no "source-backed" jargon in the subtitle
  ].filter(Boolean).join(" · ");
  return (
    <TipProvider>
    <div className="mx-auto max-w-7xl space-y-5">
      <nav aria-label="Path" className="flex flex-wrap items-center gap-1 text-sm text-text-muted">
        <Link to={backTo} className="font-medium text-text-link hover:underline">Immigration programs</Link>
        {(d.path ?? []).map((n) => <React.Fragment key={n.key}><ChevronRight className="size-3.5" aria-hidden /><Link to={levelLink(n)} title={`${n.level}: show the list for ${n.label}`} className={cn("hover:underline", PLACE_TEXT[n.level])} data-place={n.level}>{n.label}</Link></React.Fragment>)}
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold">{c.label}</h1>{row ? <StatusChip status={row.status} text={STATUS_WORD[row.status as keyof typeof STATUS_WORD]} /> : null}</div>
          <p className="mt-1 text-sm text-text-muted">{facts}</p>
        </div>
        {row ? <NextStep row={row} /> : null}
      </div>
      {c.basis_note ? <Notice tone={c.source_basis === "ILLUSTRATIVE" ? "warn" : "info"}>{c.basis_note}</Notice> : null}
      <div role="tablist" aria-label="Combination" className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => <Link key={t.key} role="tab" aria-selected={tab === t.key} aria-label={t.key in badges && badges[t.key as BadgeTab] ? `${t.label} ${badges[t.key as BadgeTab]} setup ${badges[t.key as BadgeTab] === 1 ? "item" : "items"} open` : undefined} to={`/c/${id}/${t.key}`} className={cn("whitespace-nowrap border-b-2 px-3 py-2 text-sm", tab === t.key ? "border-primary font-medium text-text" : "border-transparent text-text-muted hover:text-text")}>{t.label}{t.key in badges && badges[t.key as BadgeTab] ? <>{" "}<StepBadge n={badges[t.key as BadgeTab]} /></> : null}{t.key === "review" && errorCount ? <span className="ml-1.5 rounded bg-danger/12 px-1 text-xs text-text-danger">{errorCount}</span> : null}</Link>)}
      </div>
      <div role="tabpanel" aria-label={TABS.find((t) => t.key === tab)!.label}>
        {tab === "overview" ? <OverviewTab d={d} sum={sum.data} show={sp.get("show")} />
          : tab === "documents" ? <DocumentsTab id={c.id} />
          : tab === "review" ? <ReviewTab d={d} />
          : tab === "preview" && sp.get("view") === "studio" ? <div className="space-y-3"><Link className="text-sm text-text-link underline" to={`/c/${id}/preview`}>Back to the preview by person</Link><StudioPreview d={d} /></div>
          : <WorkspaceTab id={c.id} tab={tab} hasRelease={!!last} />}
      </div>
    </div>
    </TipProvider>
  );
}

/** Forms, Questionnaires and Preview: one request per tab view. Under the ["combination", id] key, so every save that
 *  refreshes the combination refreshes the open tab too. */
function WorkspaceTab({ id, tab, hasRelease }: { id: string; tab: "forms" | "questionnaires" | "preview"; hasRelease: boolean }) {
  const pp = usePreviewParams();
  const [sp] = useSearchParams();
  const qs = new URLSearchParams({ tab, ...(tab === "preview" ? Object.fromEntries(Object.entries(pp).filter(([, v]) => v)) : {}), ...(tab === "questionnaires" && sp.get("role") ? { role: sp.get("role")! } : {}) }).toString();
  const w = useApi<WorkspaceView>(["combination", id, "workspace", qs], `/combinations/${id}/workspace?${qs}`, { placeholderData: (prev) => (prev?.tab === tab ? prev : undefined), refetchOnWindowFocus: tab === "forms",
    // C2.12 slice 3 (review ed2516cf Major A): while a form's step runs (an AI draft), the chips follow it as the rail does.
    refetchInterval: (q) => (q.state.data?.tab === "forms" && Object.values(q.state.data.progress ?? {}).some((c) => c.state === "running") ? 4000 : false) }); // m6: the step chips follow work done elsewhere
  if (w.isLoading) return <Spinner label={`Loading ${tab}`} />;
  if (w.isError || !w.data) return <ErrorState title="This tab could not be loaded" description={(w.error as Error | null)?.message ?? "No answer from the studio."} action={<button className="text-text-link underline" onClick={() => void w.refetch()}>Try again</button>} />;
  const v = w.data;
  if (v.tab === "forms") return <div className="space-y-6"><BeforeForms id={id} people={v.people} /><FormsTab id={id} lines={v.lines} filing={v.filing} filingDetail={v.filingDetail} account={v.account ?? null} accountKey={v.accountKey ?? null} problems={v.problems} removed={v.removed} fromLibrary={v.fromLibrary} lastChange={v.lastChange} progress={v.progress} /></div>;
  if (v.tab === "questionnaires") return <QuestionnairesTab id={id} people={v.people} questionnaire={v.questionnaire} available={v.available} />;
  if (v.tab === "preview") return <PreviewTab id={id} p={v.preview} empty={v.empty} fetching={w.isFetching} hasRelease={hasRelease} />;
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

/** X1 (slice C2, board v3 "Forms 5"): the number of open setup items on a tab; nothing when none. Read aloud as words
 *  through the tab's aria-label. */
function StepBadge({ n }: { n: number }) {
  if (!n) return null;
  // The words are the tab's accessible name (aria-label "Forms 2 setup items open", which starts with the visible text
  // "Forms 2", WCAG 2.5.3), so the tab's visible text stays "Forms 2".
  return <span aria-hidden className="ml-1 rounded-full bg-warn/15 px-1.5 text-xs text-text-warn" data-step-badge={n}>{n}</span>;
}
