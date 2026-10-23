import * as React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { sharedStep, type CatalogueLeaf, type CombinationSummary, type CombinationView, type HeldFile, type ParticipantLine, type SessionView } from "../../../contracts/programs";
import { ArrowRight, ChevronRight, Globe, Pencil, Plus } from "lucide-react";
import { CATALOGUE_URL_KEY, STATUS_WORD } from "@/pages/programs";
import { AddFormPanel } from "@/components/forms";
import { AddOnlineFormPanel, ChannelCell, FilingLine, OnlineForms, UseDefaults } from "@/components/channels";
import { SHOW_ONLY_STEPS, StepLabel, StepTip, useNextStep } from "@/components/next-step";
import { StatusChip, TipProvider } from "@/components/status";
import { api, useActorId, useAction, useApi } from "@/lib/api";
import { Button, Dialog, Notice, Pill, Stat, Table } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { cn } from "@/lib/utils";
import { ParticipantsEditor, roleSummary } from "@/components/participants";
import { SourcesTab } from "@/pages/sources";
import { ConfigurationTab } from "@/pages/configuration";
import { PreviewTab } from "@/pages/preview";
import { ReviewTab } from "@/pages/review";

const TABS = [["overview", "Overview"], ["sources", "Sources and forms"], ["configuration", "Configuration"], ["preview", "Preview"], ["review", "Review and release"]] as const;

/** The combination page (P-50: a Programs row opens it). Its header carries the full path with every level a link
 *  back to the list filtered to it, the status and the facts in one muted line; Overview first. Until Screen 03
 *  redesigns it, the tabs below are the existing configuration workspace (minimal clean-up, early look item 7). */
export function CombinationPage() {
  const { id, tab = "overview" } = useParams();
  const [sp] = useSearchParams();
  const o = useApi<CombinationView>(["combination", id], `/combinations/${id}`, { refetchInterval: (q) => (q.state.data?.jobs?.some((j) => j.status === "RUNNING" || j.status === "QUEUED") ? 3000 : false) });
  const sum = useApi<CombinationSummary>(["combination-summary", id], `/combinations/${id}/summary`, { refetchInterval: (q) => (q.state.data?.row?.aiRunning ? 3000 : false) });
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
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold">{c.label}</h1>{row ? <StatusChip status={row.status} text={STATUS_WORD[row.status as keyof typeof STATUS_WORD]} /> : null}</div>
          <p className="mt-1 text-sm text-text-muted">{facts}</p>
        </div>
        {row ? <NextStep row={row} /> : null}
      </div>
      {c.basis_note ? <Notice tone={c.source_basis === "ILLUSTRATIVE" ? "warn" : "info"}>{c.basis_note}</Notice> : null}
      <div role="tablist" aria-label="Combination" className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map(([k, l]) => <Link key={k} role="tab" aria-selected={tab === k} to={`/c/${id}/${k}`} className={cn("whitespace-nowrap border-b-2 px-3 py-2 text-sm", tab === k ? "border-primary font-medium text-text" : "border-transparent text-text-muted hover:text-text")}>{l}{k === "review" && errorCount ? <span className="ml-1.5 rounded bg-danger/12 px-1 text-xs text-text-danger">{errorCount}</span> : null}</Link>)}
      </div>
      {tab === "overview" ? <Overview d={d} sum={sum.data} show={sp.get("show")} /> : tab === "sources" ? <SourcesTab d={d} /> : tab === "configuration" ? <ConfigurationTab d={d} /> : tab === "preview" ? <PreviewTab d={d} /> : <ReviewTab d={d} />}
    </div>
    </TipProvider>
  );
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

