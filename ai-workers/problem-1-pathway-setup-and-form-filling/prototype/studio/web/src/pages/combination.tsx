import * as React from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { type CatalogueLeaf, type CombinationSummary, type CombinationView, type NextAction } from "../../../contracts/programs";
import { tabOf, TABS, type WorkspaceView } from "../../../contracts/workspace";
import { TestsTab } from "@/components/answer-keys";
import { nextStepHref, reviewFixCount, STEP_LABEL, tabCounts, tabSteps, type BadgeTab, type ItemKind } from "../../../contracts/setup-checklist";
import { ArrowRight, ChevronRight, Sparkles } from "lucide-react";
import { CATALOGUE_URL_KEY, STATUS_WORD } from "@/pages/programs";
import { StepTip, useNextStep } from "@/components/next-step";
import { StatusChip, TipProvider } from "@/components/status";
import { useApi } from "@/lib/api";
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
import { plural, toDoWords, toFixWords } from "../../../contracts/counts";
import { LIVE_NEXT, STATE_WORDS } from "../../../contracts/status-words";

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
  // QA-184: the Review and release tab counts the problems its own step lists on Overview (one number for one thing).
  const errorCount = reviewFixCount(sum.data?.setup);
  // X1 (slice C2): each setup tab says how many open setup items land on it, from the summary's checklist.
  const retired = !!sum.data?.row?.retired;
  const badges = tabCounts(retired ? null : sum.data?.setup), steps = tabSteps(retired ? null : sum.data?.setup);
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
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold">{c.label}</h1>{/* UX-A part 3 (break M1): a retired combination says Retired, with no next step and no badges (one word per state). */}{row?.retired ? <span data-status="RETIRED"><Pill tone="neutral" title="Retired at a release: hidden from new setups; open cases and earlier releases keep it.">{STATE_WORDS.RETIRED}</Pill></span> : row ? <StatusChip status={row.status} text={STATUS_WORD[row.status as keyof typeof STATUS_WORD]} /> : null}{last?.demo ? <span data-demo-release><Pill tone="warn" title="Sample content: a demo release, never counted as a real publish.">Demo release</Pill></span> : null}</div>
          <p className="mt-1 text-sm text-text-muted">{facts}</p>
        </div>
        {row && !row.retired ? <NextStep row={row} setup={sum.data?.setup ?? null} /> : null}
      </div>
      {c.basis_note ? <Notice tone={c.source_basis === "ILLUSTRATIVE" ? "warn" : "info"}>{c.basis_note}</Notice> : null}
      {/* K13 break M1: the tabs wrap instead of scrolling, so no tab or badge is ever cut off at any width or zoom. */}
      <div role="tablist" aria-label="Combination" className="flex flex-wrap gap-x-1 border-b border-border">
        {TABS.map((t) => {
          // QA-120: one badge style for every count on a tab, a space before it. UX-A part 1 (contracts/counts.ts): the
          // badge says what it counts in its own text ("Forms 4 to do", "Review and release 1 to fix"), never a bare
          // number read as forms; the tab's name is exactly its text (WCAG 2.5.3) and the tip says it in full.
          const open = t.key in badges ? badges[t.key as BadgeTab] : 0, problems = t.key === "review" && !retired ? errorCount : 0;
          const name = tabName(t.label, open, problems);
          // Review m1: the tip names the steps the items belong to, and is the tab's description, so a keyboard or screen
          // reader user hears it too (a title alone is not reachable).
          const tip = name !== t.label ? tabTip(t.label, open, problems, (steps[t.key as BadgeTab] ?? []).map((k) => STEP_LABEL[k])) : undefined;
          return <React.Fragment key={t.key}><Link role="tab" aria-selected={tab === t.key} aria-label={name} title={tip} aria-describedby={tip ? `tab-tip-${t.key}` : undefined} data-tab={t.key} to={`/c/${id}/${t.key}`} className={cn("whitespace-nowrap border-b-2 px-3 py-2 text-sm", tab === t.key ? "border-primary font-medium text-text" : "border-transparent text-text-muted hover:text-text")}>{t.label}{open ? <>{" "}<StepBadge n={open} /></> : null}{problems ? <>{" "}<StepBadge n={problems} tone="danger" /></> : null}</Link>{tip ? <span id={`tab-tip-${t.key}`} hidden>{tip}</span> : null}</React.Fragment>;
        })}
      </div>
      <div role="tabpanel" aria-label={TABS.find((t) => t.key === tab)!.label}>
        {tab === "overview" ? <OverviewTab d={d} sum={sum.data} show={sp.get("show")} failed={sum.isError} onRetry={() => void sum.refetch()} />
          : tab === "documents" ? <DocumentsTab id={c.id} />
          : tab === "review" ? <ReviewTab d={d} changesCount={sum.data ? changes : undefined} countFailed={sum.isError} onRetryCount={() => void sum.refetch()} />
          : tab === "tests" ? <TestsTab id={c.id} />
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
  if (v.tab === "forms") return <div className="space-y-6"><BeforeForms id={id} people={v.people} /><FormsTab id={id} lines={v.lines} filing={v.filing} filingDetail={v.filingDetail} account={v.account ?? null} accountKey={v.accountKey ?? null} problems={v.problems} removed={v.removed} removedEver={v.removedEver} fromLibrary={v.fromLibrary} lastChange={v.lastChange} progress={v.progress} /></div>;
  if (v.tab === "questionnaires") return <QuestionnairesTab id={id} people={v.people} questionnaire={v.questionnaire} available={v.available} />;
  if (v.tab === "preview") return <PreviewTab id={id} p={v.preview} empty={v.empty} fetching={w.isFetching} hasRelease={hasRelease} />;
  return null;
}

