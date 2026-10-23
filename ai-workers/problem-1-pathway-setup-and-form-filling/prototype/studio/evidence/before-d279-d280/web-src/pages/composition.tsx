import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, ChevronRight, Pencil } from "lucide-react";
import { api, useAction, useApi } from "@/lib/api";
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

export function CompositionPage() {
  const { id, tab = "overview" } = useParams();
  const o = useApi<any>(["composition", id], `/compositions/${id}`, { refetchInterval: (q: any) => (q.state.data?.jobs?.some((j: any) => j.status === "RUNNING") ? 3000 : false) });
  if (o.isLoading) return <Spinner label="Loading composition" />;
  if (o.isError) return <ErrorState title="This composition could not be opened" description={(o.error as Error).message} action={<Link className="text-text-link underline" to="/">Back to programs</Link>} />;
  const d = o.data;
  const c = d.composition;
  const last = d.releases[0];
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-text-muted"><Link to="/" className="hover:underline">Programs</Link><ChevronRight className="size-3" />{d.pathway ? <><span>{d.pathway.label}</span><ChevronRight className="size-3" /></> : null}<span>{d.program.label}</span></nav>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{c.label}</h1>
          <p className="mt-1 text-sm text-text-muted">{roleSummary(c.participants)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill tone={c.source_basis === "ILLUSTRATIVE" ? "warn" : "info"}>{c.source_basis === "ILLUSTRATIVE" ? "Illustrative" : "Source-backed"}</Pill>
            {last ? <Pill tone="ok" title={last.sha256}>Released v{last.version} · {last.sha256.slice(0, 8)}</Pill> : <Pill>Not released yet</Pill>}
            {d.draft.changes.length ? <Pill tone="warn">{d.draft.changes.length} draft change{d.draft.changes.length === 1 ? "" : "s"}</Pill> : last ? <Pill tone="ok">Draft matches the release</Pill> : null}
            {d.submission?.status === "SUBMITTED" ? <Pill tone={d.submission.stale ? "danger" : "warn"}>{d.submission.stale ? "Submitted, then changed" : "In review"}</Pill> : null}
          </div>
        </div>
        <NextAction d={d} />
      </div>
      {c.basis_note ? <Notice tone={c.source_basis === "ILLUSTRATIVE" ? "warn" : "info"}>{c.basis_note}</Notice> : null}
      <div role="tablist" aria-label="Composition" className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map(([k, l]) => <Link key={k} role="tab" aria-selected={tab === k} to={`/c/${id}/${k}`} className={cn("whitespace-nowrap border-b-2 px-3 py-2 text-sm", tab === k ? "border-primary font-medium text-text" : "border-transparent text-text-muted hover:text-text")}>{l}{k === "review" && d.draft.problems.filter((p: any) => p.level === "error").length ? <span className="ml-1.5 rounded bg-danger/12 px-1 text-[11px] text-text-danger">{d.draft.problems.filter((p: any) => p.level === "error").length}</span> : null}</Link>)}
      </div>
      {tab === "overview" ? <Overview d={d} /> : tab === "sources" ? <SourcesTab d={d} /> : tab === "configuration" ? <ConfigurationTab d={d} /> : tab === "preview" ? <PreviewTab d={d} /> : <ReviewTab d={d} />}
    </div>
  );
}

function NextAction({ d }: { d: any }) {
  const id = d.composition.id;
  const running = d.jobs.find((j: any) => j.status === "RUNNING");
  const ready = d.jobs.find((j: any) => j.kind === "field_map" && j.status === "COMPLETED" && j.mode !== "STUB");
  let text = "", to = "", label = "";
  if (running) { text = `${running.kind === "field_map" ? "AI draft" : "Reading"} in progress`; to = `/c/${id}/sources`; label = "Watch progress"; }
  else if (ready) { text = "An AI draft is waiting for review"; to = `/c/${id}/jobs/${ready.id}`; label = "Review AI proposals"; }
  else if (!d.attachments.length) { text = "Attach the official forms and guides"; to = `/c/${id}/sources`; label = "Add sources"; }
  else if (!d.draft.counts.forms) { text = "Add a form to the configuration"; to = `/c/${id}/sources`; label = "Sources and forms"; }
  else if (d.submission?.status === "SUBMITTED" && !d.submission.stale) { text = "Waiting for sign-off and approval"; to = `/c/${id}/review`; label = "Open review"; }
  else if (d.draft.changes.length) { text = "Draft changes are ready to check and submit"; to = `/c/${id}/review`; label = "Review and release"; }
  else { text = "Configuration released; preview what it asks"; to = `/c/${id}/preview`; label = "Preview"; }
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3 shadow-sm">
      <div><p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Next step</p><p className="text-sm font-medium">{text}</p></div>
      <Button asChild size="sm"><Link to={to}>{label} <ArrowRight /></Link></Button>
    </div>
  );
}