function Overview({ d, sum, show }: { d: CombinationView; sum: CombinationSummary | undefined; show: string | null }) {
  const [edit, setEdit] = React.useState(false);
  const [adding, setAdding] = React.useState(false), [addingOnline, setAddingOnline] = React.useState(false);
  const actorId = useActorId();
  const session = useApi<SessionView>(["session", actorId], "/session");
  const canAuthor = (session.data?.actor?.duties ?? []).includes("author");
  const k = d.draft.counts;
  const errors = d.draft.problems.filter((p) => p.level === "error").length, warnings = d.draft.problems.length - errors;
  const row = sum?.row;
  const missing = row && row.status !== "READY" ? row.missing : [];
  const held: HeldFile[] = sum?.held ?? [];
  const lineCodes = new Set((sum?.forms ?? []).map((f) => f.code));
  const pending = (row?.forms ?? []).filter((f) => !f.document && !lineCodes.has(f.code));
  const missingRef = React.useRef<HTMLElement>(null), heldRef = React.useRef<HTMLElement>(null);
  React.useEffect(() => { const el = show === "missing" ? missingRef.current : show === "held" ? heldRef.current : null; el?.scrollIntoView({ block: "center" }); el?.focus({ preventScroll: true }); }, [show, !!sum]);
  return (
    <div className="space-y-5">
      {missing.length ? (
        <section ref={missingRef} tabIndex={-1} aria-labelledby="ov-missing" className={cn("rounded-xl border border-danger/30 bg-danger/5 p-4 outline-none", show === "missing" && "ring-[3px] ring-danger/30")}>
          <h2 id="ov-missing" className="font-semibold">{row?.release ? `Why firms cannot use it (${missing.length})` : `Missing before firms can use it (${missing.length})`}</h2>
          <ul className="mt-2 space-y-1 text-sm">{missing.map((m, i) => <li key={i} className="flex gap-2"><span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger" />{m.text}</li>)}</ul>
          {sharedStep(missing) ? <p className="mt-2 text-sm" data-shared-step>Next step for all of these: <b className="font-semibold">{sharedStep(missing)}</b>.</p> : null}
        </section>
      ) : null}
      {held.length ? (
        <section ref={heldRef} tabIndex={-1} aria-labelledby="ov-held" className={cn("rounded-xl border border-warn/40 bg-warn/10 p-4 outline-none", show === "held" && "ring-[3px] ring-warn/40")}>
          <h2 id="ov-held" className="font-semibold">Held for a person ({held.length})</h2>
          <ul className="mt-2 space-y-1.5 text-sm">{held.map((h) => <li key={h.id}><b className="font-semibold">{h.edition ?? h.code ?? h.file}</b> · {HELD_WORD[h.outcome ?? ""] ?? "Held for a person"} <span className="text-text-muted">({h.reason}; file {h.file})</span></li>)}</ul>
          <p className="mt-2 text-xs text-text-muted">Held files are not in the library and not used by this combination. A person reviews what changed before a new edition is used.</p>
        </section>
      ) : null}
      <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm" aria-labelledby="ov-forms">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="ov-forms" className="font-semibold">Forms</h2>{canAuthor ? <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Plus /> Add form</Button><Button size="sm" variant="secondary" onClick={() => setAddingOnline(true)}><Globe /> Add an online form</Button></div> : null}</div>
        {sum ? <FilingLine id={d.combination.id} sum={sum} canAuthor={canAuthor} /> : null}
        {!sum ? <Spinner label="Loading forms" /> : !(sum.forms.length + pending.length) ? <p className="mt-2 text-sm text-text-muted">No forms yet. Add the forms this application files: pick them from the library or upload the IRCC PDFs.</p> : (
          <Table className="mt-3" dense head={["Form", "Edition", "Form fields mapped", "Who and when", "Filed as"]}>
            {sum.forms.map((f) => <tr key={f.code}><td><span className="mono font-medium">{f.code}</span> <span className="text-text-muted">{f.title}</span></td><td>{f.edition ?? (f.document ? "checklist" : f.channel === "ONLINE" ? "no online version mapped" : "none mapped")}</td><td className="tabular-nums">{f.document ? "n/a" : f.boxes}</td><td className="text-xs text-text-muted">{f.who.replace(/_/g, " ")} · {f.when}</td><td><ChannelCell id={d.combination.id} line={f} canAuthor={canAuthor} /></td></tr>)}
            {pending.map((f) => <tr key={f.code}><td><span className="mono font-medium">{f.code}</span></td><td colSpan={4} className="text-xs text-text-muted">{f.inLibrary ? "Attached as a source. Its form fields are already mapped in the library, so it is added without AI." : "Attached as a source. Its form fields are not mapped yet; AI drafts them."}</td></tr>)}
          </Table>
        )}
        {sum ? <UseDefaults id={d.combination.id} sum={sum} canAuthor={canAuthor} /> : null}
        {sum?.channelProblems.length ? <ul className="mt-3 space-y-1 text-sm" aria-label="Filing problems">{sum.channelProblems.map((p, i) => <li key={i} className="flex gap-2"><Pill tone={p.level === "error" ? "danger" : "warn"}>{p.level === "error" ? "Blocks release" : "Warning"}</Pill>{p.message}</li>)}</ul> : null}
        {sum ? <OnlineForms sum={sum} /> : null}
        {adding ? <AddFormPanel combinationId={d.combination.id} label={d.combination.label} have={(sum?.forms ?? []).map((f) => f.code)} onClose={() => setAdding(false)} /> : null}
        {addingOnline && sum ? <AddOnlineFormPanel id={d.combination.id} sum={sum} codes={[...new Set([...sum.forms.filter((f) => !f.document).map((f) => f.code), ...pending.map((f) => f.code)])]} onClose={() => setAddingOnline(false)} /> : null}
      </section>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Forms" value={k.forms} sub={`${k.map_boxes} mapped form fields`} />
        {/* The row's own count (BR-10), so the tile never contradicts the missing list; the words say what it counts. */}
        <Stat label="Questions" value={row?.counts?.questions ?? 0} sub={`questions across all people (each person role counted) · ${k.sections} sections · ${k.fields} fields`} />
        <Stat label="Documents" value={k.document_requirements} sub="base and conditional requirements" />
        {/* Only this combination's own problems (Lead check item 3), each listed on Review and release. */}
        <Stat label="Rules and checks" value={`${k.rules} · ${k.checks}`} tone={errors ? "danger" : undefined}
          sub={errors || warnings ? <Link className="text-text-link underline" to={`/c/${d.combination.id}/review`}>{errors ? `${errors} problem${errors === 1 ? "" : "s"} to fix` : `${warnings} warning${warnings === 1 ? "" : "s"}`}: see them</Link> : "no problems"} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
          <div className="flex items-center justify-between"><h2 className="font-semibold">People in this combination</h2>{canAuthor ? <Button size="sm" variant="ghost" onClick={() => setEdit(true)}><Pencil /> Edit</Button> : null}</div>
          <Table className="mt-3" dense head={["Person", "Number", "Files own application"]}>{d.combination.participants.map((p, i) => <tr key={i}><td>{p.label}</td><td>{p.min === p.max ? p.min : `${p.min} to ${p.max}`}</td><td>{p.applies === false ? "No" : "Yes"}</td></tr>)}</Table>
          {edit ? <EditPeople d={d} onClose={() => setEdit(false)} /> : null}
        </section>
        <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
          <h2 className="font-semibold">Released versions</h2>
          {!d.releases.length ? <p className="mt-2 text-sm text-text-muted">Nothing released yet. Case work only ever uses a released version; drafts are previews.</p> : (
            <Table className="mt-3" dense head={["Release", "Released", "Approved by", "Basis"]}>{d.releases.map((r) => <tr key={r.id}><td><span className="font-medium">Release {r.release}</span>{r.status === "SUPERSEDED" ? <Pill className="ml-1">superseded</Pill> : null}</td><td>{new Date(r.released_at).toLocaleString()}</td><td>{r.approver}</td><td className="max-w-72 text-xs text-text-muted">{r.basis}</td></tr>)}</Table>
          )}
        </section>
      </div>
      <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
        <h2 className="font-semibold">Recent steps</h2>
        {!d.jobs.length ? <p className="mt-2 text-sm text-text-muted">No reading or AI steps yet.</p> : (
          <Table className="mt-3" dense head={["Step", "Mode", "Status", "Result", "Started"]}>{d.jobs.slice(0, 8).map((j) => <tr key={j.id}><td>{j.kind === "field_map" ? "AI field-map draft" : "Read form"}</td><td><ModePill mode={j.mode} /></td><td><StatusPill status={j.status} /></td><td className="max-w-xl text-xs text-text-muted">{j.message}</td><td className="whitespace-nowrap text-xs">{new Date(j.startedAt).toLocaleTimeString()}</td></tr>)}</Table>
        )}
      </section>
    </div>
  );
}

function EditPeople({ d, onClose }: { d: CombinationView; onClose: () => void }) {
  const [v, setV] = React.useState<ParticipantLine[]>(d.combination.participants);
  const save = useAction(() => api(`/combinations/${d.combination.id}`, { method: "PATCH", json: { participants: v } }), { success: "People updated", invalidate: [["combination", d.combination.id], ["preview"]], onDone: onClose });
  return <Dialog wide open onOpenChange={(o) => !o && onClose()} title="People in this combination" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.mutate(undefined)} busy={save.isPending}>Save</Button></>}><ParticipantsEditor value={v} onChange={setV} /></Dialog>;
}

/** Plain words for a held file (review #3, #5). */
const HELD_WORD: Record<string, string> = { new_edition_held: "New edition: impact review needed", older_edition_held: "Older edition: not used", held: "Held for a person" };

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