/** QA-119 (P-157, P-161 (1)): the header's one next step is the setup checklist's next item, the same item the Overview
 *  strip marks ● Next and the tab badges count, in the same words. It is a button only when the item is this person's to
 *  do (the viewer overlay's `filled`); otherwise it says who it waits for. Where the server's catalogue step does that
 *  same item (Map forms = Draft with AI, Add forms found = add from the library, Find forms, View AI progress), the button
 *  runs it as the Programs list does; any other item opens where it is done (`nextStepHref`: its tab when the tab has no
 *  landing place for it yet). No checklist item (Live, nothing open; retired): nothing to do. */
const PAIRED: Partial<Record<ItemKind, NextAction["kind"]>> = { map_forms: "draft_ai", add_forms_found: "add_from_library", find_forms: "add_forms", view_ai: "view_progress" };
const TAB_WORD: Record<string, string> = { forms: "Forms", documents: "Documents", questionnaires: "Smart questionnaire (SQR)", review: "Review and release" };
function NextStep({ row, setup }: { row: CatalogueLeaf; setup: CombinationSummary["setup"] }) {
  const nav = useNavigate();
  const [, setSp] = useSearchParams();
  const id = row.combinationId!;
  const step = useNextStep((_leaf, suffix = "") => suffix.startsWith("?") ? setSp(new URLSearchParams(suffix.slice(1)), { replace: true }) : nav(`/c/${id}${suffix}`));
  const next = setup?.next ?? null;
  const live = row.status === "READY";
  const viewer = setup && "viewer" in setup ? setup.viewer : null;
  const stepTab = next ? setup!.steps.find((s) => s.key === next.step)?.tab ?? "forms" : "forms";
  const paired = next && row.nextAction && PAIRED[next.item.kind] === row.nextAction.kind ? row.nextAction : null;
  // View AI progress is anyone's to follow; every other item is a button only for the person whose duty and tier it is.
  const mine = !!next && (next.item.kind === "view_ai" || !!viewer?.filled);
  const href = next ? nextStepHref(id, next, stepTab) : "";
  const ai = next?.item.kind === "map_forms" || next?.item.kind === "view_ai";
  const label = next ? <>{ai ? <Sparkles className="size-3.5 shrink-0 text-[#6d28d9] dark:text-[#c4b5fd]" aria-label="AI step:" /> : null}{next.item.text}</> : null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3 shadow-sm" data-header-next={next ? next.item.focus : ""}>
      <div>
        {/* UX-A part 3: a Live combination's open items are for its next release; firms keep the released one meanwhile. */}
        <p className="text-xs font-medium text-text-muted" data-next-live={live && next ? "" : undefined}>Next step{live && next ? ` ${LIVE_NEXT}` : ""}{next ? ` · ${STEP_LABEL[next.step]}` : ""}</p>
        {!next ? <p className="text-sm font-medium">{row.status === "READY" ? "Nothing to do: firms can open cases on it" : "Nothing to do right now"}</p>
          : !mine ? <><p className="text-sm font-medium" data-next-waiting>{viewer?.nextLine ?? next.line}</p><Link className="rounded-sm text-xs text-text-link underline outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1" to={href}>See it on {TAB_WORD[href.split("?")[0].split("/")[3] ?? ""] ?? "its page"}</Link></> : null}
      </div>
      {next && mine ? (paired
        ? <StepTip a={paired}><Button size="sm" data-next-step={next.item.kind} onClick={() => void step.run(row, paired)}>{label} <ArrowRight /></Button></StepTip>
        : <Button size="sm" asChild><Link to={href} data-next-step={next.item.kind}>{label} <ArrowRight /></Link></Button>) : null}
      {step.dialog}
    </div>
  );
}