function Overview({ d }: { d: any }) {
  const [edit, setEdit] = React.useState(false);
  const k = d.draft.counts;
  const errors = d.draft.problems.filter((p: any) => p.level === "error").length, warnings = d.draft.problems.length - errors;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Forms" value={k.forms} sub={`${k.map_boxes} mapped boxes`} />
        <Stat label="Questions" value={k.placements} sub={`${k.sections} sections · ${k.fields} fields`} />
        <Stat label="Documents" value={k.document_requirements} sub="base and conditional requirements" />
        <Stat label="Rules and checks" value={`${k.rules} · ${k.checks}`} sub={errors ? `${errors} problems to fix` : warnings ? `${warnings} warnings` : "no problems"} tone={errors ? "danger" : undefined} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
          <div className="flex items-center justify-between"><h2 className="font-semibold">People in this composition</h2><Button size="sm" variant="ghost" onClick={() => setEdit(true)}><Pencil /> Edit</Button></div>
          <Table className="mt-3" dense head={["Person", "Number", "Files own application"]}>{d.composition.participants.map((p: any, i: number) => <tr key={i}><td>{p.label}</td><td>{p.min === p.max ? p.min : `${p.min} to ${p.max}`}</td><td>{p.applies === false ? "No" : "Yes"}</td></tr>)}</Table>
          {edit ? <EditPeople d={d} onClose={() => setEdit(false)} /> : null}
        </section>
        <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
          <h2 className="font-semibold">Released versions</h2>
          {!d.releases.length ? <p className="mt-2 text-sm text-text-muted">Nothing released yet. Case work only ever uses a released version; drafts are previews.</p> : (
            <Table className="mt-3" dense head={["Version", "Released", "Approved by", "Basis"]}>{d.releases.map((r: any) => <tr key={r.id}><td><span className="font-medium">v{r.version}</span> <span className="mono text-text-muted">{r.sha256.slice(0, 10)}</span>{r.status === "SUPERSEDED" ? <Pill className="ml-1">superseded</Pill> : null}</td><td>{new Date(r.released_at).toLocaleString()}</td><td>{r.approver}</td><td className="max-w-72 text-xs text-text-muted">{r.basis}</td></tr>)}</Table>
          )}
        </section>
      </div>
      <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
        <h2 className="font-semibold">Recent steps</h2>
        {!d.jobs.length ? <p className="mt-2 text-sm text-text-muted">No reading or AI steps yet.</p> : (
          <Table className="mt-3" dense head={["Step", "Mode", "Status", "Result", "Started"]}>{d.jobs.slice(0, 8).map((j: any) => <tr key={j.id}><td>{j.kind === "field_map" ? "AI field-map draft" : "Read form"}</td><td><ModePill mode={j.mode} /></td><td><StatusPill status={j.status} /></td><td className="max-w-xl text-xs text-text-muted">{j.message}</td><td className="whitespace-nowrap text-xs">{new Date(j.startedAt).toLocaleTimeString()}</td></tr>)}</Table>
        )}
      </section>
    </div>
  );
}

function EditPeople({ d, onClose }: { d: any; onClose: () => void }) {
  const [v, setV] = React.useState<any[]>(d.composition.participants);
  const save = useAction(() => api(`/compositions/${d.composition.id}`, { method: "PATCH", json: { participants: v } }), { success: "People updated", invalidate: [["composition", d.composition.id], ["preview"]], onDone: onClose });
  return <Dialog wide open onOpenChange={(o) => !o && onClose()} title="People in this composition" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.mutate(undefined)} busy={save.isPending}>Save</Button></>}><ParticipantsEditor value={v} onChange={setV} /></Dialog>;
}

export function ModePill({ mode }: { mode: string }) {
  const m: Record<string, [string, string, string]> = { LIVE: ["ai", "Live AI call", "A new call through the guarded route"], REPLAY: ["neutral", "Replay of a saved run", "Reuses a saved real run; no model call"], STUB: ["neutral", "Stub pass", "Path test, no AI content"], LOCAL: ["neutral", "On this computer", "No AI"] };
  const [tone, label, title] = m[mode] ?? ["neutral", mode, mode];
  return <Pill tone={tone} title={title}>{label}</Pill>;
}
export function StatusPill({ status }: { status: string }) {
  const tone = status === "COMPLETED" || status === "APPLIED" ? "ok" : status === "RUNNING" ? "info" : status === "BLOCKED" ? "warn" : status === "FAILED" ? "danger" : "neutral";
  const label: Record<string, string> = { COMPLETED: "Completed", APPLIED: "Applied to draft", RUNNING: "Running", BLOCKED: "Blocked", FAILED: "Failed" };
  return <Pill tone={tone}>{status === "RUNNING" ? <span className="size-2 animate-pulse rounded-full bg-current" /> : null}{label[status] ?? status}</Pill>;
}
export function useGo() { return useNavigate(); }