export function ModePill({ mode }: { mode: string }) {
  const m: Record<string, [string, string, string]> = { LIVE: ["ai", "Live", "A new call through the guarded route"], REPLAY: ["neutral", "Saved", "Reuses a saved real run; no model call"], STUB: ["neutral", "Stub pass", "Path test, no AI content"], LOCAL: ["neutral", "Rules only, no AI", "Rules ran on this server; no AI call"] };
  const [tone, label, title] = m[mode] ?? ["neutral", mode.toLowerCase().replace(/_/g, " "), "How this step ran"]; // QA-75 (break m5): never a raw code
  return <Pill tone={tone} title={title}>{label}</Pill>;
}
export function StatusPill({ status }: { status: string }) {
  const tone = status === "COMPLETED" || status === "APPLIED" ? "ok" : status === "RUNNING" || status === "QUEUED" ? "info" : status === "CANCELLED" ? "neutral" : status === "BLOCKED" || status === "NEEDS_PERSON" ? "warn" : status === "FAILED" ? "danger" : "neutral";
  // QA-75: every status a step can end in has words; no code reaches the screen.
  const label: Record<string, string> = { COMPLETED: "Completed", APPLIED: "Applied to draft", RUNNING: "Running", QUEUED: "Queued", BLOCKED: "Blocked", FAILED: "Failed", CANCELLED: "Cancelled", NEEDS_PERSON: "Waiting for you", WAITING: "Waiting", SKIPPED: "Not needed", PARTIAL: "Done with problems" };
  if (!(status in label)) return <Pill tone="neutral">{status ? status.toLowerCase().replace(/_/g, " ") : "No status"}</Pill>;
  return <Pill tone={tone}>{status === "RUNNING" ? <span className="size-2 animate-pulse rounded-full bg-current" /> : null}{label[status] ?? status}</Pill>;
}
export function useGo() { return useNavigate(); }

/** X1 (slice C2, board v3 "Forms 5"): the number of open setup items on a tab (warn), or of problems to fix (danger);
 *  nothing when none. UX-A part 1: it says what it counts ("4 to do", "1 to fix"). Read aloud through the tab's
 *  aria-label (tabName, the same words), so the badge itself is hidden from it. */
function StepBadge({ n, tone = "warn" }: { n: number; tone?: "warn" | "danger" }) {
  if (!n) return null;
  return <span aria-hidden className={cn("whitespace-nowrap rounded-full px-1.5 text-xs", tone === "danger" ? "bg-danger/12 text-text-danger" : "bg-warn/15 text-text-warn")} data-step-badge={n} data-badge-tone={tone}>{tone === "danger" ? toFixWords(n) : toDoWords(n)}</span>;
}
/** QA-120: a tab's name, exactly its visible text: "Forms 4 to do", "Review and release 1 to fix". */
export function tabName(label: string, open: number, problems: number) {
  const parts = [open ? toDoWords(open) : "", problems ? toFixWords(problems) : ""].filter(Boolean);
  return parts.length ? `${label} ${parts.join(" ")}` : label;
}
/** The tip: what the badge counts, in full, and the steps the open items belong to. */
export function tabTip(label: string, open: number, problems: number, steps: string[] = []) {
  const parts = [open ? `${plural(open, "setup item")} open on ${label}${steps.length ? ` (${steps.join(", ")})` : ""}` : "", problems ? `${plural(problems, "problem")} to fix before release` : ""].filter(Boolean);
  return parts.join("; ");
}
